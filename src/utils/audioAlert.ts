// Web Audio API Synthesizer for CBT Proctor Exam Alerts
// Works without any external audio asset files or network dependencies

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export const audioAlertService = {
  isMuted(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem('cbt_proctor_audio_muted') === 'true';
  },

  setMuted(muted: boolean): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cbt_proctor_audio_muted', muted ? 'true' : 'false');
    }
  },

  // Play two-tone alert chime (High-Low-High alert)
  playStudentExitAlarm(): void {
    if (this.isMuted()) return;

    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Note 1: 880 Hz (A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Note 2: 587.33 Hz (D5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(587.33, now + 0.25);
      gain2.gain.setValueAtTime(0.35, now + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.25);
      osc2.stop(now + 0.58);

      // Note 3: 880 Hz (A5 - High urgent beep)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sawtooth';
      osc3.frequency.setValueAtTime(987.77, now + 0.55); // B5 high tone
      gain3.gain.setValueAtTime(0.25, now + 0.55);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.55);
      osc3.stop(now + 1.0);
    } catch (e) {
      console.warn('Audio alert could not be played:', e);
    }
  },

  // Test sound to allow teachers to verify speakers
  testSound(): void {
    this.playStudentExitAlarm();
  },
};
