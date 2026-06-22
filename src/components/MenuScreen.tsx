/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameScreen } from '../types';
import { Sparkles, Trophy, User, ArrowRight, Play, Calendar, Lock, RefreshCw, Star } from 'lucide-react';

interface MenuScreenProps {
  currentLevel: number;
  maxUnlockedLevel: number;
  onStartGame: () => void;
  onSetScreen: (screen: GameScreen) => void;
  onPlayDailyChallenge: () => void;
  onSelectLevel: (lvl: number) => void;
  onResetProgress: () => void;
}

export function MenuScreen({
  currentLevel,
  maxUnlockedLevel,
  onStartGame,
  onSetScreen,
  onPlayDailyChallenge,
  onSelectLevel,
  onResetProgress,
}: MenuScreenProps) {
  const [currentDate, setCurrentDate] = useState('');
  const [levelInput, setLevelInput] = useState('');
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
    setCurrentDate(date.toLocaleDateString('en-US', options));
  }, []);

  const handleLevelJump = (e: React.FormEvent) => {
    e.preventDefault();
    const lvl = parseInt(levelInput, 10);
    if (!isNaN(lvl) && lvl >= 1 && lvl <= 10000) {
      if (lvl <= maxUnlockedLevel) {
        onSelectLevel(lvl);
        setErrorMessage(null);
      } else {
        setErrorMessage(`Level ${lvl} is locked! Complete preceding levels first.`);
        setTimeout(() => setErrorMessage(null), 3000);
      }
    }
  };

  // Generate levels for the select grid - securely guarded against NaN to prevent RangeError blank screen exceptions
  const safeMaxUnlocked = (typeof maxUnlockedLevel === 'number' && !isNaN(maxUnlockedLevel)) ? maxUnlockedLevel : 1;
  const levelsCount = Math.max(20, Math.ceil(safeMaxUnlocked / 10) * 10);
  const levels = Array.from({ length: isNaN(levelsCount) || levelsCount < 1 ? 20 : levelsCount }, (_, i) => i + 1);

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-50/50 text-slate-800 px-6 py-6 pb-24 select-none overflow-y-auto relative">
      
      {/* Background drifting subtle watermark arrows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03] z-0">
        <div className="absolute top-10 left-10 text-[9rem] font-black rotate-45">➸</div>
        <div className="absolute bottom-20 right-10 text-[12rem] font-black -rotate-12">➴</div>
        <div className="absolute top-1/3 right-5 text-[8rem] font-black rotate-180">➸</div>
        <div className="absolute bottom-1/3 left-5 text-[11rem] font-black rotate-90">➻</div>
      </div>

      {/* Main Container */}
      <div className="w-full flex-1 flex flex-col items-center z-10 max-w-sm mt-6">
        
        {/* Game Title */}
        <div className="text-center mb-6 flex flex-col gap-1 select-none">
          <h1 className="text-4xl font-black tracking-tight text-[#1e2540] select-none font-sans leading-none flex items-center justify-center gap-1">
            Arrow Puzzle <Sparkles className="w-5 h-5 text-blue-500 fill-blue-105" />
          </h1>
          <span className="text-xs font-bold text-slate-400 select-none tracking-widest uppercase">
            Solve, Slide & Escape
          </span>
        </div>

        {/* Current Active Play Button Card */}
        <div className="w-full bg-white border border-slate-100 p-4 rounded-3xl shadow-xs mb-6 flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider leading-none">Your Progress</span>
              <span className="text-sm font-black text-slate-700 mt-1">Level {currentLevel}</span>
            </div>
            <div className="bg-amber-50 text-amber-600 py-1 px-2.5 rounded-full text-[10px] font-black flex items-center gap-1">
              <Trophy className="w-3 h-3 fill-amber-500" /> Max Unlocked: {maxUnlockedLevel}
            </div>
          </div>
          
          <button
            onClick={onStartGame}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-extrabold py-4 px-6 rounded-2xl shadow-md transform active:scale-95 transition-all flex items-center justify-center gap-2 group border border-blue-400/25 cursor-pointer"
          >
            <span className="text-base tracking-tight font-black uppercase">
              {currentLevel > 1 ? 'Continue Level' : 'Start Puzzle'}
            </span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Quick Reset controls */}
        <div className="w-full flex flex-col gap-2">
          {/* Reset progress action */}
          <div className="w-full mt-2">
            {!showConfirmReset ? (
              <button
                type="button"
                onClick={() => setShowConfirmReset(true)}
                className="w-full text-slate-400 hover:text-rose-500 text-[10px] font-bold uppercase tracking-wider text-center py-2 transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Reset Game Progress
              </button>
            ) : (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 flex flex-col gap-2 items-center text-center animate-scaleUpCentered">
                <span className="text-[10px] font-bold text-rose-700">
                  Really reset progress and levels back to Level 1?
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onResetProgress();
                      setShowConfirmReset(false);
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black py-1.5 px-3.5 rounded-lg uppercase tracking-wider transition cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmReset(false)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-black py-1.5 px-3.5 rounded-lg uppercase tracking-wider transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Profiler block */}
      <div className="w-full max-w-sm flex items-center justify-between p-4 bg-white/70 border border-slate-100 rounded-2xl shadow-xs mt-6 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-100">
            <User className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Player State</span>
            <span className="text-xs font-extrabold text-slate-700 mt-1 leading-none">
              {maxUnlockedLevel > 1 ? `Progress Level ${maxUnlockedLevel}` : 'Rookie Explorer'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-full text-[10px] font-black border border-amber-200/50">
          <Trophy className="w-3.5 h-3.5 fill-current" /> Rookie
        </div>
      </div>

    </div>
  );
}
