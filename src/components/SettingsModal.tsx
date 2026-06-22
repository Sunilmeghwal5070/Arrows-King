/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronRight, Settings, HelpCircle, Info, ShieldAlert, Shield, Volume2, VolumeX, Eye } from 'lucide-react';
import { audio } from '../utils/audio';

interface SettingsModalProps {
  onClose: () => void;
  onRemoveAds: () => void;
}

export function SettingsModal({ onClose, onRemoveAds }: SettingsModalProps) {
  const [isMuted, setIsMuted] = useState(audio.isMuted());
  const [adsRemoved, setAdsRemoved] = useState(false);

  const handleToggleSound = () => {
    const nextState = audio.toggleMute();
    setIsMuted(nextState);
    audio.playTap();
  };

  const handleActionRemoveAds = () => {
    onRemoveAds();
    setAdsRemoved(true);
    audio.playHeartRefill();
  };

  return (
    <div className="fixed inset-0 min-h-screen bg-slate-50 flex flex-col p-6 z-50 select-none animate-slideUp overflow-y-auto">
      
      {/* Top Banner Navigation Row */}
      <div className="w-full flex justify-between items-center mb-8 border-b border-slate-100 pb-4 shrink-0">
        <h2 className="text-xl font-bold text-slate-800">Menu & Settings</h2>
        <button
          onClick={onClose}
          className="text-blue-600 font-extrabold text-base hover:text-blue-700 transition"
        >
          Done
        </button>
      </div>

      <div className="w-full max-w-sm mx-auto flex-1 flex flex-col gap-6 justify-start">
        
        {/* Toggle Sound Control in clean container */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl flex items-center justify-center ${isMuted ? 'bg-rose-50 text-rose-500' : 'bg-sky-50 text-sky-500'}`}>
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-700">Game Sounds</span>
              <span className="text-xs font-semibold text-slate-400">Arpeggios and micro-haptics</span>
            </div>
          </div>
          <button
            onClick={handleToggleSound}
            className={`w-14 h-8 rounded-full transition-colors flex items-center p-1 cursor-pointer ${isMuted ? 'bg-slate-200 justify-start' : 'bg-green-500 justify-end'}`}
          >
            <div className="w-6 h-6 bg-white rounded-full shadow-sm" />
          </button>
        </div>

        {/* Menu Items structured 100% like developer screens */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden flex flex-col">
          
          {/* Settings Row */}
          <div className="flex justify-between items-center p-4.5 border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500 text-white">
                <Settings className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-700">Settings</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </div>

          {/* Help Row */}
          <div className="flex justify-between items-center p-4.5 border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500 text-white">
                <HelpCircle className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-700">Help</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </div>

          {/* About Game Row */}
          <div className="flex justify-between items-center p-4.5 border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-600 text-white">
                <Info className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-700">About Game</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </div>

          {/* Privacy Rights Row */}
          <div className="flex justify-between items-center p-4.5 border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500 text-white">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-700">Privacy Rights</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </div>

          {/* Privacy Preferences Row */}
          <div className="flex justify-between items-center p-4.5 hover:bg-slate-50 transition cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500 text-white">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-700">Privacy Preferences</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </div>

        </div>

        {/* Remove Ads Row - massive separate button */}
        <button
          onClick={handleActionRemoveAds}
          disabled={adsRemoved}
          className={`w-full bg-white rounded-2xl p-5 shadow-xs border border-slate-100 flex justify-between items-center transition-all ${adsRemoved ? 'opacity-60 grayscale' : 'hover:bg-slate-50/50 active:scale-98'}`}
        >
          <div className="flex items-center gap-3 text-left">
            <div className="p-2.5 rounded-xl bg-rose-500 text-white">
              <Eye className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-700">
                {adsRemoved ? 'Ads Disabled Forever' : 'Remove Advertisements'}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                No interstitial interruptions
              </span>
            </div>
          </div>
          <span className="text-xs font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full">
            {adsRemoved ? 'Removed' : '$0.00 Free'}
          </span>
        </button>

      </div>
    </div>
  );
}
