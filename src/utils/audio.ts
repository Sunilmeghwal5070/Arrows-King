/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// A WebAudio Synthesizer for high-fidelity native game sound effects
class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMutedState = false;

  constructor() {
    // Lazy initialize to avoid blocking page load or requiring user gesture immediately
  }

  toggleMute(): boolean {
    this.isMutedState = !this.isMutedState;
    return this.isMutedState;
  }

  isMuted(): boolean {
    return this.isMutedState;
  }

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playTap() {
    if (this.isMutedState) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      // High quick pop
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.07);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.warn('Audio failure', e);
    }
  }

  playEscape() {
    if (this.isMutedState) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      // Two consecutive happy pings
      const playBell = (freq: number, delay: number, volume: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(volume, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.25);

        osc.start(now + delay);
        osc.stop(now + delay + 0.28);
      };

      playBell(587.33, 0.0, 0.15); // D5
      playBell(880, 0.08, 0.12);  // A5
    } catch (e) {
      console.warn('Audio failure', e);
    }
  }

  playCrash() {
    if (this.isMutedState) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      // Lower frequency buzzer/thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.linearRampToValueAtTime(70, now + 0.18);

      // Low pass filter to make it thud-like
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(250, now);
      
      osc.disconnect(gain);
      osc.connect(filter);
      filter.connect(gain);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.2);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      console.warn('Audio failure', e);
    }
  }

  playLevelUp() {
    if (this.isMutedState) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      // Upward triumphant chord progression (C major arpeggio)
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.07);

        gain.gain.setValueAtTime(0.0, now + index * 0.07);
        gain.gain.linearRampToValueAtTime(0.08, now + index * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.07 + 0.35);

        osc.start(now + index * 0.07);
        osc.stop(now + index * 0.07 + 0.4);
      });
    } catch (e) {
      console.warn('Audio failure', e);
    }
  }

  playGameOver() {
    if (this.isMutedState) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      // Mournful descending progression
      const notes = [587.33, 523.25, 493.88, 440.00, 392.00, 349.23, 293.66]; // Descending
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + index * 0.12);

        // Filter out harsh highs
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(400, now + index * 0.12);
        osc.disconnect(gain);
        osc.connect(f);
        f.connect(gain);

        gain.gain.setValueAtTime(0.12, now + index * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.12 + 0.3);

        osc.start(now + index * 0.12);
        osc.stop(now + index * 0.12 + 0.32);
      });
    } catch (e) {
      console.warn('Audio failure', e);
    }
  }

  playHeartRefill() {
    if (this.isMutedState) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      // Magical harp arpeggio
      const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51, 1760]; // A maj sparkling arpeggio
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + index * 0.04);

        gain.gain.setValueAtTime(0.0, now + index * 0.04);
        gain.gain.linearRampToValueAtTime(0.08, now + index * 0.04 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.04 + 0.25);

        osc.start(now + index * 0.04);
        osc.stop(now + index * 0.04 + 0.3);
      });
    } catch (e) {
      console.warn('Audio failure', e);
    }
  }

  playHeartBreak() {
    if (this.isMutedState) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      // Unhappy high pitch metallic chime followed by low-pitched crack (like shatter)
      const pings = [880, 830.61, 783.99]; // descending sad high bells
      pings.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.12, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.15);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.18);
      });

      // Low pitch shattering thump/crash
      const thosc = ctx.createOscillator();
      const thgain = ctx.createGain();
      thosc.type = 'sawtooth';
      thosc.frequency.setValueAtTime(120, now);
      thosc.frequency.exponentialRampToValueAtTime(45, now + 0.28);

      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(200, now);

      thosc.connect(f);
      f.connect(thgain);
      thgain.connect(ctx.destination);

      thgain.gain.setValueAtTime(0.18, now);
      thgain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      thosc.start(now);
      thosc.stop(now + 0.32);
    } catch (e) {
      console.warn('Audio failure', e);
    }
  }
}

export const audio = new AudioEngine();
