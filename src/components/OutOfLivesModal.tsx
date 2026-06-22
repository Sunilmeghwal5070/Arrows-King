/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Heart, RotateCcw } from 'lucide-react';

interface OutOfLivesModalProps {
  onRestart: () => void;
}

export function OutOfLivesModal({
  onRestart,
}: OutOfLivesModalProps) {
  return (
    <div className="fixed inset-0 min-h-screen bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-50 animate-fadeIn">
      {/* Centered dialog container */}
      <div className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl text-center flex flex-col items-center gap-7 transform animate-scaleUp">
        
        {/* Title statement */}
        <h2 className="text-3xl font-black font-sans tracking-tight text-[#1e2540]">
          Out of Lives!
        </h2>

        {/* Big Heart pop graphic element */}
        <div className="relative flex items-center justify-center">
          
          {/* Circular halo backing container */}
          <div className="w-40 h-40 rounded-full bg-slate-50 flex items-center justify-center animate-pulse shadow-inner relative border border-slate-100">
            {/* Massive red broken heart graphic */}
            <Heart className="w-20 h-20 text-rose-300 fill-transparent stroke-[2] drop-shadow-md" />
          </div>
        </div>

        {/* Option action rows */}
        <div className="w-full flex flex-col gap-3.5">
          {/* Quick direct restart action */}
          <button
            onClick={onRestart}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-blue-500/15 active:scale-98 transition-all flex items-center justify-center gap-2 text-base"
          >
            <RotateCcw className="w-5 h-5 stroke-[2.5]" /> Restart Level
          </button>
        </div>

      </div>
    </div>
  );
}

