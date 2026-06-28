/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { ArrowPath, Point, AnimationState } from "../types";
import {
  checkCollision,
  interpolateSectionPoints,
  getArrowTrack,
} from "../utils/collision";
import { audio } from "../utils/audio";

interface GameBoardProps {
  key?: React.Key;
  gridWidth: number;
  gridHeight: number;
  paths: ArrowPath[];
  levelNumber: number;
  onPathsChange: React.Dispatch<React.SetStateAction<ArrowPath[]>>;
  onSuccess: () => void;
  onLoseLife: () => void;
  onLoseMove: () => void;
  showGridLines: boolean;
  movesLeft: number;
  onArrowClick?: () => void;
}

export function GameBoard({
  gridWidth,
  gridHeight,
  paths,
  levelNumber,
  onPathsChange,
  onSuccess,
  onLoseLife,
  onLoseMove,
  showGridLines,
  movesLeft,
  onArrowClick,
}: GameBoardProps) {
  const [redFlash, setRedFlash] = useState(false);
  const [shakeId, setShakeId] = useState<string | null>(null);

  // Stable static layout coordinates with panning state
  const scale = 1.0;
  const [panState, setPanState] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastPanRef = useRef({ x: 0, y: 0 });
  const dragAccumulatorRef = useRef(0);

  // Local state for paths to animate and redraw 100% locally to prevent heavy parent App re-renders!
  const [localPaths, setLocalPaths] = useState<ArrowPath[]>(paths);
  const localPathsRef = useRef<ArrowPath[]>(paths);

  // Set to keep track of arrow IDs currently animating or launched to prevent double clicks/taps
  const launchingIdsRef = useRef<Set<string>>(new Set());

  // Blocklist of arrow IDs that have completely finished escaping, preventing asynchronous re-addition from old parent props!
  const completedArrowIdsRef = useRef<Set<string>>(new Set());

  // Sync ref with localPaths state
  useEffect(() => {
    localPathsRef.current = localPaths;
  }, [localPaths]);

  const [isIntroPlaying, setIsIntroPlaying] = useState(true);

  // Play intro animation only once when the GameBoard mounts
  useEffect(() => {
    const introTime = paths.length * 55 + 650 + 100;
    const t = setTimeout(() => setIsIntroPlaying(false), introTime);
    return () => clearTimeout(t);
  }, [paths.length]);

  // Sync localPaths with incoming prop changes (like restarts, level changes, hint activations)
  // We preserve active animation statuses of any currently moving arrows to prevent visual rewinds/jittering!
  useEffect(() => {
    // Synchronize active animating IDs with the lock ref to ensure 100% sync
    const activeRunning = paths
      .filter((p) => p.animState.type !== "idle")
      .map((p) => p.id);
    launchingIdsRef.current = new Set(activeRunning);

    setLocalPaths((prevLocal) => {
      // Filter out any paths that have already completed escaping in this GameBoard instance!
      const activeIncoming = paths.filter(
        (incoming) => !completedArrowIdsRef.current.has(incoming.id),
      );

      return activeIncoming.map((incoming) => {
        const existing = prevLocal.find((p) => p.id === incoming.id);
        if (existing && existing.animState.type !== "idle") {
          return {
            ...incoming,
            animState: existing.animState,
            hasFailed: existing.hasFailed,
          };
        }
        return incoming;
      });
    });
  }, [paths]);

  // Animation loop variables
  const svgRef = useRef<SVGSVGElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const onPathsChangeRef = useRef(onPathsChange);

  useEffect(() => {
    onPathsChangeRef.current = onPathsChange;
  }, [onPathsChange]);

  // Decoupled requestAnimationFrame loop that modifies localPaths on every frame
  // and only propagates discrete state changes (like arrow deletion or recoil completion) to parent onPathsChange.
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (time: number) => {
      // Clamp delta to maximum 30ms step size (33 FPS speed) to prevent huge movement leaps/skips on browser lag or freeze!
      const rawDelta = (time - lastTime) / 1000;
      const delta = Math.min(rawDelta, 0.03);
      lastTime = time;

      const currentPaths = localPathsRef.current;
      const hasAnimating = currentPaths.some(
        (p) =>
          p.animState.type === "escaping" || p.animState.type === "bumping",
      );

      if (hasAnimating) {
        let changed = false;
        let anyCompletedEscape = false;
        let anyCompletedBump = false;

        const nextPaths = currentPaths
          .map((path) => {
            if (path.animState.type === "escaping") {
              const nextProg = path.animState.progress + delta * 13.5; // Significantly faster and incredibly snappy escape speed (13.5)

              // Compute length to check if fully exited
              const { totalLength } = getArrowTrack(
                path,
                gridWidth,
                gridHeight,
              );

              if (nextProg > totalLength + 1.5) {
                changed = true;
                anyCompletedEscape = true;
                completedArrowIdsRef.current.add(path.id); // Add to completed blocklist immediately!
                return null;
              } else {
                changed = true;
                return {
                  ...path,
                  animState: {
                    type: "escaping" as const,
                    progress: nextProg,
                    speed: 13.5,
                  },
                };
              }
            } else if (path.animState.type === "bumping") {
              const nextProg = path.animState.progress + delta * 6.5; // Quick snappy recoiling bump (approx 150ms)
              if (nextProg >= 1.0) {
                changed = true;
                anyCompletedBump = true;
                return {
                  ...path,
                  animState: { type: "idle" as const },
                };
              } else {
                changed = true;
                return {
                  ...path,
                  animState: {
                    type: "bumping" as const,
                    progress: nextProg,
                    crashPoint: path.animState.crashPoint,
                    targetPoint: path.animState.targetPoint,
                    crashDistance: (path.animState as any).crashDistance,
                  },
                };
              }
            }
            return path;
          })
          .filter((p): p is ArrowPath => p !== null);

        if (changed) {
          // Update the local state for fluid rendering frame-by-frame
          setLocalPaths(nextPaths);

          // Only notify parent when an arrow disappears (completed escape) or finishes recoil
          if (anyCompletedEscape || anyCompletedBump) {
            onPathsChangeRef.current(nextPaths);
          }
        }
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gridWidth, gridHeight]);

  // SVG Scaling parameters
  const cellSpacing = 52;
  const marginPadding = 40;
  const svgWidth = gridWidth * cellSpacing + marginPadding * 2;
  const svgHeight = gridHeight * cellSpacing + marginPadding * 2;

  // Grid Coordinate to pixel coordinates mapping
  const toScreen = (p: Point): Point => {
    return {
      x: marginPadding + p.x * cellSpacing,
      y: marginPadding + p.y * cellSpacing,
    };
  };

  const triggerArrowLaunch = (arrow: ArrowPath) => {
    if (isIntroPlaying) return;
    if (arrow.animState.type !== "idle") return;

    // Fast-path synchronous lock to prevent overlapping animations from rapid double clicks or event combinations
    if (launchingIdsRef.current.has(arrow.id)) {
      return;
    }
    launchingIdsRef.current.add(arrow.id);

    // Turn off grid if active on click
    if (onArrowClick) {
      onArrowClick();
    }

    // Audio touch click
    audio.playTap();

    const currentArrow = localPathsRef.current.find((p) => p.id === arrow.id);
    if (!currentArrow || currentArrow.animState.type !== "idle") {
      launchingIdsRef.current.delete(arrow.id); // clear if check fails
      return;
    }

    // Perform exact collision check based on freshest state
    const collision = checkCollision(
      currentArrow,
      localPathsRef.current,
      gridWidth,
      gridHeight,
    );

    if (!collision.isBlocked) {
      // Safe Escape!
      audio.playEscape();

      const newEscapingState = (currentPaths: ArrowPath[]): ArrowPath[] =>
        currentPaths.map((p) => {
          if (p.id === arrow.id) {
            return {
              ...p,
              hasFailed: false, // Turn off red failed indicator since it escapes safely!
              animState: {
                type: "escaping" as const,
                progress: 0,
                speed: 13.5,
              },
            };
          }
          return p;
        });

      // Update both local and parent immediately for discrete step
      setLocalPaths(newEscapingState);
      onPathsChange(newEscapingState);
    } else {
      // Bump Crash!
      onLoseMove();
      onLoseLife();
      audio.playCrash();

      // Trigger red flashing vignette overlay & shake Board
      setRedFlash(true);
      setTimeout(() => setRedFlash(false), 240);
      setShakeId(arrow.id);
      setTimeout(() => setShakeId(null), 400);

      const newBumpingState = (currentPaths: ArrowPath[]): ArrowPath[] =>
        currentPaths.map((p) => {
          if (p.id === arrow.id) {
            return {
              ...p,
              hasFailed: true,
              animState: {
                type: "bumping" as const,
                progress: 0,
                crashPoint: collision.crashPoint!,
                targetPoint:
                  currentArrow.points[currentArrow.points.length - 1],
                crashDistance: collision.crashDistance!,
              },
            };
          }
          return p;
        });

      // Update both local and parent immediately for discrete step
      setLocalPaths(newBumpingState);
      onPathsChange(newBumpingState);
    }
  };

  // Logic to draw an arrowhead at a specific location
  const renderArrowHead = (
    tip: Point,
    dir: "U" | "D" | "L" | "R",
    strokeColor: string,
    size = 12.5,
    entryAnimationActive = false,
    index = 0,
  ) => {
    const screenTip = toScreen(tip);

    let pLine = "";
    switch (dir) {
      case "U":
        pLine = `M ${screenTip.x - size} ${screenTip.y + size * 1.2} L ${screenTip.x} ${screenTip.y} L ${screenTip.x + size} ${screenTip.y + size * 1.2}`;
        break;
      case "D":
        pLine = `M ${screenTip.x - size} ${screenTip.y - size * 1.2} L ${screenTip.x} ${screenTip.y} L ${screenTip.x + size} ${screenTip.y - size * 1.2}`;
        break;
      case "L":
        pLine = `M ${screenTip.x + size * 1.2} ${screenTip.y - size} L ${screenTip.x} ${screenTip.y} L ${screenTip.x + size * 1.2} ${screenTip.y + size}`;
        break;
      case "R":
        pLine = `M ${screenTip.x - size * 1.2} ${screenTip.y - size} L ${screenTip.x} ${screenTip.y} L ${screenTip.x - size * 1.2} ${screenTip.y + size}`;
        break;
    }

    const headStyle: React.CSSProperties = entryAnimationActive
      ? {
          opacity: 0,
          transformOrigin: `${screenTip.x}px ${screenTip.y}px`,
          animation:
            "arrowHeadPop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
          animationDelay: `${index * 55 + 450}ms`,
        }
      : {};

    return (
      <g style={headStyle}>
        <path
          d={pLine}
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  };

  // Render an individual arrow path, taking into account offsets for slide and crash animations
  const renderPath = (arrow: ArrowPath, index: number) => {
    const isEscaping = arrow.animState.type === "escaping";
    const isBumping = arrow.animState.type === "bumping";
    const isHint = arrow.isHint;

    let displayPoints = arrow.points;
    let headTip = arrow.points[arrow.points.length - 1];

    if (isEscaping && arrow.animState.type === "escaping") {
      // Calculate smooth sliding snake path coordinates
      displayPoints = interpolateSectionPoints(
        arrow.points,
        arrow.exitDirection,
        gridWidth,
        gridHeight,
        arrow.animState.progress,
      );
      if (displayPoints.length > 0) {
        headTip = displayPoints[displayPoints.length - 1];
      } else {
        return null;
      }
    } else if (isBumping && arrow.animState.type === "bumping") {
      // Recoil along winding tracks keeping elements on track smoothly
      const t = arrow.animState.progress;
      const deviationMult = Math.sin(t * Math.PI); // sine curve 0 -> 1 -> 0

      const crashDistance = arrow.animState.crashDistance ?? 0.5;
      const shiftDist = crashDistance * deviationMult * 0.94;

      displayPoints = interpolateSectionPoints(
        arrow.points,
        arrow.exitDirection,
        gridWidth,
        gridHeight,
        shiftDist,
      );
      if (displayPoints.length > 0) {
        headTip = displayPoints[displayPoints.length - 1];
      }
    }

    // Colors mapping 100% same setup
    let strokeColor = "#132143"; // Beautiful deep navy
    if (isEscaping) {
      strokeColor = "#10b981"; // Vibrant green while escaping (always green when successfully flying!)
    } else if (arrow.hasFailed || shakeId === arrow.id) {
      strokeColor = "#e11d48"; // Bright crimson red on bump, staying red permanently
    } else if (isHint) {
      strokeColor = "#0284c7"; // Deep sky blue for hints
    }

    // Build the SVG path string
    let dStr = "";
    if (displayPoints.length > 0) {
      const pFirst = toScreen(displayPoints[0]);
      dStr += `M ${pFirst.x} ${pFirst.y}`;
      for (let i = 1; i < displayPoints.length; i++) {
        const pt = toScreen(displayPoints[i]);
        dStr += ` L ${pt.x} ${pt.y}`;
      }
    }

    // Outer glow for hints and triggers
    const hintFilter = isHint
      ? "drop-shadow(0 0 8px rgba(0, 186, 255, 0.75))"
      : undefined;

    const entryAnimationActive = isIntroPlaying && !isEscaping && !isBumping;
    const customStyle: React.CSSProperties = {
      filter: hintFilter,
    };

    const totalPixelLength = displayPoints.reduce((acc, pt, i) => {
      if (i === 0) return 0;
      const prev = displayPoints[i - 1];
      const dx = pt.x - prev.x;
      const dy = pt.y - prev.y;
      return acc + Math.sqrt(dx * dx + dy * dy) * cellSpacing;
    }, 0);

    const bodyPathStyle: React.CSSProperties = entryAnimationActive
      ? {
          strokeDasharray: `${totalPixelLength}`,
          strokeDashoffset: `${totalPixelLength}`,
          animation: "arrowStrokeDraw 0.65s cubic-bezier(0.16, 1, 0.3, 1) both",
          animationDelay: `${index * 55}ms`,
        }
      : {};

    return (
      <g
        key={arrow.id}
        style={customStyle}
        className={`cursor-pointer select-none ${
          isEscaping || isBumping ? "" : "transition-colors duration-150"
        }`}
        onPointerDown={(e) => {
          e.stopPropagation(); // Prevent parent SVG from grabbing pointer capture on arrow clicks!
        }}
        onClick={(e) => {
          e.stopPropagation();
          triggerArrowLaunch(arrow);
        }}
      >
        {/* Transparent thick overlay stroke to make touch/click targetting generous & effortless */}
        <path
          d={dStr}
          fill="none"
          stroke="transparent"
          strokeWidth="32"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Glow halo overlay for hints */}
        {isHint && (
          <path
            d={dStr}
            fill="none"
            stroke="rgba(0, 190, 255, 0.35)"
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-pulse"
          />
        )}

        {/* Base thick stroke */}
        <path
          d={dStr}
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={bodyPathStyle}
        />

        {/* Dynamic customized arrowhead wing */}
        {renderArrowHead(
          headTip,
          arrow.exitDirection,
          strokeColor,
          12.5,
          entryAnimationActive,
          index,
        )}
      </g>
    );
  };

  // Generate grey alignment dots on grid cells, matching user screenshots using a high-performance SVG pattern!
  const renderAlignmentDots = () => {
    if (!showGridLines) return null;
    const minX = marginPadding - 15 * cellSpacing;
    const minY = marginPadding - 15 * cellSpacing;
    const w = (gridWidth + 30) * cellSpacing;
    const h = (gridHeight + 30) * cellSpacing;

    return (
      <>
        <defs>
          <pattern
            id="align-dots-pattern"
            width={cellSpacing}
            height={cellSpacing}
            patternUnits="userSpaceOnUse"
            x={marginPadding}
            y={marginPadding}
          >
            <circle cx="0" cy="0" r="2.2" fill="#cbd5e1" opacity="0.8" />
          </pattern>
        </defs>
        <rect
          x={minX}
          y={minY}
          width={w}
          height={h}
          fill="url(#align-dots-pattern)"
          pointerEvents="none"
        />
      </>
    );
  };

  // Render guide tracks indicating escape direction for each active arrow when showGridLines is active (# button toggled ON)
  const renderTrajectoryGuides = () => {
    if (!showGridLines) return null;
    return localPaths.map((arrow) => {
      // Don't draw guides for completed/escaping arrows if they're almost gone
      if (arrow.animState.type === "escaping") return null;

      const headPoint = arrow.points[arrow.points.length - 1];
      const screenHead = toScreen(headPoint);
      let endX = screenHead.x;
      let endY = screenHead.y;

      const collision = checkCollision(
        arrow,
        localPaths,
        gridWidth,
        gridHeight,
      );
      if (collision.isBlocked && collision.crashPoint) {
        const screenCrash = toScreen(collision.crashPoint);
        endX = screenCrash.x;
        endY = screenCrash.y;
      } else {
        switch (arrow.exitDirection) {
          case "U":
            endY = 0;
            break;
          case "D":
            endY = svgHeight;
            break;
          case "L":
            endX = 0;
            break;
          case "R":
            endX = svgWidth;
            break;
        }
      }

      // Choose a beautiful matching faint translucent color matching the arrow's personality
      let color = "rgba(19, 33, 67, 0.45)"; // Default deep navy translucent
      if (arrow.isHint) {
        color = "rgba(2, 132, 199, 0.6)"; // Faint sky blue
      }

      return (
        <g key={`guide-${arrow.id}`}>
          {/* Main translucent line track showing exit channel ray */}
          <line
            x1={screenHead.x}
            y1={screenHead.y}
            x2={endX}
            y2={endY}
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.65"
          />
          {/* A soft surrounding glow channel to look exact like the user mockup */}
          <line
            x1={screenHead.x}
            y1={screenHead.y}
            x2={endX}
            y2={endY}
            stroke={color}
            strokeWidth="15"
            strokeLinecap="round"
            opacity="0.10"
          />
        </g>
      );
    });
  };

  // Find middle vertical arrow coordinate for Tutorial Helper Ring in Level 1
  const tutorialArrow = localPaths.find((p) => p.id === "L1-2");

  // A level is complex if there are 6 or more arrows, OR grid is larger than 6x6
  const isComplexLevel =
    localPaths.length >= 6 || gridWidth >= 7 || gridHeight >= 7;

  return (
    <div className="relative w-full h-full flex flex-col justify-center items-center select-none">
      {/* Dynamic Red vignette border overlay on crash, covering the entire display screen beautifully! */}
      {redFlash && (
        <div
          className="fixed inset-0 pointer-events-none z-50 transition-all duration-300 animate-pulse"
          style={{
            boxShadow: "inset 0 0 55px rgba(239, 68, 68, 0.45)",
            background: "rgba(239, 68, 68, 0.03)",
          }}
        />
      )}

      {/* Main Board Container - Stays stable, centered and completely borderless/transparent */}
      <div
        className="relative w-full h-full flex items-center justify-center transition-all overflow-visible"
        style={{ touchAction: "none" }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto drop-shadow-sm select-none overflow-visible"
          style={{ touchAction: "none", cursor: "grab", maxHeight: "80vh" }}
          onPointerDown={(e) => {
            if (e.pointerType === "mouse" && e.button !== 0) return;
            isPanningRef.current = true;
            lastPanRef.current = { x: e.clientX, y: e.clientY };
            dragAccumulatorRef.current = 0;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!isPanningRef.current) return;
            const dx = e.clientX - lastPanRef.current.x;
            const dy = e.clientY - lastPanRef.current.y;
            dragAccumulatorRef.current += Math.abs(dx) + Math.abs(dy);
            lastPanRef.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={(e) => {
            isPanningRef.current = false;
            e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={(e) => {
            isPanningRef.current = false;
            e.currentTarget.releasePointerCapture(e.pointerId);
          }}
        >
          {/* Main SVG group - pan/zoom handled externally by react-zoom-pan-pinch */}
          <g style={{ transformOrigin: "center" }}>
            {/* Grey alignment dots */}
            {renderAlignmentDots()}

            {/* Faint glowing path trajectory channels when toggled by Hashtag button */}
            {renderTrajectoryGuides()}

            {/* Active Arrow Paths */}
            {localPaths.map((p, index) => renderPath(p, index))}
          </g>
        </svg>

        {/* Tutorial Overlays for Level 1 */}
        {levelNumber === 1 && tutorialArrow && (
          <div className="absolute inset-0 pointer-events-none z-20 flex flex-col items-center justify-center">
            {/* White/Yellow hand animation jumping */}
            <div
              className="absolute animate-bounce"
              style={{
                top: `${toScreen(tutorialArrow.points[0]).y - 45}px`,
                left: `${toScreen(tutorialArrow.points[0]).x - 10}px`,
              }}
            >
              {/* Pointing Hand with Blue target ring */}
              <div className="relative">
                <span className="text-4xl filter drop-shadow-md">👉</span>
                <div className="absolute -left-1 -top-1 w-10 h-10 border-4 border-sky-400 rounded-full animate-ping opacity-75" />
              </div>
            </div>

            {/* Custom Tooltip text */}
            <div
              className="absolute bg-sky-500 text-white font-medium text-sm py-2.5 px-5 rounded-xl shadow-lg flex flex-col items-center justify-center animate-pulse border border-sky-300"
              style={{
                top: `${toScreen(tutorialArrow.points[0]).y + 10}px`,
              }}
            >
              <div className="w-4 h-4 bg-sky-500 rotate-45 -mt-4.5 absolute top-0 border-l border-t border-sky-300" />
              Tap to remove
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
