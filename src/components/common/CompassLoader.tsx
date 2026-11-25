import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { PrayanaLogo } from './PrayanaLogo';
import { FLUID_SPRING } from '../../motion/fluidTokens';

interface CompassLoaderProps {
  theme?: 'light' | 'dark';
}

export const CompassLoader: React.FC<CompassLoaderProps> = ({ theme = 'dark' }) => {
  const isLight = theme === 'light';
  const [needleAngle, setNeedleAngle] = useState<number>(-142);
  const [bearingDeg, setBearingDeg] = useState<number>(218);
  const [lockedNorth, setLockedNorth] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('prayana_sound_muted') !== 'true';
    } catch {
      return true;
    }
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef<boolean>(false);

  const ensureAudioContext = (): AudioContext | null => {
    if (typeof window === 'undefined' || !soundEnabled) return null;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      if (!audioCtxRef.current && unlockedRef.current) {
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === 'suspended' && unlockedRef.current) {
        void ctx.resume().catch(() => {});
      }
      return ctx && ctx.state === 'running' ? ctx : null;
    } catch {
      return null;
    }
  };

  const playCompassTick = () => {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1650, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.022);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    } catch {
      // ignore audio errors
    }
  };

  const playBrassLockChime = () => {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [880, 1320].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(idx === 0 ? 0.045 : 0.025, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.48);
      });
    } catch {
      // ignore audio errors
    }
  };

  // Safe first-gesture unlock (zero console warnings before user interaction)
  useEffect(() => {
    const unlock = () => {
      unlockedRef.current = true;
      try {
        if (!audioCtxRef.current && soundEnabled) {
          const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (Ctx) {
            audioCtxRef.current = new Ctx();
          }
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          void audioCtxRef.current.resume().catch(() => {});
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [soundEnabled]);

  // Sweep compass needle and settle smoothly onto North (000°)
  useEffect(() => {
    const sweepSteps = [
      { delay: 40, angle: -96, bearing: 264 },
      { delay: 140, angle: 34, bearing: 34 },
      { delay: 260, angle: -16, bearing: 344 },
      { delay: 390, angle: 6, bearing: 6 },
      { delay: 520, angle: 0, bearing: 0, lock: true },
    ];

    const timers = sweepSteps.map(step =>
      window.setTimeout(() => {
        setNeedleAngle(step.angle);
        setBearingDeg(step.bearing);
        if (step.lock) {
          setLockedNorth(true);
          playBrassLockChime();
        } else {
          playCompassTick();
        }
      }, step.delay)
    );

    return () => {
      timers.forEach(t => window.clearTimeout(t));
    };
  }, []);

  const toggleSound = () => {
    unlockedRef.current = true;
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem('prayana_sound_muted', String(!next));
    } catch {
      // ignore
    }
    if (next) {
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx && !audioCtxRef.current) {
          audioCtxRef.current = new Ctx();
        }
        if (audioCtxRef.current?.state === 'suspended') {
          void audioCtxRef.current.resume().then(() => playBrassLockChime()).catch(() => {});
        } else {
          playBrassLockChime();
        }
      } catch {
        // ignore
      }
    }
  };

  const formattedBearing = String(bearingDeg).padStart(3, '0');
  const strokePrimary = isLight ? '#111111' : '#F2F0EB';
  const strokeMuted = isLight ? 'rgba(17, 17, 17, 0.24)' : 'rgba(242, 240, 235, 0.24)';
  const strokeSubtle = isLight ? 'rgba(17, 17, 17, 0.12)' : 'rgba(242, 240, 235, 0.12)';
  const gridColor = isLight ? 'rgba(17, 17, 17, 0.055)' : 'rgba(242, 240, 235, 0.045)';

  return (
    <div
      className={`relative h-screen w-screen flex flex-col items-center justify-between p-6 sm:p-8 overflow-hidden select-none transition-colors duration-200 ${
        isLight ? 'bg-[#F4F3EF] text-[#111111]' : 'bg-[#0E0E0E] text-[#F2F0EB]'
      }`}
    >
      {/* 48px Architectural Coordinate Grid Backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundSize: '48px 48px',
          backgroundImage: `linear-gradient(to right, ${gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`,
        }}
      />

      {/* Top Architectural Telemetry Strip */}
      <div className="relative z-10 w-full flex items-center justify-between font-mono text-[9px] sm:text-[10px] tracking-widest uppercase border-b pb-3"
        style={{ borderColor: strokeSubtle }}
      >
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-semantic-nominal animate-pulse" />
          <span>SYS.PRYN.COMPASS // HYDRATION_LOCK</span>
        </div>

        <button
          type="button"
          onClick={toggleSound}
          className="px-2.5 py-1 border flex items-center space-x-1.5 cursor-pointer transition-colors hover:opacity-80"
          style={{
            borderColor: strokeMuted,
            backgroundColor: isLight ? '#FFFFFF' : '#151515',
            color: strokePrimary,
          }}
        >
          {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
          <span>{soundEnabled ? '[ SOUND: ON ]' : '[ SOUND: MUTED ]'}</span>
        </button>
      </div>

      {/* Center Precision Compass Dial + Rotating 36-Tick Ring + Emerald Needle + Original PrayanaLogo */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        <div className="relative w-60 h-60 sm:w-68 sm:h-68 flex items-center justify-center">
          {/* Pulsing Dashed Radar Ring */}
          <motion.svg
            animate={{ scale: [0.96, 1.05, 0.96], opacity: [0.35, 0.75, 0.35] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            viewBox="0 0 260 260"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <circle
              cx="130"
              cy="130"
              r="122"
              fill="none"
              stroke={lockedNorth ? '#10B981' : strokeMuted}
              strokeWidth="1"
              strokeDasharray="4 6"
            />
          </motion.svg>

          {/* Outer Rotating 36-Tick SVG Degree Ring */}
          <motion.svg
            animate={{ rotate: 360 }}
            transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
            style={{ willChange: 'transform' }}
            viewBox="0 0 260 260"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <circle cx="130" cy="130" r="106" fill="none" stroke={strokeSubtle} strokeWidth="1" />
            <circle cx="130" cy="130" r="82" fill="none" stroke={strokeSubtle} strokeWidth="0.75" />
            {Array.from({ length: 36 }).map((_, idx) => {
              const deg = idx * 10;
              const isCardinal = deg % 90 === 0;
              const len = isCardinal ? 11 : idx % 3 === 0 ? 7 : 4;
              return (
                <line
                  key={deg}
                  x1="130"
                  y1={24}
                  x2="130"
                  y2={24 + len}
                  stroke={isCardinal ? strokePrimary : strokeMuted}
                  strokeWidth={isCardinal ? 1.5 : 1}
                  transform={`rotate(${deg} 130 130)`}
                />
              );
            })}
          </motion.svg>

          {/* Static Cardinal Markers (N / E / S / W) */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[9px] font-bold tracking-widest">
            <span className="absolute top-2.5 text-semantic-nominal">N</span>
            <span className="absolute right-2.5 opacity-45">E</span>
            <span className="absolute bottom-2.5 opacity-45">S</span>
            <span className="absolute left-2.5 opacity-45">W</span>
          </div>

          {/* Spring-Animated Compass Needle (FLUID_SPRING) with Emerald North Pointer */}
          <motion.svg
            viewBox="0 0 260 260"
            initial={{ rotate: -142 }}
            animate={{ rotate: needleAngle }}
            transition={FLUID_SPRING}
            style={{ willChange: 'transform' }}
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {/* Emerald North Pointer */}
            <polygon points="130,36 135,126 125,126" fill="#10B981" />
            {/* Counterweight South Tail */}
            <polygon points="130,224 134,134 126,134" fill={strokeMuted} />
          </motion.svg>

          {/* Center Original Crisp PrayanaLogo Emblem */}
          <div className="relative z-10">
            <PrayanaLogo className="w-16 h-16" showRing />
          </div>
        </div>

        {/* Status & Live Degree Bearing Readout */}
        <div className="mt-6 text-center space-y-2">
          <div className="font-mono text-xs font-bold tracking-[0.28em] uppercase">
            PRAYANA
          </div>
          <div className="font-mono text-[10px] tracking-[0.18em] uppercase opacity-80 animate-pulse">
            [ INITIALIZING CORRIDOR ENGINE... ]
          </div>
          <div
            className="font-mono text-[9px] tracking-[0.16em] uppercase tabular-nums"
            style={{ color: lockedNorth ? '#10B981' : strokeMuted }}
          >
            BEARING {formattedBearing}° · 15°19&apos;N 76°27&apos;E
          </div>
        </div>
      </div>

      {/* Bottom Precision Footer Line */}
      <div
        className="relative z-10 w-full flex items-center justify-between font-mono text-[8px] tracking-widest uppercase opacity-60 border-t pt-2.5"
        style={{ borderColor: strokeSubtle }}
      >
        <span>ARCH.OS // TOPOLOGICAL ENGINE</span>
        <span>LOCAL CACHE & CLOUD SYNC</span>
      </div>
    </div>
  );
};
