/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Confetti } from './Confetti';
import { ArrowPath, Point } from '../types';
import { Sparkles, ChevronRight, Lightbulb } from 'lucide-react';

interface LevelCompleteModalProps {
  levelNumber: number;
  paths: ArrowPath[]; // original paths to draw miniature final blueprint in card
  gridWidth: number;
  gridHeight: number;
  onNextGame: () => void;
  onMainMenu: () => void;
  isDaily?: boolean;
  earnedHint?: boolean;
  autoNext: boolean;
  setAutoNext: (v: boolean) => void;
}

export function LevelCompleteModal({
  levelNumber,
  paths,
  gridWidth,
  gridHeight,
  onNextGame,
  onMainMenu,
  isDaily = false,
  earnedHint = false,
  autoNext,
  setAutoNext,
}: LevelCompleteModalProps) {

  const [isShrunk, setIsShrunk] = React.useState(false);
  const [showContent, setShowContent] = React.useState(false);
  const [secondsLeft, setSecondsLeft] = React.useState(3);

  // Auto-next countdown timer when content is visible and autoNext is enabled
  React.useEffect(() => {
    if (!showContent || !autoNext) {
      setSecondsLeft(3);
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showContent, autoNext]);

  // Handle actual auto-advance when countdown reaches zero in a clean effect
  React.useEffect(() => {
    if (autoNext && showContent && secondsLeft === 0) {
      onNextGame();
    }
  }, [secondsLeft, autoNext, showContent, onNextGame]);

  React.useEffect(() => {
    // Show the full game board view first, then shrink it down beautifully
    const timer1 = setTimeout(() => {
      setIsShrunk(true);
    }, 1200);

    // Reveal final buttons and confetti with entrance animation after shrinking down
    const timer2 = setTimeout(() => {
      setShowContent(true);
    }, 2200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Svg sizing for mini preview - dynamically interpolating to survive shrink motion smoothly
  const cellS = isShrunk ? 22 : 46; // scaled beautifully depending on shrink state
  const marginP = isShrunk ? 22 : 36;
  const miniW = gridWidth * cellS + marginP * 2;
  const miniH = gridHeight * cellS + marginP * 2;

  const toMiniScreen = (p: Point): Point => {
    return {
      x: marginP + p.x * cellS,
      y: marginP + p.y * cellS,
    };
  };

  const renderAlignmentDots = () => {
    return null;
  };

  const drawMiniArrowHead = (tip: Point, dir: 'U' | 'D' | 'L' | 'R') => {
    const screenTip = toMiniScreen(tip);
    const size = isShrunk ? 6.5 : 10;

    let pLine = '';
    switch (dir) {
      case 'U':
        pLine = `M ${screenTip.x - size} ${screenTip.y + size * 1.2} L ${screenTip.x} ${screenTip.y} L ${screenTip.x + size} ${screenTip.y + size * 1.2}`;
        break;
      case 'D':
        pLine = `M ${screenTip.x - size} ${screenTip.y - size * 1.2} L ${screenTip.x} ${screenTip.y} L ${screenTip.x + size} ${screenTip.y - size * 1.2}`;
        break;
      case 'L':
        pLine = `M ${screenTip.x + size * 1.2} ${screenTip.y - size} L ${screenTip.x} ${screenTip.y} L ${screenTip.x + size * 1.2} ${screenTip.y + size}`;
        break;
      case 'R':
        pLine = `M ${screenTip.x - size * 1.2} ${screenTip.y - size} L ${screenTip.x} ${screenTip.y} L ${screenTip.x - size * 1.2} ${screenTip.y + size}`;
        break;
    }

    return (
      <path
        d={pLine}
        fill="none"
        stroke="#132143"
        strokeWidth={isShrunk ? "3.6" : "5.5"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };

  return (
    <div className="fixed inset-0 bg-[#007cd8] bg-gradient-to-b from-[#1da1f2] to-[#005fb2] flex flex-col items-center justify-center text-white p-4 z-50 select-none overflow-hidden font-sans transition-all duration-700">
      
      {/* Falling colorful candy confetti generator */}
      {showContent && <Confetti />}

      {/* Rotating rayed sunburst elements background - conic-gradient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center opacity-10">
        <div className="w-[180vw] h-[180vw] rounded-full bg-[repeating-conic-gradient(from_0deg,_transparent_0deg_15deg,_rgba(255,255,255,0.4)_15deg_30deg)] animate-spin" style={{ animationDuration: '40s' }} />
      </div>

      {/* Level Complete Header - Prominent and highly visible completed level indicator */}
      <div className={`text-center mb-6 z-10 flex flex-col items-center gap-1 transition-all duration-700 transform ${
        showContent ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}>
        <span className="text-xs uppercase tracking-[0.2em] font-black text-amber-200 bg-blue-900/40 border border-blue-400/20 py-1.5 px-4 rounded-full mb-1.5 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 fill-current text-amber-300 animate-pulse" />
          {isDaily ? 'DAILY MATCH CLEAR' : `LEVEL ${levelNumber} CLEAR`}
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight drop-shadow-md select-none">
          {isDaily ? 'Great Job!' : 'Awesome!'}
        </h2>
      </div>

      {/* Central Square Card: starts large (like the game board) and shrinks down beautifully */}
      <div 
        className={`shadow-2xl z-10 text-[#1e2540] text-center flex flex-col items-center justify-center relative overflow-hidden ring-4 ring-white/10 transition-all duration-[1000ms] cubic-bezier(0.25, 1, 0.5, 1) mb-6 shrink-0 ${
          isShrunk 
            ? 'w-48 h-48 sm:w-56 sm:h-56 rounded-3xl scale-100 opacity-100 bg-white' 
            : 'w-[92vw] max-w-[440px] h-[380px] rounded-[32px] scale-105 opacity-100 bg-slate-50 border-4 border-white'
        }`}
      >
        
        {/* Subtle background glow bubbles */}
        <div className="absolute -left-6 -top-6 w-20 h-20 bg-sky-50 rounded-full blur-xl opacity-60" />
        <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-sky-50 rounded-full blur-xl opacity-60" />
        
        {/* Clean Static Blueprint path representation */}
        <div className={`overflow-hidden flex items-center justify-center w-full h-full transition-all duration-[1000ms] ease-out ${
          isShrunk 
            ? 'max-w-[170px] max-h-[170px]' 
            : 'max-w-[340px] max-h-[300px]'
        }`}>
          <svg
            viewBox={`0 0 ${miniW} ${miniH}`}
            className="w-full h-full drop-shadow-sm transition-all duration-700"
          >
            {/* Base alignment dots rendered nicely under paths */}
            {renderAlignmentDots()}

            {paths.map((p) => {
              let dMiniStr = '';
              if (p.points.length > 0) {
                const ep = toMiniScreen(p.points[0]);
                dMiniStr += `M ${ep.x} ${ep.y}`;
                for (let i = 1; i < p.points.length; i++) {
                  const pt = toMiniScreen(p.points[i]);
                  dMiniStr += ` L ${pt.x} ${pt.y}`;
                }
              }

              return (
                <g key={p.id}>
                  {/* Miniature lane */}
                  <path
                     d={dMiniStr}
                     fill="none"
                     stroke="#132143"
                     strokeWidth={isShrunk ? "3.6" : "5.5"}
                     strokeLinecap="round"
                     strokeLinejoin="round"
                  />
                  {drawMiniArrowHead(p.points[p.points.length - 1], p.exitDirection)}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Bottom control capsule button bar */}
      <div className={`w-full max-w-xs flex flex-col items-center justify-center gap-3.5 z-10 mb-2 transition-all duration-700 transform ${
        showContent ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95 pointer-events-none'
      }`}>
        
        {earnedHint && (
          <div className="w-64 bg-amber-500/25 border border-amber-400 bg-linear-to-r from-amber-500/25 via-amber-600/30 to-amber-500/25 text-amber-200 px-4 py-3 rounded-2xl flex items-center gap-3 animate-pulse shadow-md mb-1.5 transform hover:scale-105 transition-transform duration-300">
            <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center shadow-lg animate-bounce shrink-0">
              <Lightbulb className="w-4.5 h-4.5 fill-slate-900 stroke-[2.5]" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-black uppercase tracking-wider text-amber-300 leading-none">Complete Reward</span>
              <span className="text-xs font-extrabold text-white leading-normal mt-0.5">+1 Hint Unlocked!</span>
            </div>
          </div>
        )}

        {/* Next Game pill capsule button */}
        <button
          onClick={onNextGame}
          className="w-64 h-14 bg-white hover:bg-slate-50 text-blue-600 font-extrabold rounded-full shadow-xl shadow-blue-900/30 transform active:scale-95 transition-all flex flex-col items-center justify-center group shrink-0 cursor-pointer"
        >
          <span className="text-base font-black tracking-tight flex items-center gap-1.5 leading-none group-hover:translate-x-0.5 transition-transform">
            {isDaily ? 'Back to Menu' : 'Next Level'} <ChevronRight className="w-4 h-4 stroke-[3.5] group-hover:translate-x-0.5 transition-transform" />
          </span>
          <span className="text-[10px] font-bold text-sky-500 tracking-wider uppercase leading-none mt-1">
            {isDaily ? 'Return to Home Screen' : `Play Level ${levelNumber + 1}`}
          </span>
        </button>

        {/* Auto Next Toggle Option */}
        <div className="w-64 flex items-center justify-between bg-white/10 border border-white/10 px-4.5 py-3 rounded-2xl transition-colors">
          <div className="flex flex-col text-left">
            <span className="text-xs font-black tracking-tight text-white/95">
              Auto Advance
            </span>
            <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">
              {autoNext ? `Next in ${secondsLeft}s...` : 'Off'}
            </span>
          </div>

          <button
            onClick={() => {
              setAutoNext(!autoNext);
              setSecondsLeft(3); // Reset countdown timer on toggle change
            }}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none relative flex items-center shrink-0 cursor-pointer ${
              autoNext ? 'bg-emerald-500' : 'bg-white/20'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                autoNext ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Home option text link button to go back */}
        <button
          onClick={onMainMenu}
          className="text-white/80 hover:text-white font-extrabold text-xs uppercase tracking-widest py-1.5 px-6 bg-white/10 hover:bg-white/15 rounded-full transition-all duration-150 active:scale-95 cursor-pointer"
        >
          Menu
        </button>
      </div>

    </div>
  );
}
