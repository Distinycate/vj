/**
 * Sound Effects & Haptics Engine for Vocab Journey
 *
 * Built entirely with standard Web Audio API and Navigator Vibration API.
 * - 0ms latency
 * - Zero external assets or network dependencies
 * - Safe on iOS Safari, Android Chrome, and Desktop browsers
 * - Includes user preference persistence in localStorage
 */

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error';

let audioCtx: AudioContext | null = null;

// Initialize or resume AudioContext safely
const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (e) {
    return null;
  }
};

/**
 * Storage keys
 */
const SOUND_STORAGE_KEY = 'vj_sound_effects_enabled';
const HAPTIC_STORAGE_KEY = 'vj_haptic_enabled';

/**
 * Sound preference getter & setter
 */
export const isSoundEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(SOUND_STORAGE_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
};

export const setSoundEnabled = (enabled: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {}
};

export const toggleSound = (): boolean => {
  const current = isSoundEnabled();
  const next = !current;
  setSoundEnabled(next);
  if (next) {
    playCorrectSound();
  }
  return next;
};

/**
 * Haptic preference getter & setter
 */
export const isHapticEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(HAPTIC_STORAGE_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
};

export const setHapticEnabled = (enabled: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HAPTIC_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {}
};

export const toggleHaptic = (): boolean => {
  const current = isHapticEnabled();
  const next = !current;
  setHapticEnabled(next);
  if (next) {
    triggerHaptic('medium');
  }
  return next;
};

/**
 * Trigger mobile vibration
 */
export const triggerHaptic = (type: HapticType = 'light') => {
  if (typeof window === 'undefined' || !isHapticEnabled()) return;
  if (!('vibrate' in navigator)) return;

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(25);
        break;
      case 'medium':
        navigator.vibrate(45);
        break;
      case 'heavy':
        navigator.vibrate(70);
        break;
      case 'success':
        navigator.vibrate([30, 40, 50]);
        break;
      case 'error':
        navigator.vibrate([60, 40, 70]);
        break;
    }
  } catch {}
};

/**
 * Play cheerful correct answer chime (C5 -> E5 -> G5)
 */
export const playCorrectSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0, now + idx * 0.07);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.07 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.26);
    });

    triggerHaptic('light');
  } catch {}
};

/**
 * Play soft wrong answer thud/buzz (low frequency downward sweep)
 */
export const playWrongSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);

    triggerHaptic('error');
  } catch {}
};

/**
 * Play escalating combo fanfare chords
 */
export const playComboSound = (combo: number) => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const baseFreq = Math.min(880, 523.25 + (combo - 1) * 30);
    const chords = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2];

    chords.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0, now + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.36);
    });

    triggerHaptic('success');
  } catch {}
};

/**
 * Play punchy RPG boss hit impact sound
 */
export const playBossHitSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Sub thump
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.31);

    // High metal snap
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(800, now);
    snapOsc.frequency.exponentialRampToValueAtTime(200, now + 0.15);

    snapGain.gain.setValueAtTime(0.2, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    snapOsc.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapOsc.start(now);
    snapOsc.stop(now + 0.16);

    triggerHaptic('heavy');
  } catch {}
};

/**
 * Play boss counter-attack rumble & roar
 */
export const playBossAttackSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Deep roar rumble
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.45);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.46);

    triggerHaptic('error');
  } catch {}
};

/**
 * Play boss victory triumphant fanfare
 */
export const playBossVictorySound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const melody = [
      { f: 523.25, d: 0.12 }, // C5
      { f: 523.25, d: 0.12 }, // C5
      { f: 523.25, d: 0.12 }, // C5
      { f: 659.25, d: 0.28 }, // E5
      { f: 587.33, d: 0.14 }, // D5
      { f: 783.99, d: 0.45 }, // G5
      { f: 1046.5, d: 0.70 }, // C6
    ];

    let t = now;
    melody.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + note.d + 0.01);

      t += note.d * 0.85;
    });

    triggerHaptic('success');
  } catch {}
};

/**
 * Play clean UI button tap
 */
export const playButtonClickSound = () => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);

    triggerHaptic('light');
  } catch {}
};
