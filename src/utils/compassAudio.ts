// Shared singleton Web Audio synthesizer for Prayana's mechanical compass ticks and North-lock chime

let sharedCtx: AudioContext | null = null;
let audioUnlocked = false;
let listenersAttached = false;

const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach(cb => {
    try {
      cb();
    } catch {
      // ignore
    }
  });
}

function getAudioContextClass(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  );
}

export function isCompassSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('prayana_sound_muted') === 'true';
  } catch {
    return false;
  }
}

export function setCompassSoundMuted(muted: boolean): void {
  try {
    localStorage.setItem('prayana_sound_muted', String(muted));
  } catch {
    // ignore
  }
  notifyListeners();
}

export function isCompassAudioUnlocked(): boolean {
  if (sharedCtx && sharedCtx.state === 'running') {
    audioUnlocked = true;
  }
  return audioUnlocked;
}

export function subscribeCompassAudioState(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/**
 * Safely creates/resumes the singleton AudioContext after user gesture (or when userActivation is active)
 * with zero console warnings when browser autoplay blocks un-interacted loads.
 */
export async function unlockCompassAudio(playChimeOnUnlock = false): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const Ctx = getAudioContextClass();
  if (!Ctx) return false;

  try {
    if (!sharedCtx) {
      sharedCtx = new Ctx();
    }
    if (sharedCtx.state === 'suspended') {
      await sharedCtx.resume();
    }
    audioUnlocked = sharedCtx.state === 'running';
    notifyListeners();
    if (audioUnlocked && playChimeOnUnlock && !isCompassSoundMuted()) {
      playCompassLock();
    }
    return audioUnlocked;
  } catch {
    return false;
  }
}

export function attachCompassAudioUnlockListeners(): void {
  if (typeof window === 'undefined' || listenersAttached) return;
  listenersAttached = true;

  // Attempt silent unlock only if browser already records prior user activation
  const navActivation = (navigator as unknown as { userActivation?: { hasBeenActive?: boolean } }).userActivation;
  if (navActivation?.hasBeenActive) {
    void unlockCompassAudio(false);
  }

  const handleFirstGesture = () => {
    void unlockCompassAudio(false).then((ok) => {
      if (ok) {
        window.removeEventListener('pointerdown', handleFirstGesture);
        window.removeEventListener('keydown', handleFirstGesture);
      }
    });
  };

  window.addEventListener('pointerdown', handleFirstGesture, { passive: true });
  window.addEventListener('keydown', handleFirstGesture, { passive: true });
}

/**
 * Crisp mechanical compass escapement tick (triangle + short sine click transient, gainPeak = 0.14).
 */
export function playCompassTick(): void {
  if (isCompassSoundMuted() || !sharedCtx || sharedCtx.state !== 'running') return;
  try {
    const now = sharedCtx.currentTime;

    // Mechanical body tick
    const tri = sharedCtx.createOscillator();
    const triGain = sharedCtx.createGain();
    tri.type = 'triangle';
    tri.frequency.setValueAtTime(1850, now);
    tri.frequency.exponentialRampToValueAtTime(680, now + 0.024);
    triGain.gain.setValueAtTime(0.0001, now);
    triGain.gain.linearRampToValueAtTime(0.14, now + 0.003);
    triGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);
    tri.connect(triGain);
    triGain.connect(sharedCtx.destination);
    tri.start(now);
    tri.stop(now + 0.032);

    // Crisp escapement click transient
    const click = sharedCtx.createOscillator();
    const clickGain = sharedCtx.createGain();
    click.type = 'sine';
    click.frequency.setValueAtTime(3200, now);
    click.frequency.exponentialRampToValueAtTime(1200, now + 0.01);
    clickGain.gain.setValueAtTime(0.0001, now);
    clickGain.gain.linearRampToValueAtTime(0.08, now + 0.002);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.014);
    click.connect(clickGain);
    clickGain.connect(sharedCtx.destination);
    click.start(now);
    click.stop(now + 0.016);
  } catch {
    // ignore Web Audio glitches
  }
}

/**
 * Resonant dual-harmonic brass lock chime on 000° North lock (gainPeak = 0.16).
 */
export function playCompassLock(): void {
  if (isCompassSoundMuted() || !sharedCtx || sharedCtx.state !== 'running') return;
  try {
    const now = sharedCtx.currentTime;
    const harmonics = [
      { type: 'sine' as OscillatorType, freq: 880, peak: 0.16, duration: 0.52 },
      { type: 'triangle' as OscillatorType, freq: 1320, peak: 0.09, duration: 0.44 },
    ];

    harmonics.forEach(h => {
      if (!sharedCtx) return;
      const osc = sharedCtx.createOscillator();
      const gain = sharedCtx.createGain();
      osc.type = h.type;
      osc.frequency.setValueAtTime(h.freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(h.peak, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + h.duration);
      osc.connect(gain);
      gain.connect(sharedCtx.destination);
      osc.start(now);
      osc.stop(now + h.duration + 0.02);
    });
  } catch {
    // ignore Web Audio glitches
  }
}
