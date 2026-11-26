// Pure mechanical click Web Audio synthesizer (bandpass-filtered white-noise burst, zero tonal oscillators)
// Permanently enabled (non-mutable) and unlocks automatically on first user gesture.

let sharedCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let audioUnlocked = false;
let listenersAttached = false;

const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((cb) => {
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

function getOrCreateNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) {
    return noiseBuffer;
  }
  const length = Math.max(1, Math.floor(ctx.sampleRate * 0.01)); // 10ms burst
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const envelope = Math.exp(-i / (length * 0.28));
    channel[i] = (Math.random() * 2 - 1) * envelope;
  }
  noiseBuffer = buffer;
  return buffer;
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
 * Safely creates/resumes the singleton AudioContext on mount or user gesture
 * with zero console warnings when browser autoplay blocks un-interacted loads.
 */
export async function unlockCompassAudio(playClickOnUnlock = false): Promise<boolean> {
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
    if (audioUnlocked && playClickOnUnlock) {
      playCompassTick();
    }
    return audioUnlocked;
  } catch {
    return false;
  }
}

export function attachCompassAudioUnlockListeners(): void {
  if (typeof window === 'undefined') return;

  // Attempt immediate resume on mount when permitted by browser userActivation
  const navActivation = (navigator as unknown as { userActivation?: { hasBeenActive?: boolean } }).userActivation;
  if (navActivation?.hasBeenActive || (sharedCtx && sharedCtx.state === 'suspended')) {
    void unlockCompassAudio(false);
  }

  if (listenersAttached) return;
  listenersAttached = true;

  const handleFirstGesture = () => {
    void unlockCompassAudio(false).then((ok) => {
      if (ok) {
        window.removeEventListener('pointerdown', handleFirstGesture);
        window.removeEventListener('touchstart', handleFirstGesture);
        window.removeEventListener('keydown', handleFirstGesture);
      }
    });
  };

  window.addEventListener('pointerdown', handleFirstGesture, { passive: true });
  window.addEventListener('touchstart', handleFirstGesture, { passive: true });
  window.addEventListener('keydown', handleFirstGesture, { passive: true });
}

/**
 * Pure mechanical compass click: 10ms white-noise burst through bandpass filter (~2400 Hz, Q = 3.5).
 */
export function playCompassTick(): void {
  if (!sharedCtx || sharedCtx.state !== 'running') return;
  try {
    const now = sharedCtx.currentTime;
    const source = sharedCtx.createBufferSource();
    source.buffer = getOrCreateNoiseBuffer(sharedCtx);

    const filter = sharedCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.Q.setValueAtTime(3.5, now);

    const gain = sharedCtx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(sharedCtx.destination);

    source.start(now);
    source.stop(now + 0.014);
  } catch {
    // ignore Web Audio glitches
  }
}
