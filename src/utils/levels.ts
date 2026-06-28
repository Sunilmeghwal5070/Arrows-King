/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Point, ArrowPath, LevelConfig } from "../types";
import { checkCollision } from "./collision";

// Generate a random stable alphanumeric string for ID
function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Helper to determine level difficulty dynamically based on the current level number:
 * - Normal: Levels 1 to 25
 * - Medium: Levels 26 to 80
 * - Hard: Levels 81+
 */
function getLevelDifficulty(levelNumber: number): "Normal" | "Medium" | "Hard" {
  if (levelNumber <= 2) return "Normal";
  // Fast scale to Hard level on every 3rd level starting from Level 3:
  // e.g., Level 5, 8, 11, 14, 17, 20... are massive 'Hard' levels, others are 'Normal'/'Medium' scale!
  if (levelNumber % 3 === 2) {
    return "Hard";
  }
  if (levelNumber % 3 === 1) {
    return "Medium";
  }
  return "Normal";
}

/**
 * Creates standard hardcoded levels (1 to 2) shown in the user's screens,
 * and falls back to procedurally generated levels for higher numbers up to 600+.
 */
export function getLevelConfig(levelNumber: number): LevelConfig {
  const config = getRawLevelConfig(levelNumber);
  config.difficulty = getLevelDifficulty(levelNumber);
  return config;
}

function getRawLevelConfig(levelNumber: number): LevelConfig {
  // All levels are procedurally generated based on 57 distinct geometric shape silhouettes
  return generatePatternedLevel(levelNumber);
}

// Over 50+ beautiful unique artistic patterns
const SHAPE_PATTERNS = [
  "Square Box Frame", // 0
  "Symmetric Cross", // 1
  "Love Heart Motif", // 2
  "Perfect Diamond Rhombus", // 3
  "The Symmetrical Windmill", // 4
  "Isometric 3D Cube", // 5
  "Pyramid Triangle", // 6
  "Spiral Vortex Maze", // 7
  "Bento Grid Box", // 8
  "Symmetrical Star Outline", // 9
  "Double Helix Waves", // 10
  "Hourglass Neck", // 11
  "Royal Crown Crest", // 12
  "Greek Key Frame", // 13
  "Symmetrical Butterfly", // 14
  "Marine Anchor Emblem", // 15
  "Four-Leaf Clover", // 16
  "Chessboard Matrix Grid", // 17
  "Infinity Loop Figure-8", // 18
  "Sleek Fish Silhouette", // 19
  "Letter-S Snake Curve", // 20
  "Medieval Shield Wall", // 21
  "Symmetric Pine Tree", // 22
  "Spider-Web Concentrics", // 23
  "Castle Battlement Peak", // 24
  "Sea Trident Fork", // 25
  "Yin-Yang Balance", // 26
  "The Keyhole Outline", // 27
  "Symmetric Starburst", // 28
  "Pixelated Space Invader", // 29
  "Diagonal Stepping Stairs", // 30
  "Sacred Chalice Bowl", // 31
  "Concentric Target Rings", // 32
  "Marine Navigation Compass", // 33
  "Basket Weave Knit Grid", // 34
  "Letter-H Bridge Support", // 35
  "Symmetric Octagon Ring", // 36
  "Retro Ghost Sprite", // 37
  "Symmetric Twin Moons", // 38
  "Letter-M Ridge Peak", // 39
  "Twin Crossing Gates", // 40
  "Diamond Ring Jewel", // 41
  "Letter-Z Sharp Zigzag", // 42
  "Spiked Sunburst Wheel", // 43
  "Chevron Arrow Stacks", // 44
  "Ancient Lotus Flower", // 45
  "Sandglass Side Pillars", // 46
  "Double Diamond Locks", // 47
  "Shield of Protection Cross", // 48
  "Letter-A Step Ladder", // 49
  "Letter-E Triple Fork", // 50
  "Symmetric Grid Maze", // 51
  "Symmetric Hexagon Cell", // 52
  "Royal Crown Scepter", // 53
  "Double Pillars Grid Detail", // 54
  "Retro Space Rocket Body", // 55
  "Heavy Diagonal X-Cross", // 56
];

/**
 * Returns true if a cell coordinate x, y belongs to the geometric skeleton of the theme.
 * This aligns arrows perfectly to build visual shapes (Heart, Cube, Compass, Diamond etc.).
 */
function getPatternScore(
  x: number,
  y: number,
  patternIndex: number,
  W: number,
  H: number,
): boolean {
  const cx = W / 2;
  const cy = H / 2;
  const dx = Math.abs(x - cx);
  const dy = Math.abs(y - cy);

  switch (patternIndex) {
    case 0: // Square Box Frame
      return x === 2 || x === W - 2 || y === 2 || y === H - 2;

    case 1: // Symmetric Cross
      return Math.abs(x - cx) < 0.6 || Math.abs(y - cy) < 0.6;

    case 2: { // Love Heart Motif
      const nx = (x - cx) / (W * 0.4);
      const ny = (y - cy - 0.55) / (H * 0.4);
      const val = nx * nx + Math.pow(ny - Math.sqrt(Math.abs(nx)), 2);
      return val < 0.82 && val > 0.15;
    }

    case 3: // Perfect Diamond Rhombus
      return Math.abs(dx + dy - cx) < 1.1;

    case 4: { // The Symmetrical Windmill
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r < 0.9) return false;
      if (x >= cx && y <= cy)
        return x === Math.floor(cx) || y === Math.floor(cy) - 2;
      if (x >= cx && y >= cy)
        return y === Math.floor(cy) || x === Math.floor(cx) + 2;
      if (x <= cx && y >= cy)
        return x === Math.floor(cx) || y === Math.floor(cy) + 2;
      if (x <= cx && y <= cy)
        return y === Math.floor(cy) || x === Math.floor(cx) - 2;
      return false;
    }

    case 5: { // Isometric 3D Cube
      const onHex = x === 2 || x === W - 2 || y === 2 || y === H - 2;
      const onInteriorY =
        (dx < 0.6 && y >= cy) || (Math.abs(dy - dx) < 0.6 && y <= cy);
      return onHex || onInteriorY;
    }

    case 6: { // Pyramid Triangle
      const progress = (y - 2) / (H - 4);
      const targetDx = progress * (cx - 1.5);
      const onBase = y === H - 2;
      return Math.abs(dx - targetDx) < 1.0 || onBase;
    }

    case 7: { // Spiral Vortex Maze
      const maxDist = Math.max(dx, dy);
      const ring = Math.floor(maxDist);
      if (ring % 2 === 0) {
        if (x > cx && Math.abs(y - cy) < 0.6) return false;
        return true;
      }
      return false;
    }

    case 8: // Bento Grid Box
      return (
        x === 2 ||
        x === W - 2 ||
        y === 2 ||
        y === H - 2 ||
        Math.abs(x - cx) < 0.6 ||
        Math.abs(y - cy) < 0.6
      );

    case 9: // Symmetrical Star Outline
      return (
        Math.abs(x - cx) < 0.6 ||
        Math.abs(y - cy) < 0.6 ||
        Math.abs(dx - dy) < 0.6
      );

    case 10: { // Double Helix Waves
      const sin1 = cy + Math.sin(x * 1.5) * (H * 0.25);
      const sin2 = cy - Math.sin(x * 1.5) * (H * 0.25);
      return Math.abs(y - sin1) < 1.1 || Math.abs(y - sin2) < 1.1;
    }

    case 11: // Hourglass Neck
      return y === 2 || y === H - 2 || Math.abs(dx - dy) < 0.6;

    case 12: { // Royal Crown Crest
      if (y === H - 2) return true;
      if (y === 2) return x === 2 || x === Math.floor(cx) || x === W - 2;
      if (x === 2 || x === W - 2) return y >= 2;
      return Math.abs(y - x) < 0.6 || Math.abs(y - (W - x)) < 0.6;
    }

    case 13: // Greek Key Frame
      return (
        x === 2 ||
        x === W - 2 ||
        y === 2 ||
        y === H - 2 ||
        (x === 4 && y >= 4 && y <= H - 4) ||
        (y === 4 && x >= 4 && x <= W - 4)
      );

    case 14: // Symmetrical Butterfly
      return (
        Math.abs(x - cx) < 0.6 || (dx > 1.2 && dx < W * 0.45 && dy < H * 0.4)
      );

    case 15: { // Marine Anchor Emblem
      const topCircle =
        Math.abs(Math.sqrt(dx * dx + (y - 3) * (y - 3)) - 1.5) < 0.6;
      const trunk = Math.abs(x - cx) < 0.6 && y >= 3 && y <= H - 3;
      const bottomHook = y === H - 2 && dx <= cx - 1;
      const sideHooks = (x === 2 || x === W - 2) && y >= H - 4 && y <= H - 2;
      return topCircle || trunk || bottomHook || sideHooks;
    }

    case 16: // Four-Leaf Clover
      return dx > 0.8 && dy > 0.8 && dx < W * 0.4 && dy < H * 0.4;

    case 17: // Chessboard Matrix Grid
      return x % 2 === 0 || y % 2 === 0;

    case 18: { // Infinity Loop Figure-8
      const cyCenter = cy;
      const cx1 = cx - 1.8;
      const cx2 = cx + 1.8;
      const d1 = Math.sqrt(
        (x - cx1) * (x - cx1) + (y - cyCenter) * (y - cyCenter),
      );
      const d2 = Math.sqrt(
        (x - cx2) * (x - cx2) + (y - cyCenter) * (y - cyCenter),
      );
      return Math.abs(d1 - 1.8) < 0.9 || Math.abs(d2 - 1.8) < 0.9;
    }

    case 19: { // Sleek Fish Silhouette
      if (x < W - 2) {
        const bodyY = cy + Math.sin((x / (W - 2)) * Math.PI) * (H * 0.3);
        const bodyY2 = cy - Math.sin((x / (W - 2)) * Math.PI) * (H * 0.3);
        return Math.abs(y - bodyY) < 1.0 || Math.abs(y - bodyY2) < 1.0;
      } else {
        return x === W - 2 && dy <= H * 0.25;
      }
    }

    case 20: // Letter-S Snake Curve
      if (y === 2 || y === Math.floor(cy) || y === H - 2)
        return x >= 2 && x <= W - 2;
      if (x === 2 && y <= cy) return true;
      if (x === W - 2 && y >= cy) return true;
      return false;

    case 21: // Medieval Shield Wall
      if (y === 2) return x >= 2 && x <= W - 2;
      if (x === 2 || x === W - 2) return y >= 2 && y <= cy;
      {
        const progressX = dx / (cx - 2);
        const targetY = cy + progressX * (H - 2 - cy);
        return Math.abs(y - targetY) < 1.1;
      }

    case 22: { // Symmetric Pine Tree
      const trunk = Math.abs(x - cx) < 0.6 && y >= H - 3;
      const tier1 = y === 3 && dx <= 1;
      const tier2 = y === 5 && dx <= 2;
      const tier3 = y === 7 && dx <= 3;
      return trunk || tier1 || tier2 || tier3;
    }

    case 23: // Spider-Web Concentrics
      return (
        Math.abs(x - cx) < 0.6 ||
        Math.abs(y - cy) < 0.6 ||
        Math.abs(dx - dy) < 0.6 ||
        x === 2 ||
        x === W - 2 ||
        y === 2 ||
        y === H - 2
      );

    case 24: // Castle Battlement Peak
      if (y === 2 || y === H - 2) return x % 2 === 0;
      if (y === 3 || y === H - 3) return x % 2 === 1;
      if (x === 2 || x === W - 2) return true;
      return false;

    case 25: // Sea Trident Fork
      if (y === 2) return x === 2 || x === Math.floor(cx) || x === W - 2;
      if (y >= 2 && y <= cy)
        return x === 2 || x === Math.floor(cx) || x === W - 2;
      if (y === Math.floor(cy)) return x >= 2 && x <= W - 2;
      if (y >= cy) return Math.abs(x - cx) < 0.6;
      return false;

    case 26: { // Yin-Yang Balance
      const onOuterCircle =
        Math.abs(Math.sqrt(dx * dx + dy * dy) - (cx - 1)) < 0.6;
      const sCurve =
        y <= cy
          ? Math.abs(
              x - (cx - Math.sin(((y - 2) / (cy - 2)) * Math.PI) * 1.5),
            ) < 0.8
          : Math.abs(
              x - (cx + Math.sin(((y - cy) / (cy - 2)) * Math.PI) * 1.5),
            ) < 0.8;
      return onOuterCircle || sCurve;
    }

    case 27: { // The Keyhole Outline
      const topRing =
        Math.abs(Math.sqrt(dx * dx + (y - 3) * (y - 3)) - 1.5) < 0.6;
      const trapezoidLeft =
        Math.abs(x - (cx - (y - 4) * 0.5)) < 0.6 && y >= 4 && y <= H - 2;
      const trapezoidRight =
        Math.abs(x - (cx + (y - 4) * 0.5)) < 0.6 && y >= 4 && y <= H - 2;
      const baseLine = y === H - 2 && dx <= 2;
      return topRing || trapezoidLeft || trapezoidRight || baseLine;
    }

    case 28: // Symmetric Starburst
      return dx < 0.6 || dy < 0.6 || Math.abs(dx - dy) < 0.6;

    case 29: // Pixelated Space Invader
      if (x === 2 || x === W - 2) return y === 4 || y === 5;
      if (x === 3 || x === W - 3) return y === 3 || y === 5 || y === 6;
      if (x === 4 || x === W - 4)
        return y === 2 || y === 3 || y === 4 || y === 6;
      return Math.abs(x - cx) < 0.6 && (y === 2 || y === 3 || y === 5);

    case 30: // Diagonal Stepping Stairs
      return (
        Math.abs(x - y) < 0.8 ||
        Math.abs(x - y - 2) < 0.8 ||
        Math.abs(x - y + 2) < 0.8
      );

    case 31: { // Sacred Chalice Bowl
      const bowlTop = y === 2 && dx <= W * 0.35;
      const bowlCurve = y <= cy && Math.abs(dx - (y - 2)) < 0.8;
      const stem = Math.abs(x - cx) < 0.6 && y >= cy && y <= H - 3;
      const stand = y === H - 2 && dx <= 2;
      return bowlTop || bowlCurve || stem || stand;
    }

    case 32: // Concentric Target Rings
      return (
        x === 2 ||
        x === W - 2 ||
        y === 2 ||
        y === H - 2 ||
        x === 4 ||
        x === W - 4 ||
        y === 4 ||
        y === H - 4
      );

    case 33: // Marine Navigation Compass
      if (Math.abs(x - cx) < 0.6) return y >= 2 && y <= H - 2;
      if (Math.abs(y - cy) < 0.6) return x >= 2 && x <= W - 2;
      return Math.abs(dx - dy) < 0.6 && dx <= 2;

    case 34: // Basket Weave Knit Grid
      return (x % 2 === 0 && y % 2 === 1) || (x % 2 === 1 && y % 2 === 0);

    case 35: // Letter-H Bridge Support
      return (
        x === 2 || x === W - 2 || (y === Math.floor(cy) && x >= 2 && x <= W - 2)
      );

    case 36: // Symmetric Octagon Ring
      return dx + dy <= cx + 0.5 && dx + dy >= cx - 1.5;

    case 37: // Retro Ghost Sprite
      if (y === 2) return dx <= cx - 2;
      if (y >= 3 && y <= H - 3) return x === 2 || x === W - 2;
      if (y === H - 2) return x % 2 === 0 && x >= 2 && x <= W - 2;
      return false;

    case 38: { // Symmetric Twin Moons
      const moon1 =
        Math.abs(Math.sqrt((x - 1) * (x - 1) + dy * dy) - 2.5) < 0.6;
      const moon2 =
        Math.abs(Math.sqrt((x - (W - 1)) * (x - (W - 1)) + dy * dy) - 2.5) <
        0.6;
      return moon1 || moon2;
    }

    case 39: // Letter-M Ridge Peak
      if (x === 2 || x === W - 2) return y >= 2;
      return Math.abs(y - 2 - 0.7 * dx) < 0.8 && y <= cy;

    case 40: // Twin Crossing Gates
      return (
        Math.abs(x - cx + 1.5) < 0.6 ||
        Math.abs(x - cx - 1.5) < 0.6 ||
        Math.abs(y - cy + 1.5) < 0.6 ||
        Math.abs(y - cy - 1.5) < 0.6
      );

    case 41: { // Diamond Ring Jewel
      const ring =
        Math.abs(Math.sqrt(dx * dx + (y - (cy + 1)) * (y - (cy + 1))) - 2.0) <
        0.6;
      const jewel = y === 2 && dx <= 1.2;
      const jewelConnector = y === 3 && dx <= 0.6;
      return (ring && y >= 3) || jewel || jewelConnector;
    }

    case 42: // Letter-Z Sharp Zigzag
      return y === 2 || y === H - 2 || Math.abs(W - 1 - x - y) < 0.8;

    case 43: { // Spiked Sunburst Wheel
      const wheel = Math.abs(Math.sqrt(dx * dx + dy * dy) - 2.0) < 0.6;
      const spikes =
        ((x === 1 || x === W - 1) && Math.abs(y - cy) < 0.6) ||
        ((y === 1 || y === H - 1) && Math.abs(x - cx) < 0.6);
      return wheel || spikes;
    }

    case 44: // Chevron Arrow Stacks
      return (
        Math.abs(y - x) < 0.6 ||
        Math.abs(y - x - 2) < 0.6 ||
        Math.abs(y - x + 2) < 0.6
      );

    case 45: { // Ancient Lotus Flower
      const startPtY = H - 2;
      const petal1 = Math.abs(y - startPtY + dx * dx * 0.25) < 0.8;
      return petal1 || (y === H - 2 && dx <= 1);
    }

    case 46: // Sandglass Side Pillars
      return x === 2 || x === W - 2 || y === 3 || y === H - 3;

    case 47: // Double Diamond Locks
      return Math.abs(dx + dy - 2.5) < 0.6 || Math.abs(dx + dy - 4.5) < 0.6;

    case 48: { // Shield of Protection Cross
      const shieldBorder =
        (y === 2 && dx <= cx - 1) ||
        ((x === 2 || x === W - 2) && y <= cy) ||
        (Math.abs(y - (cy + (dx * (H - 2 - cy)) / (cx - 2))) < 0.8 && y >= cy);
      const centralCross =
        (Math.abs(x - cx) < 0.6 && y >= 3 && y <= H - 3) ||
        (Math.abs(y - cy) < 0.6 && x >= 3 && x <= W - 3);
      return shieldBorder || centralCross;
    }

    case 49: { // Letter-A Step Ladder
      const inDiag = Math.abs(dy - 1.1 * dx) < 0.6 && y >= 2;
      const bar = y === Math.floor(cy + 0.5) && dx <= 2;
      return inDiag || bar;
    }

    case 50: // Letter-E Triple Fork
      return x === 2 || y === 2 || y === Math.floor(cy) || y === H - 2;

    case 51: // Symmetric Grid Maze
      return (
        x === 2 ||
        x === W - 2 ||
        y === 2 ||
        y === H - 2 ||
        (x % 3 === 0 && y % 3 !== 0) ||
        (y % 3 === 0 && x % 3 !== 0)
      );

    case 52: { // Symmetric Hexagon Cell
      const capWest = x === 2 && dy <= 1;
      const capEast = x === W - 2 && dy <= 1;
      const upperSlants = Math.abs(y - 2 - 0.5 * dx) < 0.6 && y <= cy;
      const lowerSlants = Math.abs(H - 2 - y - 0.5 * dx) < 0.6 && y >= cy;
      return capWest || capEast || upperSlants || lowerSlants;
    }

    case 53: // Royal Crown Scepter
      return (
        y === 2 ||
        y === H - 2 ||
        x === 2 ||
        x === W - 2 ||
        Math.abs(x - cx) < 0.6
      );

    case 54: // Double Pillars Grid Detail
      return x === 3 || x === W - 3;

    case 55: { // Retro Space Rocket Body
      const noseCone = y <= 3 && Math.abs(dx - (y - 1)) < 0.6;
      const fuselage =
        y >= 3 &&
        y <= H - 4 &&
        (x === Math.floor(cx - 1.5) || x === Math.floor(cx + 1.5));
      const wingsLeft = x === 1 && y >= H - 4 && y <= H - 2;
      const wingsRight = x === W - 1 && y >= H - 4 && y <= H - 2;
      const engineBase = y === H - 2 && dx <= 1.5;
      return noseCone || fuselage || wingsLeft || wingsRight || engineBase;
    }

    case 56: // Heavy Diagonal X-Cross
      return Math.abs(dx - dy) < 0.6;

    default:
      return Math.abs(x - cx) < 0.6 || Math.abs(y - cy) < 0.6;
  }
}

/**
 * Procedural Geometric Shape level generator which replaces random layout clutters
 * with highly recognizable visual patterns.
 */
function generatePatternedLevel(levelNumber: number): LevelConfig {
  const bracket = Math.floor((levelNumber - 1) / 5);
  const arrowCount = bracket * 10 + 10;
  const gridWidth = Math.min(22, 10 + bracket * 2);
  const gridHeight = Math.min(22, 10 + bracket * 2);

  const patternIndex =
    (((levelNumber - 1) % SHAPE_PATTERNS.length) + SHAPE_PATTERNS.length) %
    SHAPE_PATTERNS.length;
  const patternName = SHAPE_PATTERNS[patternIndex];
  const levelTitle = `${patternName}`;

  const baseSeed = levelNumber * 1237 + 5;
  const random = xorshift(baseSeed);

  const paths: ArrowPath[] = [];
  const occupiedCells = new Set<string>();
  const failedStarts = new Set<string>();

  // Find all coordinates covered by the pattern shape skeleton
  const patternTargetCells = new Set<string>();
  for (let x = 1; x < gridWidth - 1; x++) {
    for (let y = 1; y < gridHeight - 1; y++) {
      if (getPatternScore(x, y, patternIndex, gridWidth, gridHeight)) {
        patternTargetCells.add(`${x},${y}`);
      }
    }
  }

  // To guarantee highly intricate path-blocking dependencies and 100% density (no empty dots):
  // We keep selecting start cells inside the empty pattern cells and prioritize blocking existing exits.
  let triesLeft = 2500;

  while (triesLeft > 0) {
    triesLeft--;

    // Extract all free cells belonging to the pattern shape (omitting failed starting cells)
    const freePatternCells: Point[] = [];
    for (const key of patternTargetCells) {
      if (!occupiedCells.has(key) && !failedStarts.has(key)) {
        const [x, y] = key.split(",").map(Number);
        freePatternCells.push({ x, y });
      }
    }

    // Stop early if pattern is completely filled with arrows (no empty dots/spaces) or no more valid start coordinates can be found
    if (freePatternCells.length === 0) {
      break;
    }

    // Limit count of arrows to exactly the desired arrow count
    if (paths.length >= arrowCount) {
      break;
    }

    // Direct dependency tracking: collect positions directly in front of the exit of currently placed arrows
    const blockingTargets = new Set<string>();
    for (const p of paths) {
      const head = p.points[p.points.length - 1];
      let stepX = 0,
        stepY = 0;
      if (p.exitDirection === "U") stepY = -1;
      else if (p.exitDirection === "D") stepY = 1;
      else if (p.exitDirection === "L") stepX = -1;
      else if (p.exitDirection === "R") stepX = 1;

      // The next 1-2 cells on their escape ray
      for (let dist = 1; dist <= 2; dist++) {
        const tx = head.x + stepX * dist;
        const ty = head.y + stepY * dist;
        if (tx >= 1 && tx < gridWidth - 1 && ty >= 1 && ty < gridHeight - 1) {
          if (patternTargetCells.has(`${tx},${ty}`)) {
            blockingTargets.add(`${tx},${ty}`);
          }
        }
      }
    }

    // Rank free pattern cells to prioritize dependency blocking & cluster aggregation
    freePatternCells.sort((a, b) => {
      const keyA = `${a.x},${a.y}`;
      const keyB = `${b.x},${b.y}`;

      const blockA = blockingTargets.has(keyA) ? 1 : 0;
      const blockB = blockingTargets.has(keyB) ? 1 : 0;
      if (blockA !== blockB) return blockB - blockA; // Blocker cells come first!

      // Count adjacent occupied neighbors to force ultra-dense packaging with no gaps
      const neighbors = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      let nOccupiedA = 0;
      let nOccupiedB = 0;
      for (const [dx, dy] of neighbors) {
        if (occupiedCells.has(`${a.x + dx},${a.y + dy}`)) nOccupiedA++;
        if (occupiedCells.has(`${b.x + dx},${b.y + dy}`)) nOccupiedB++;
      }

      if (nOccupiedA !== nOccupiedB) return nOccupiedB - nOccupiedA; // tight cluster first

      return random() - 0.5; // Slight shuffle for beautiful structural variety
    });

    const candidateStart = freePatternCells[0];
    const startX = candidateStart.x;
    const startY = candidateStart.y;

    // Determine target bends (number of corners).
    let minBends = 1;
    let maxBends = 3;
    if (levelNumber >= 6) {
      maxBends = 4;
    }
    if (levelNumber >= 12) {
      maxBends = 5;
    }

    const targetBends =
      minBends + Math.floor(random() * (maxBends - minBends + 1));

    const points: Point[] = [{ x: startX, y: startY }];
    const pathCells = new Set<string>([`${startX},${startY}`]);
    let currentDir: "U" | "D" | "L" | "R" | null = null;

    let bestPoints: Point[] = [];
    let bestDir: "U" | "D" | "L" | "R" | null = null;
    let bestPathCells = new Set<string>();

    let stepsStuck = 0;

    // Build winding segments step-by-step
    for (let segmentIndex = 0; segmentIndex < targetBends + 1; segmentIndex++) {
      const prev = points[points.length - 1];
      let allowedDirs: ("U" | "D" | "L" | "R")[] = [];

      if (currentDir === null) {
        allowedDirs = ["U", "D", "L", "R"];
      } else if (currentDir === "U" || currentDir === "D") {
        allowedDirs = ["L", "R"];
      } else {
        allowedDirs = ["U", "D"];
      }

      // Rank allowed directions to prefer staying inside the remaining free cells of the pattern shape
      allowedDirs.sort((dirA, dirB) => {
        let scoreA = 0;
        let scoreB = 0;

        const deltaA = { x: 0, y: 0 };
        const deltaB = { x: 0, y: 0 };

        if (dirA === "U") deltaA.y = -1;
        else if (dirA === "D") deltaA.y = 1;
        else if (dirA === "L") deltaA.x = -1;
        else if (dirA === "R") deltaA.x = 1;

        if (dirB === "U") deltaB.y = -1;
        else if (dirB === "D") deltaB.y = 1;
        else if (dirB === "L") deltaB.x = -1;
        else if (dirB === "R") deltaB.x = 1;

        // Count how many consecutive free pattern cells are in this direction
        for (let step = 1; step <= 3; step++) {
          const kA = `${prev.x + deltaA.x * step},${prev.y + deltaA.y * step}`;
          if (
            patternTargetCells.has(kA) &&
            !occupiedCells.has(kA) &&
            !pathCells.has(kA)
          ) {
            scoreA += 2;
          }
          const kB = `${prev.x + deltaB.x * step},${prev.y + deltaB.y * step}`;
          if (
            patternTargetCells.has(kB) &&
            !occupiedCells.has(kB) &&
            !pathCells.has(kB)
          ) {
            scoreB += 2;
          }
        }

        return scoreB - scoreA + (random() - 0.5) * 0.4;
      });

      let segmentPlaced = false;

      for (const dir of allowedDirs) {
        // Longer segments for long winding snaking effect
        const minLen = 2;
        const maxLen = targetBends >= 5 ? 5 : 4;
        const targetLen = minLen + Math.floor(random() * (maxLen - minLen + 1));

        // Progressive Length Checker: if we can't fit targetLen, try shorter lengths down to 1!
        for (let currentLen = targetLen; currentLen >= 1; currentLen--) {
          const tempCells: Point[] = [];
          let currentOk = true;

          for (let step = 1; step <= currentLen; step++) {
            let testX = prev.x;
            let testY = prev.y;
            if (dir === "U") testY -= step;
            else if (dir === "D") testY += step;
            else if (dir === "L") testX -= step;
            else if (dir === "R") testX += step;

            if (
              testX < 1 ||
              testX > gridWidth - 2 ||
              testY < 1 ||
              testY > gridHeight - 2
            ) {
              currentOk = false;
              break;
            }

            const cellKey = `${testX},${testY}`;
            if (
              !patternTargetCells.has(cellKey) ||
              occupiedCells.has(cellKey) ||
              pathCells.has(cellKey)
            ) {
              currentOk = false;
              break;
            }

            tempCells.push({ x: testX, y: testY });
          }

          if (currentOk && tempCells.length > 0) {
            for (const pt of tempCells) {
              pathCells.add(`${pt.x},${pt.y}`);
            }
            points.push(tempCells[tempCells.length - 1]);
            currentDir = dir;
            segmentPlaced = true;

            // Direct check: is this partial path escape route clear from its head?
            const currentHead = points[points.length - 1];
            let currentRayClear = true;

            let stepX = 0,
              stepY = 0;
            if (currentDir === "U") stepY = -1;
            else if (currentDir === "D") stepY = 1;
            else if (currentDir === "L") stepX = -1;
            else if (currentDir === "R") stepX = 1;

            let rx = currentHead.x + stepX;
            let ry = currentHead.y + stepY;

            while (rx >= 0 && rx <= gridWidth && ry >= 0 && ry <= gridHeight) {
              if (
                occupiedCells.has(`${rx},${ry}`) ||
                pathCells.has(`${rx},${ry}`)
              ) {
                currentRayClear = false;
                break;
              }
              rx += stepX;
              ry += stepY;
            }

            if (currentRayClear && points.length - 2 >= minBends) {
              // This is a certified solvable/escape-ready state and matches the complex layout requirement!
              bestPoints = [...points];
              bestDir = currentDir;
              bestPathCells = new Set(pathCells);
            }

            break; // Break the progressive length loop since we placed this segment!
          }
        }

        if (segmentPlaced) {
          break; // Break allowedDirs loop to proceed to next segment index
        }
      }

      if (!segmentPlaced) {
        break; // Stuck, cannot place any further segment
      }
    }

    // If we have a certified escape-ready custom snaked arrow, let's place it!
    if (bestPoints.length >= 2 && bestDir !== null) {
      for (const key of bestPathCells) {
        occupiedCells.add(key);
      }

      paths.push({
        id: makeId(`pat-${levelNumber}-${paths.length}`),
        points: bestPoints,
        exitDirection: bestDir,
        animState: { type: "idle" },
      });

      failedStarts.clear(); // We succeeded, search space might have changed/new options unlocked!
    } else {
      failedStarts.add(`${startX},${startY}`); // Blacklist this start point as trapped so we don't try it again in this layout pass
    }
  }

  // Reverse paths so they are solved beautifully from first to last
  const finalPaths = [...paths].reverse();

  if (finalPaths.length < Math.max(5, Math.floor(arrowCount * 0.65))) {
    return generateGuaranteedFailSafeLevel(
      levelNumber,
      arrowCount,
      gridWidth,
      gridHeight,
    );
  }

  return {
    levelNumber,
    title: levelTitle,
    difficulty: getLevelDifficulty(levelNumber),
    gridWidth,
    gridHeight,
    maxMoves: finalPaths.length + Math.floor(finalPaths.length * 0.45) + 3,
    paths: finalPaths,
  };
}

/**
 * 100% guaranteed solvable beautiful geometric fallback generator.
 * Sequentially places non-overlapping straight or single-bend arrows on widescreen coordinates.
 */
function generateGuaranteedFailSafeLevel(
  levelNumber: number,
  targetCount: number,
  customGridW?: number,
  customGridH?: number,
): LevelConfig {
  const bracket = Math.floor((levelNumber - 1) / 5);
  const gridW = customGridW ?? Math.min(22, 10 + bracket * 2);
  const gridH = customGridH ?? Math.min(22, 10 + bracket * 2);

  const paths: ArrowPath[] = [];
  const occupiedCells = new Set<string>();
  const failedStarts = new Set<string>();
  const random = xorshift(levelNumber * 617 + 83);

  // Consider the entire inner grid as valid coordinates
  const targetCells = new Set<string>();
  for (let x = 1; x < gridW - 1; x++) {
    for (let y = 1; y < gridH - 1; y++) {
      targetCells.add(`${x},${y}`);
    }
  }

  let triesLeft = 2000;
  while (triesLeft > 0 && paths.length < targetCount) {
    triesLeft--;

    const freeCells: Point[] = [];
    for (const key of targetCells) {
      if (!occupiedCells.has(key) && !failedStarts.has(key)) {
        const [x, y] = key.split(",").map(Number);
        freeCells.push({ x, y });
      }
    }

    if (freeCells.length === 0) {
      break;
    }

    // Direct dependency tracking: collect positions directly in front of the exit of currently placed arrows
    const blockingTargets = new Set<string>();
    for (const p of paths) {
      const head = p.points[p.points.length - 1];
      let stepX = 0,
        stepY = 0;
      if (p.exitDirection === "U") stepY = -1;
      else if (p.exitDirection === "D") stepY = 1;
      else if (p.exitDirection === "L") stepX = -1;
      else if (p.exitDirection === "R") stepX = 1;

      // The next 1-2 cells on their escape ray
      for (let dist = 1; dist <= 2; dist++) {
        const tx = head.x + stepX * dist;
        const ty = head.y + stepY * dist;
        if (tx >= 1 && tx < gridW - 1 && ty >= 1 && ty < gridH - 1) {
          blockingTargets.add(`${tx},${ty}`);
        }
      }
    }

    // Sort to promote tight clumping and exit blocking
    freeCells.sort((a, b) => {
      const keyA = `${a.x},${a.y}`;
      const keyB = `${b.x},${b.y}`;

      const blockA = blockingTargets.has(keyA) ? 1 : 0;
      const blockB = blockingTargets.has(keyB) ? 1 : 0;
      if (blockA !== blockB) return blockB - blockA; // Blocker cells prioritized

      let nOccupiedA = 0;
      let nOccupiedB = 0;
      const neighbors = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      for (const [dx, dy] of neighbors) {
        if (occupiedCells.has(`${a.x + dx},${a.y + dy}`)) nOccupiedA++;
        if (occupiedCells.has(`${b.x + dx},${b.y + dy}`)) nOccupiedB++;
      }
      if (nOccupiedA !== nOccupiedB) return nOccupiedB - nOccupiedA; // Dense packs first
      return random() - 0.5;
    });

    const startX = freeCells[0].x;
    const startY = freeCells[0].y;

    // Use more winding bends to make arrows longer
    let minBends = 1;
    let maxBends = 3;
    if (levelNumber >= 6) {
      maxBends = 4;
    }
    const targetBends =
      minBends + Math.floor(random() * (maxBends - minBends + 1));

    const points: Point[] = [{ x: startX, y: startY }];
    const pathCells = new Set<string>([`${startX},${startY}`]);
    let currentDir: "U" | "D" | "L" | "R" | null = null;

    let bestPoints: Point[] = [];
    let bestDir: "U" | "D" | "L" | "R" | null = null;
    let bestPathCells = new Set<string>();

    let segmentPlaced = false;

    for (let segmentIndex = 0; segmentIndex < targetBends + 1; segmentIndex++) {
      const prev = points[points.length - 1];
      let allowedDirs: ("U" | "D" | "L" | "R")[] = [];

      if (currentDir === null) {
        allowedDirs = ["U", "D", "L", "R"];
      } else if (currentDir === "U" || currentDir === "D") {
        allowedDirs = ["L", "R"];
      } else {
        allowedDirs = ["U", "D"];
      }

      allowedDirs.sort(() => random() - 0.5);

      for (const dir of allowedDirs) {
        const minLen = 2;
        const maxLen = targetBends >= 4 ? 4 : 3;
        const targetLen = minLen + Math.floor(random() * (maxLen - minLen + 1));

        for (let currentLen = targetLen; currentLen >= 1; currentLen--) {
          const tempCells: Point[] = [];
          let currentOk = true;

          for (let step = 1; step <= currentLen; step++) {
            let testX = prev.x;
            let testY = prev.y;
            if (dir === "U") testY -= step;
            else if (dir === "D") testY += step;
            else if (dir === "L") testX -= step;
            else if (dir === "R") testX += step;

            if (
              testX < 1 ||
              testX > gridW - 2 ||
              testY < 1 ||
              testY > gridH - 2
            ) {
              currentOk = false;
              break;
            }

            const cellKey = `${testX},${testY}`;
            if (occupiedCells.has(cellKey) || pathCells.has(cellKey)) {
              currentOk = false;
              break;
            }

            tempCells.push({ x: testX, y: testY });
          }

          if (currentOk && tempCells.length > 0) {
            for (const pt of tempCells) {
              pathCells.add(`${pt.x},${pt.y}`);
            }
            points.push(tempCells[tempCells.length - 1]);
            currentDir = dir;
            segmentPlaced = true;

            // Direct check: is this partial path escape route clear from its head?
            const currentHead = points[points.length - 1];
            let currentRayClear = true;

            let stepX = 0,
              stepY = 0;
            if (currentDir === "U") stepY = -1;
            else if (currentDir === "D") stepY = 1;
            else if (currentDir === "L") stepX = -1;
            else if (currentDir === "R") stepX = 1;

            let rx = currentHead.x + stepX;
            let ry = currentHead.y + stepY;

            while (rx >= 0 && rx <= gridW && ry >= 0 && ry <= gridH) {
              if (
                occupiedCells.has(`${rx},${ry}`) ||
                pathCells.has(`${rx},${ry}`)
              ) {
                currentRayClear = false;
                break;
              }
              rx += stepX;
              ry += stepY;
            }

            if (currentRayClear && points.length - 2 >= minBends) {
              bestPoints = [...points];
              bestDir = currentDir;
              bestPathCells = new Set(pathCells);
            }

            break; // Break progressive length check
          }
        }

        if (segmentPlaced) {
          break; // Next segment
        }
      }

      if (!segmentPlaced) {
        break; // Stuck, abort further bends
      }
    }

    if (bestPoints.length >= 2 && bestDir !== null) {
      for (const key of bestPathCells) {
        occupiedCells.add(key);
      }

      paths.push({
        id: makeId(`fs-${levelNumber}-${paths.length}`),
        points: bestPoints,
        exitDirection: bestDir,
        animState: { type: "idle" },
      });

      failedStarts.clear();
    } else {
      failedStarts.add(`${startX},${startY}`);
    }
  }

  const clearOrder = topologicalClearingOrder(paths, gridW, gridH);
  const finalPaths = paths.filter((p) => clearOrder.includes(p.id)).reverse();

  if (finalPaths.length < 3) {
    const backupPaths: ArrowPath[] = [
      {
        id: makeId("fs-b-1"),
        points: [
          { x: 1, y: 1 },
          { x: 3, y: 1 },
          { x: 3, y: 3 },
        ],
        exitDirection: "D",
        animState: { type: "idle" },
      },
      {
        id: makeId("fs-b-2"),
        points: [
          { x: 5, y: 1 },
          { x: 5, y: 4 },
          { x: 2, y: 4 },
        ],
        exitDirection: "L",
        animState: { type: "idle" },
      },
      {
        id: makeId("fs-b-3"),
        points: [
          { x: 1, y: 5 },
          { x: 1, y: 2 },
          { x: 4, y: 2 },
        ],
        exitDirection: "R",
        animState: { type: "idle" },
      },
    ];
    return {
      levelNumber,
      title: "Cosmic Flow",
      difficulty: getLevelDifficulty(levelNumber),
      gridWidth: 7,
      gridHeight: 7,
      maxMoves: 10,
      paths: backupPaths,
    };
  }

  return {
    levelNumber,
    title: "Flowing Maze Grid",
    difficulty: getLevelDifficulty(levelNumber),
    gridWidth: gridW,
    gridHeight: gridH,
    maxMoves: finalPaths.length + Math.floor(finalPaths.length * 0.4) + 3,
    paths: finalPaths,
  };
}

/**
 * Searches for a bended path whose segments preferentially overlap with the geometric pattern mask.
 */
function generatePatternDisjointPath(
  gridWidth: number,
  gridHeight: number,
  numBends: number,
  patternIndex: number,
  occupied: Set<string>,
  random: () => number,
  relaxConstraint: boolean,
): ArrowPath | null {
  for (let startTry = 0; startTry < 150; startTry++) {
    let startX = Math.floor(random() * (gridWidth - 2)) + 1;
    let startY = Math.floor(random() * (gridHeight - 2)) + 1;

    // Prioritize start points matching the geometric contour layout
    if (!relaxConstraint && startTry < 100) {
      let foundPatternStart = false;
      for (let retries = 0; retries < 25; retries++) {
        const tx = Math.floor(random() * (gridWidth - 2)) + 1;
        const ty = Math.floor(random() * (gridHeight - 2)) + 1;
        if (getPatternScore(tx, ty, patternIndex, gridWidth, gridHeight)) {
          startX = tx;
          startY = ty;
          foundPatternStart = true;
          break;
        }
      }
    }

    const startKey = `${startX},${startY}`;
    if (occupied.has(startKey)) continue;

    const points: Point[] = [{ x: startX, y: startY }];
    const pathKeys = new Set<string>([startKey]);
    let currentDir: "U" | "D" | "L" | "R" | null = null;
    let ok = true;

    for (let segmentIndex = 0; segmentIndex < numBends + 1; segmentIndex++) {
      const prev = points[points.length - 1];

      let allowedDirs: ("U" | "D" | "L" | "R")[] = [];
      if (currentDir === null) {
        allowedDirs = ["U", "D", "L", "R"];
      } else if (currentDir === "U" || currentDir === "D") {
        allowedDirs = ["L", "R"];
      } else {
        allowedDirs = ["U", "D"];
      }

      // Sort allowed directions to favor tracing the math pattern structure!
      if (!relaxConstraint) {
        allowedDirs.sort((dirA, dirB) => {
          let scoreA = 0;
          let testAx = prev.x;
          let testAy = prev.y;
          if (dirA === "U") testAy -= 1;
          else if (dirA === "D") testAy += 1;
          else if (dirA === "L") testAx -= 1;
          else if (dirA === "R") testAx += 1;
          if (
            getPatternScore(testAx, testAy, patternIndex, gridWidth, gridHeight)
          ) {
            scoreA = 1;
          }

          let scoreB = 0;
          let testBx = prev.x;
          let testBy = prev.y;
          if (dirB === "U") testBy -= 1;
          else if (dirB === "D") testBy += 1;
          else if (dirB === "L") testBx -= 1;
          else if (dirB === "R") testBx += 1;
          if (
            getPatternScore(testBx, testBy, patternIndex, gridWidth, gridHeight)
          ) {
            scoreB = 1;
          }

          // Descending (highest quality first) with a touch of variety via noise
          return scoreB - scoreA + (random() - 0.5) * 0.45;
        });
      } else {
        allowedDirs.sort(() => random() - 0.5);
      }

      let placedSegment = false;
      for (const dir of allowedDirs) {
        // Segment lengths: 2 to 4 looks snaking and long
        const minLen = 2;
        const maxLen = numBends >= 2 ? 3 : 4;
        const len = Math.floor(random() * (maxLen - minLen + 1)) + minLen;

        const segmentTempCells: Point[] = [];
        let isSegmentOk = true;

        for (let step = 1; step <= len; step++) {
          let testX = prev.x;
          let testY = prev.y;
          if (dir === "U") testY -= step;
          else if (dir === "D") testY += step;
          else if (dir === "L") testX -= step;
          else if (dir === "R") testX += step;

          if (
            testX < 1 ||
            testX > gridWidth - 1 ||
            testY < 1 ||
            testY > gridHeight - 1
          ) {
            isSegmentOk = false;
            break;
          }

          const key = `${testX},${testY}`;
          if (occupied.has(key) || pathKeys.has(key)) {
            isSegmentOk = false;
            break;
          }

          segmentTempCells.push({ x: testX, y: testY });
        }

        if (isSegmentOk && segmentTempCells.length > 0) {
          for (const c of segmentTempCells) {
            pathKeys.add(`${c.x},${c.y}`);
          }
          const endPt = segmentTempCells[segmentTempCells.length - 1];
          points.push(endPt);
          currentDir = dir;
          placedSegment = true;
          break;
        }
      }

      if (!placedSegment) {
        ok = false;
        break;
      }
    }

    if (ok && points.length === numBends + 2 && currentDir !== null) {
      for (const k of pathKeys) {
        occupied.add(k);
      }

      return {
        id: "",
        points,
        exitDirection: currentDir,
        animState: { type: "idle" },
      };
    }
  }

  return null;
}

function xorshift(seed: number) {
  let state = seed || 1;
  return function () {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

/**
 * Topological solver that returns an ordering in which arrows can be removed without collisions.
 * Performs simulated gameplay removals.
 */
function topologicalClearingOrder(
  originalPaths: ArrowPath[],
  gridWidth: number,
  gridHeight: number,
): string[] {
  let activePaths = [...originalPaths];
  const order: string[] = [];

  let progress = true;
  while (progress && activePaths.length > 0) {
    progress = false;

    for (let i = 0; i < activePaths.length; i++) {
      const arrow = activePaths[i];
      const collision = checkCollision(
        arrow,
        activePaths,
        gridWidth,
        gridHeight,
      );

      if (!collision.isBlocked) {
        order.push(arrow.id);
        activePaths.splice(i, 1);
        progress = true;
        break;
      }
    }
  }

  return order;
}

/**
 * Returns a list of all safe-to-remove arrow IDs at the current board state.
 * Useful for building the Helpful Hint system!
 */
export function getSolvableArrows(
  paths: ArrowPath[],
  gridWidth: number,
  gridHeight: number,
): string[] {
  const solvable: string[] = [];
  for (const arrow of paths) {
    const result = checkCollision(arrow, paths, gridWidth, gridHeight);
    if (!result.isBlocked) {
      solvable.push(arrow.id);
    }
  }
  return solvable;
}

/**
 * Helper to check if two orthogonally-aligned line segments parallelly overlap.
 */
function doArrowsOverlap(
  p1a: Point,
  p1b: Point,
  p2a: Point,
  p2b: Point,
): boolean {
  const isHoriz1 = Math.abs(p1a.y - p1b.y) < 0.01;
  const isHoriz2 = Math.abs(p2a.y - p2b.y) < 0.01;

  if (isHoriz1 && isHoriz2) {
    if (Math.abs(p1a.y - p2a.y) < 0.01) {
      const minX1 = Math.min(p1a.x, p1b.x);
      const maxX1 = Math.max(p1a.x, p1b.x);
      const minX2 = Math.min(p2a.x, p2b.x);
      const maxX2 = Math.max(p2a.x, p2b.x);

      const overlapMin = Math.max(minX1, minX2);
      const overlapMax = Math.min(maxX1, maxX2);

      if (overlapMax - overlapMin > 0.05) {
        return true;
      }
    }
  } else if (!isHoriz1 && !isHoriz2) {
    if (Math.abs(p1a.x - p2a.x) < 0.01) {
      const minY1 = Math.min(p1a.y, p1b.y);
      const maxY1 = Math.max(p1a.y, p1b.y);
      const minY2 = Math.min(p2a.y, p2b.y);
      const maxY2 = Math.max(p2a.y, p2b.y);

      const overlapMin = Math.max(minY1, minY2);
      const overlapMax = Math.min(maxY1, maxY2);

      if (overlapMax - overlapMin > 0.05) {
        return true;
      }
    }
  }
  return false;
}
