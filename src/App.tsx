/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { GameScreen, ArrowPath, LevelConfig } from './types';
import { getLevelConfig, getSolvableArrows } from './utils/levels';
import { GameBoard } from './components/GameBoard';
import { MenuScreen } from './components/MenuScreen';
import { LevelCompleteModal } from './components/LevelCompleteModal';
import { OutOfLivesModal } from './components/OutOfLivesModal';
import { SettingsModal } from './components/SettingsModal';
import { audio } from './utils/audio';

// Icons
import { ChevronLeft, RotateCcw, Lightbulb, Settings, Heart, Send, Sparkles, RefreshCw, HeartCrack, Lock, Home } from 'lucide-react';

function isValidSavedState(saved: any): boolean {
  if (!saved) return false;
  try {
    if (typeof saved.levelNumber !== 'number' || isNaN(saved.levelNumber)) return false;
    if (typeof saved.screen !== 'string') return false;
    if (!Array.isArray(saved.activePaths) || saved.activePaths.length === 0) return false;
    for (const path of saved.activePaths) {
      if (!path || typeof path.id !== 'string') return false;
      if (!Array.isArray(path.points) || path.points.length === 0) return false;
      for (const pt of path.points) {
        if (typeof pt.x !== 'number' || isNaN(pt.x)) return false;
        if (typeof pt.y !== 'number' || isNaN(pt.y)) return false;
      }
      if (!path.exitDirection || !['U', 'D', 'L', 'R'].includes(path.exitDirection)) return false;
      if (!path.animState || typeof path.animState.type !== 'string') return false;
    }
    return true;
  } catch {
    return false;
  }
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<any, any> {
  state = {
    hasError: false,
    error: null as any
  };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 text-center select-none font-sans">
          <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mb-4 border border-rose-500/40">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-2xl font-black tracking-tight mb-2 col-span-full">Something Went Wrong</h2>
          <p className="text-slate-400 text-sm max-w-sm mb-6">
            An unexpected error occurred while loading the game state. Tap the button below to factory reset and play freshly!
          </p>
          <button
            onClick={this.handleReset}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-3.5 rounded-2xl shadow-lg transition-transform active:scale-95 cursor-pointer uppercase tracking-wider text-xs"
          >
            Factory Reset & Play
          </button>
          {this.state.error && (
            <p className="text-[10px] text-slate-500 font-mono mt-8 bg-slate-950 p-3 rounded-lg max-w-xs overflow-auto text-left max-h-32">
              {String(this.state.error)}
            </p>
          )}
        </div>
      );
    }

    return (this as any).props.children;
  }
}

function AppInner() {
  // Load unified saved state if available to support mid-game recovery!
  const savedState = (() => {
    try {
      const savedStr = localStorage.getItem('arrow_puzzle_midgame_save');
      if (!savedStr) return null;
      const parsed = JSON.parse(savedStr);
      if (isValidSavedState(parsed)) {
        return parsed;
      } else {
        localStorage.removeItem('arrow_puzzle_midgame_save');
        return null;
      }
    } catch {
      return null;
    }
  })();

  const [screen, setScreen] = useState<GameScreen>(() => {
    if (savedState && (savedState.screen === 'GAMEPLAY' || savedState.screen === 'DAILY_SCREEN')) {
      return savedState.screen;
    }
    return 'MENU';
  });
  
  // Game Progression
  const [levelNumber, setLevelNumber] = useState<number>(() => {
    if (savedState && typeof savedState.levelNumber === 'number' && !isNaN(savedState.levelNumber)) {
      return savedState.levelNumber;
    }
    try {
      const persisted = localStorage.getItem('arrow_puzzle_lvl');
      if (persisted) {
        const parsed = parseInt(persisted, 10);
        return isNaN(parsed) || parsed < 1 ? 1 : parsed;
      }
      return 1;
    } catch {
      return 1;
    }
  });

  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState<number>(() => {
    try {
      const persisted = localStorage.getItem('arrow_puzzle_max_unlocked');
      if (persisted) {
        const parsed = parseInt(persisted, 10);
        return isNaN(parsed) || parsed < 1 ? 1 : parsed;
      }
      return 1;
    } catch {
      return 1;
    }
  });

  const [currentConfig, setCurrentConfig] = useState<LevelConfig | null>(() => {
    let lvlNum = 1;
    if (savedState && typeof savedState.levelNumber === 'number' && !isNaN(savedState.levelNumber)) {
      lvlNum = savedState.levelNumber;
    } else {
      try {
        const persisted = localStorage.getItem('arrow_puzzle_lvl');
        if (persisted) {
          const parsed = parseInt(persisted, 10);
          lvlNum = isNaN(parsed) || parsed < 1 ? 1 : parsed;
        } else {
          lvlNum = 1;
        }
      } catch {
        lvlNum = 1;
      }
    }
    return getLevelConfig(lvlNum);
  });

  const [activePaths, setActivePaths] = useState<ArrowPath[]>(() => {
    if (savedState && Array.isArray(savedState.activePaths) && savedState.activePaths.length > 0) {
      return savedState.activePaths;
    }
    return [];
  });
  
  // Player Stats
  const [lives, setLives] = useState<number>(() => {
    if (savedState && typeof savedState.lives === 'number' && !isNaN(savedState.lives)) {
      return savedState.lives;
    }
    return 3;
  });

  const [movesLeft, setMovesLeft] = useState<number>(() => {
    if (savedState && typeof savedState.movesLeft === 'number' && !isNaN(savedState.movesLeft)) {
      return savedState.movesLeft;
    }
    return 10;
  });

  const [hintsCount, setHintsCount] = useState<number>(() => {
    try {
      const persisted = localStorage.getItem('arrow_puzzle_hints');
      if (persisted !== null) {
        const parsed = parseInt(persisted, 10);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    } catch {
      return 0;
    }
  });
  const [justEarnedHint, setJustEarnedHint] = useState(false);
  const [levelsPlayedSinceLastHint, setLevelsPlayedSinceLastHint] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('arrow_puzzle_levels_since_hint');
      if (saved) {
        const parsed = parseInt(saved, 10);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    } catch {
      return 0;
    }
  });
  
  // Interface Toggles
  const [showGridLines, setShowGridLines] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showLivesModal, setShowLivesModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clearedToast, setClearedToast] = useState<{ text: string; emoji: string } | null>(null);
  const [autoNext, setAutoNext] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('arrow_puzzle_auto_next');
      return saved === 'true'; // Defaults to false (OFF) exactly as requested so they can customize toggling it on/off!
    } catch {
      return false;
    }
  });

  // Sync autoNext setting to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('arrow_puzzle_auto_next', String(autoNext));
    } catch (e) {
      console.warn('Storage disabled', e);
    }
  }, [autoNext]);

  // Persistence Sync
  useEffect(() => {
    try {
      localStorage.setItem('arrow_puzzle_lvl', levelNumber.toString());
    } catch (e) {
      console.warn('Storage disabled', e);
    }
  }, [levelNumber]);

  useEffect(() => {
    try {
      localStorage.setItem('arrow_puzzle_max_unlocked', maxUnlockedLevel.toString());
    } catch (e) {
      console.warn('Storage disabled', e);
    }
  }, [maxUnlockedLevel]);

  useEffect(() => {
    try {
      localStorage.setItem('arrow_puzzle_hints', hintsCount.toString());
    } catch (e) {
      console.warn('Storage disabled', e);
    }
  }, [hintsCount]);

  // Midgame Save Persistence Sync
  useEffect(() => {
    try {
      localStorage.setItem('arrow_puzzle_midgame_save', JSON.stringify({
        levelNumber,
        activePaths,
        lives,
        movesLeft,
        screen,
      }));
    } catch (e) {
      console.warn('Storage disabled', e);
    }
  }, [levelNumber, activePaths, lives, movesLeft, screen]);

  // Load level on start or level change
  const loadLevel = (lvlNum: number, isDaily = false) => {
    const config = getLevelConfig(lvlNum);
    setCurrentConfig(config);
    // Deep copy initial paths to manage layout state
    const copiedPaths = JSON.parse(JSON.stringify(config.paths));
    setActivePaths(copiedPaths);
    setMovesLeft(config.maxMoves);
    setLives(3); // Reset lives to 3 on every level start!
    // Hints count is persistent, no reset to 3 here!
    setShowCompleteModal(false);
    setShowLivesModal(false);
    setErrorMessage(null);
    setJustEarnedHint(false); // Reset hint reward highlight status
  };

  const handleStartGame = () => {
    try {
      const savedStr = localStorage.getItem('arrow_puzzle_midgame_save');
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        if (
          saved.levelNumber === levelNumber &&
          saved.activePaths &&
          saved.activePaths.length > 0 &&
          saved.activePaths.some((p: any) => p.animState.type !== 'escaping')
        ) {
          // Resume saved state exactly!
          const config = getLevelConfig(levelNumber);
          setCurrentConfig(config);
          setActivePaths(saved.activePaths);
          setLives(saved.lives ?? 3);
          setMovesLeft(saved.movesLeft ?? config.maxMoves);
          setScreen('GAMEPLAY');
          audio.playTap();
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to resume saved game", e);
    }

    loadLevel(levelNumber);
    setScreen('GAMEPLAY');
    audio.playTap();
  };

  const handlePlayDailyChallenge = () => {
    // Generate special daily level number based on date values
    const day = new Date().getDate();
    const dailyLvl = 50 + day; // e.g. level 51 to 81

    try {
      const savedStr = localStorage.getItem('arrow_puzzle_midgame_save');
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        if (
          saved.levelNumber === dailyLvl &&
          saved.activePaths &&
          saved.activePaths.length > 0 &&
          saved.activePaths.some((p: any) => p.animState.type !== 'escaping') &&
          saved.screen === 'DAILY_SCREEN'
        ) {
          // Resume saved daily challenge state!
          const config = getLevelConfig(dailyLvl);
          setCurrentConfig(config);
          setActivePaths(saved.activePaths);
          setLives(saved.lives ?? 3);
          setMovesLeft(saved.movesLeft ?? config.maxMoves);
          setScreen('DAILY_SCREEN');
          audio.playTap();
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to resume saved daily game", e);
    }

    loadLevel(dailyLvl, true);
    setScreen('DAILY_SCREEN');
    audio.playTap();
  };

  // Lose 1 Health block on blocker collisions
  const handleLoseLife = () => {
    setLives((prev) => {
      const next = prev - 1;
      
      // Play satisfying custom shatter/heartcrack audio!
      audio.playHeartBreak();

      if (next <= 0) {
        // Trigger Out Of Lives modal delay to let bump finish
        setTimeout(() => {
          setShowLivesModal(true);
        }, 500);
      }
      return next;
    });
  };

  // Lose 1 move count
  const handleLoseMove = () => {
    setMovesLeft((prev) => {
      const next = prev - 1;
      if (next <= 0 && activePaths.length > 0) {
        setTimeout(() => {
          setErrorMessage('Out of moves! Tap restart to try again.');
          audio.playGameOver();
        }, 0);
      }
      return next;
    });
  };

  const handleRestartLevel = () => {
    if (!currentConfig) return;
    loadLevel(currentConfig.levelNumber);
    setLives(3); // Refill hearts to 3!
    setErrorMessage(null); // Dismiss out of moves or other errors!
    setShowLivesModal(false); // Close out of lives modal dialog!
    audio.playTap();
  };

  // Safe refilling triggers from simulating rewards
  const handleRefillLives = () => {
    setLives(3);
    setShowLivesModal(false);
    setErrorMessage(null);
    audio.playHeartRefill();
  };

  // Clear level completion win
  const handleLevelSuccess = () => {
    const nextLvl = levelNumber + 1;
    let earned = false;

    if (screen !== 'DAILY_SCREEN') {
      if (nextLvl > maxUnlockedLevel) {
        setMaxUnlockedLevel(nextLvl);
      }
      
      // Hint Rewards:
      // As requested, hints are not granted every level. Instead, the hint option is awarded
      // only after completing 3 normal gameplay levels!
      const currentConsecutive = levelsPlayedSinceLastHint + 1;
      if (currentConsecutive >= 3) {
        earned = true;
        setHintsCount((prev) => prev + 1);
        setLevelsPlayedSinceLastHint(0);
        try {
          localStorage.setItem('arrow_puzzle_levels_since_hint', '0');
        } catch {}
      } else {
        earned = false;
        setLevelsPlayedSinceLastHint(currentConsecutive);
        try {
          localStorage.setItem('arrow_puzzle_levels_since_hint', String(currentConsecutive));
        } catch {}
      }
    }

    setJustEarnedHint(earned);

    const praises = [
      { text: 'Nice Work!', emoji: '👏' },
      { text: 'Impressive!', emoji: '🤠' },
      { text: 'Outstanding!', emoji: '😊' },
      { text: 'Brilliant!', emoji: '⭐' },
      { text: 'Excellent!', emoji: '💯' }
    ];
    const picked = praises[Math.floor(Math.random() * praises.length)];
    setClearedToast(picked);
    audio.playLevelUp();

    setTimeout(() => {
      setClearedToast(null);
      setShowCompleteModal(true);
    }, 1800); // 1.8 seconds of intermediate congratulations toast, then show the grand LevelCompleteModal
  };

  // Progress to next tier
  const handleNextGame = () => {
    if (screen === 'DAILY_SCREEN') {
      // Return back to standard path
      setScreen('MENU');
    } else {
      const nextLvl = levelNumber + 1;
      if (nextLvl > maxUnlockedLevel) {
        setMaxUnlockedLevel(nextLvl);
      }
      setLevelNumber(nextLvl);
      loadLevel(nextLvl);
    }
    setShowCompleteModal(false);
    audio.playTap();
  };

  // Render Hint Highlight - finds a solvable arrow and flashes its glow halo!
  const handleTriggerHint = () => {
    if (hintsCount <= 0 || activePaths.length === 0) {
      audio.playCrash();
      return;
    }

    if (!currentConfig) return;
    
    // Find all arrow paths that are currently solvable
    const solvable = getSolvableArrows(activePaths, currentConfig.gridWidth, currentConfig.gridHeight);
    
    if (solvable.length > 0) {
      // Pick the first solvable path
      const chosenId = solvable[0];
      const updated = activePaths.map((p) => {
        if (p.id === chosenId) {
          return { ...p, isHint: true };
        }
        return p;
      });
      setActivePaths(updated);
      setHintsCount((c) => c - 1);
      audio.playEscape();

      // Clear hint status after 3 seconds
      setTimeout(() => {
        setActivePaths((prev) =>
          prev.map((p) => (p.id === chosenId ? { ...p, isHint: false } : p))
        );
      }, 3500);
    } else {
      // Loop locked or no hints available
      setErrorMessage('No valid moves left! Tap Reset.');
      audio.playCrash();
    }
  };

  // Monitor level completion when board is successfully cleared
  useEffect(() => {
    // A level is cleared when there are no more active, non-escaping arrows left
    const isCleared = activePaths.length > 0 && activePaths.filter((p) => p.animState.type !== 'escaping').length === 0;

    if (
      (screen === 'GAMEPLAY' || screen === 'DAILY_SCREEN') &&
      currentConfig &&
      isCleared &&
      currentConfig.paths.length > 0 &&
      !showCompleteModal &&
      !clearedToast
    ) {
      handleLevelSuccess();
    }
  }, [activePaths, screen, currentConfig, showCompleteModal, clearedToast]);

  // Render the primary gameplay frame
  const renderGameplay = (titleStr: string, isDailyChallenge = false) => {
    if (!currentConfig) return null;

    return (
      <div className="flex flex-col min-h-screen bg-white pb-16 relative overflow-hidden select-none">
        
        {/* Clean, Single-Row Header matching video precisely */}
        <div className="w-full max-w-xl mx-auto flex items-center justify-between px-6 py-4 z-10 shrink-0">
          
          {/* Left Arrow count + Home button */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setScreen('MENU');
                audio.playTap();
              }}
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-full text-xs font-black shadow-xs transition transform active:scale-95 cursor-pointer border border-slate-200/50"
              title="Go Home"
            >
              <Home className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="text-[11px] uppercase font-black tracking-wide">Home</span>
            </button>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-full shadow-xs" title="Remaining arrows to escape">
              <Send className="w-3 h-3 text-[#1e2540] fill-current rotate-45 animate-pulse" />
              <span className="text-xs font-black text-[#1e2540] leading-none">
                {activePaths.filter((p) => p.animState.type !== 'escaping').length}
              </span>
            </div>
          </div>

          {/* Center: Directly show heart shapes (no text label "lives"), exact user request */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((heartVal) => {
              const isFilled = heartVal <= lives;
              const isJustBroken = heartVal === lives + 1;

              if (isJustBroken) {
                return (
                  <HeartCrack
                    key={heartVal}
                    className="w-5 h-5 text-rose-500 fill-rose-500 animate-heartBreak drop-shadow-xs"
                  />
                );
              }

              return (
                <Heart
                  key={heartVal}
                  className={`w-5 h-5 transition-all duration-300 ${
                    isFilled 
                      ? 'text-rose-500 fill-rose-500 scale-110 drop-shadow-[0_2px_4px_rgba(244,63,94,0.3)] animate-pulse' 
                      : 'text-slate-200 fill-slate-50/50 scale-90 opacity-30'
                  }`}
                />
              );
            })}
          </div>

          {/* Right: Level Tag Group */}
          <div className="flex items-center gap-1.5">
            <div className="bg-slate-100 text-slate-700 font-extrabold text-[11.5px] uppercase tracking-wider px-3.5 py-1.5 rounded-full border border-slate-200/50">
              Lvl {currentConfig.levelNumber}
            </div>
          </div>

        </div>

        {/* Active Design Pattern Title Header */}
        <div className="w-full text-center mt-1 px-6 z-10 shrink-0">
          <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-[0.25em] block mb-0.5">
            Active Layout Pattern
          </span>
          <h2 className="text-xl font-black text-[#1e2540] tracking-tight">
            {currentConfig.title || 'Symmetric Alignment'}
          </h2>
        </div>

        {/* Primary Interactive Board */}
        <div className="flex-1 flex flex-col justify-center items-center px-4 py-2 mt-4 z-10 relative">
          <GameBoard
            key={currentConfig.levelNumber}
            gridWidth={currentConfig.gridWidth}
            gridHeight={currentConfig.gridHeight}
            paths={activePaths}
            levelNumber={currentConfig.levelNumber}
            onPathsChange={setActivePaths}
            onSuccess={handleLevelSuccess}
            onLoseLife={handleLoseLife}
            onLoseMove={handleLoseMove}
            showGridLines={showGridLines}
            movesLeft={movesLeft}
            onArrowClick={() => setShowGridLines(false)}
          />

          {/* Toast Overlay for Level praise, exactly as requested in Image 1, 2, 5 */}
          {clearedToast && (
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 bg-white rounded-3xl p-6 shadow-[0_15px_40px_rgba(30,41,59,0.22)] border border-slate-50 flex flex-col items-center justify-center text-center z-40 animate-scaleUpCentered">
              {/* Circular Emoji container with white border */}
              <div className="absolute -top-11 w-20 h-20 bg-white border-4 border-slate-50 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex items-center justify-center text-4xl select-none">
                {clearedToast.emoji}
              </div>
              <h4 className="text-3xl font-black text-blue-600 tracking-tight mt-6 select-none">
                {clearedToast.text}
              </h4>
            </div>
          )}

          {/* Out of moves alert message box */}
          {errorMessage && (
            <div className="mt-4 bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs py-3.5 px-6 rounded-2xl shadow-sm text-center max-w-xs animate-shake">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Bottom Floating circular trigger action buttons */}
        <div className="w-full max-w-sm mx-auto flex justify-center items-center gap-6 px-6 shrink-0 z-10">
          
          {/* Restart Level circular button */}
          <button
            onClick={handleRestartLevel}
            className="w-14 h-14 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-800 shadow-md hover:shadow-lg transition transform active:scale-95 cursor-pointer"
            title="Restart Level"
          >
            <RotateCcw className="w-6 h-6 stroke-[2.5]" />
          </button>

          {/* Toggle Grid Lines / Alignment Hashtag button */}
          <button
            onClick={() => {
              setShowGridLines(!showGridLines);
              audio.playTap();
            }}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition transform active:scale-95 cursor-pointer border ${
              showGridLines 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'bg-white border-slate-100 text-slate-500 hover:text-slate-700'
            }`}
            title="Toggle Alignment Dots"
          >
            <span className="text-xl font-black">#</span>
          </button>

          {/* Lightbulb Hint circular button / Locked icon depending on maxUnlockedLevel */}
          {maxUnlockedLevel === 1 ? (
            <button
              onClick={() => {
                audio.playCrash();
                setErrorMessage('Hints are locked! Complete Level 1 to unlock hints.');
                setTimeout(() => setErrorMessage(null), 3000);
              }}
              className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition transform active:scale-95 cursor-pointer text-slate-400 relative"
              title="Hints are locked! Complete Level 1 to unlock hints."
            >
              <Lightbulb className="w-6 h-6 stroke-[2.2] opacity-25" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-slate-700/95 text-white p-1 rounded-full shadow-md scale-95 border border-slate-600">
                  <Lock className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>
            </button>
          ) : (
            <button
              onClick={handleTriggerHint}
              disabled={hintsCount <= 0}
              className={`w-14 h-14 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition transform active:scale-95 cursor-pointer relative ${
                hintsCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-300 opacity-50'
              }`}
              title={`Get Hint (${hintsCount} available)`}
            >
              <Lightbulb className={`w-6 h-6 stroke-[2.2] ${hintsCount > 0 ? 'fill-amber-100/50' : ''}`} />
              {hintsCount > 0 && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#007cd8] border-2 border-white text-white font-black text-[10px] rounded-full flex items-center justify-center shadow-sm">
                  {hintsCount}
                </div>
              )}
            </button>
          )}

        </div>

        {/* Victory completion full overlay */}
        {showCompleteModal && (
          <LevelCompleteModal
            levelNumber={currentConfig.levelNumber}
            paths={currentConfig.paths}
            gridWidth={currentConfig.gridWidth}
            gridHeight={currentConfig.gridHeight}
            isDaily={screen === 'DAILY_SCREEN'}
            onNextGame={handleNextGame}
            earnedHint={justEarnedHint}
            autoNext={autoNext}
            setAutoNext={setAutoNext}
            onMainMenu={() => {
              setScreen('MENU');
              setShowCompleteModal(false);
              audio.playTap();
            }}
          />
        )}

        {/* Fail out of health lives overlay */}
        {showLivesModal && (
          <OutOfLivesModal
            onRestart={() => {
              handleRefillLives();
              handleRestartLevel();
            }}
          />
        )}

      </div>
    );
  };

  // Main navigation portal router
  switch (screen) {
    case 'GAMEPLAY':
      return renderGameplay('Puzzle Board', false);

    case 'DAILY_SCREEN':
      return renderGameplay('Daily Challenge', true);

    case 'SETTINGS':
      return (
        <SettingsModal
          onClose={() => {
            setScreen('GAMEPLAY');
            audio.playTap();
          }}
          onRemoveAds={() => {
            setHintsCount(5); // Reward free hints
          }}
        />
      );

    case 'MENU':
    default:
      return (
        <MenuScreen
          currentLevel={levelNumber}
          maxUnlockedLevel={maxUnlockedLevel}
          onStartGame={handleStartGame}
          onSetScreen={setScreen}
          onPlayDailyChallenge={handlePlayDailyChallenge}
          onSelectLevel={(lvl) => {
            setLevelNumber(lvl);
            loadLevel(lvl);
            setScreen('GAMEPLAY');
            audio.playTap();
          }}
          onResetProgress={() => {
            setMaxUnlockedLevel(1);
            setLevelNumber(1);
            try {
              localStorage.removeItem('arrow_puzzle_midgame_save');
              localStorage.setItem('arrow_puzzle_hints', '0');
              localStorage.setItem('arrow_puzzle_levels_since_hint', '0');
            } catch {}
            setHintsCount(0);
            setLevelsPlayedSinceLastHint(0);
            localStorage.setItem('arrow_puzzle_max_unlocked', '1');
            localStorage.setItem('arrow_puzzle_lvl', '1');
            // Load Level 1 configurations freshly
            loadLevel(1);
            setScreen('MENU');
            audio.playCrash();
          }}
        />
      );
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
