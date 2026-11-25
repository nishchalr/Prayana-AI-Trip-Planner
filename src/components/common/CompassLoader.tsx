import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { PrayanaLogo } from './PrayanaLogo';
import { FLUID_SPRING } from '../../motion/fluidTokens';
import {
  attachCompassAudioUnlockListeners,
  isCompassAudioUnlocked,
  isCompassSoundMuted,
  playCompassLock,
  playCompassTick,
  setCompassSoundMuted,
  subscribeCompassAudioState,
  unlockCompassAudio,
} from '../../utils/compassAudio';

interface CompassLoaderProps {
  theme?: 'light' | 'dark';
  variant?: 'fullscreen' | 'overlay' | 'inline';
  statusText?: string;
  className?: string;
}

export const CompassLoader: React.FC<CompassLoaderProps> = ({
  theme = 'dark',
  variant = 'fullscreen',
  statusText,
  className = '',
}) => {
  const isLight = theme === 'light';
  const [needleAngle, setNeedleAngle] = useState<number>(-142);
  const [bearingDeg, setBearingDeg] = useState<number>(218);
  const [lockedNorth, setLockedNorth] = useState<boolean>(false);
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(() => isCompassAudioUnlocked());
  const [soundMuted, setSoundMuted] = useState<boolean>(() => isCompassSoundMuted());

  useEffect(() => {
    attachCompassAudioUnlockListeners();
    const syncState = () => {
      setAudioUnlocked(isCompassAudioUnlocked());
      setSoundMuted(isCompassSoundMuted());
    };
    const unsubscribe = subscribeCompassAudioState(syncState);
    syncState();
    return unsubscribe;
  }, []);

  // Sweep compass needle smoothly across 1.1s and settle onto North (000°)
  useEffect(() => {
    setNeedleAngle(-142);
    setBearingDeg(218);
    setLockedNorth(false);

    const sweepSteps =
      variant === 'fullscreen'
        ? [
            { delay: 80, angle: -96, bearing: 264 },
            { delay: 280, angle: 34, bearing: 34 },
            { delay: 510, angle: -18, bearing: 342 },
            { delay: 760, angle: 7, bearing: 7 },
            { delay: 1020, angle: 0, bearing: 0, lock: true },
          ]
        : [
            { delay: 60, angle: -72, bearing: 288 },
            { delay: 220, angle: 18, bearing: 18 },
            { delay: 420, angle: 0, bearing: 0, lock: true },
          ];

    const timers = sweepSteps.map(step =>
      window.setTimeout(() => {
        setNeedleAngle(step.angle);
        setBearingDeg(step.bearing);
        if (step.lock) {
          setLockedNorth(true);
          playCompassLock();
        } else {
          playCompassTick();
        }
      }, step.delay)
    );

    return () => {
      timers.forEach(t => window.clearTimeout(t));
    };
  }, [variant]);

  const handleSoundButton = async () => {
    if (!audioUnlocked && !soundMuted) {
      await unlockCompassAudio(true);
      setAudioUnlocked(isCompassAudioUnlocked());
      return;
    }
    const nextMuted = !soundMuted;
    setCompassSoundMuted(nextMuted);
    setSoundMuted(nextMuted);
    if (!nextMuted) {
      await unlockCompassAudio(true);
      setAudioUnlocked(isCompassAudioUnlocked());
    }
  };

  const formattedBearing = String(bearingDeg).padStart(3, '0');
  const strokePrimary = isLight ? '#111111' : '#F2F0EB';
  const strokeMuted = isLight ? 'rgba(17, 17, 17, 0.24)' : 'rgba(242, 240, 235, 0.24)';
  const strokeSubtle = isLight ? 'rgba(17, 17, 17, 0.12)' : 'rgba(242, 240, 235, 0.12)';
  const gridOpacity = variant === 'fullscreen' ? (isLight ? 0.055 : 0.045) : 0.04;
  const gridColor = isLight
    ? `rgba(17, 17, 17, ${gridOpacity})`
    : `rgba(242, 240, 235, ${gridOpacity})`;

  const soundLabel = soundMuted
    ? '[ SOUND: MUTED ]'
    : audioUnlocked
    ? '[ SOUND: ON ]'
    : '[ SOUND: TAP TO ENABLE ]';

  // Compact translucent 'overlay' and 'inline' variants
  if (variant !== 'fullscreen') {
    const isOverlay = variant === 'overlay';
    return (
      <div
        className={`${
          isOverlay
            ? 'absolute inset-0 z-30 backdrop-blur-sm'
            : 'relative w-full min-h-[168px] border border-[var(--hairline)] backdrop-blur-sm'
        } flex flex-col items-center justify-center p-5 overflow-hidden select-none transition-colors duration-200 ${
          isLight
            ? 'bg-[#F4F3EF]/70 text-[#111111]'
            : 'bg-[#0E0E0E]/60 text-[#F2F0EB]'
        } ${className}`}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundSize: '48px 48px',
            backgroundImage: `linear-gradient(to right, ${gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`,
          }}
        />

        <div className="relative z-10 flex flex-col items-center space-y-2.5">
          {/* Compact 96px Compass Dial */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            <motion.svg
              animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.35, 0.75, 0.35] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              viewBox="0 0 120 120"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <circle
                cx="60"
                cy="60"
                r="55"
                fill="none"
                stroke={lockedNorth ? '#10B981' : strokeMuted}
                strokeWidth="1"
                strokeDasharray="3 5"
              />
            </motion.svg>

            <motion.svg
              animate={{ rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
              style={{ willChange: 'transform' }}
              viewBox="0 0 120 120"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <circle cx="60" cy="60" r="46" fill="none" stroke={strokeSubtle} strokeWidth="1" />
              {Array.from({ length: 24 }).map((_, idx) => {
                const deg = idx * 15;
                const isMajor = deg % 90 === 0;
                return (
                  <line
                    key={deg}
                    x1="60"
                    y1={14}
                    x2="60"
                    y2={14 + (isMajor ? 7 : 4)}
                    stroke={isMajor ? strokePrimary : strokeMuted}
                    strokeWidth={isMajor ? 1.4 : 0.9}
                    transform={`rotate(${deg} 60 60)`}
                  />
                );
              })}
            </motion.svg>

            <motion.svg
              viewBox="0 0 120 120"
              initial={{ rotate: -142 }}
              animate={{ rotate: needleAngle }}
              transition={FLUID_SPRING}
              style={{ willChange: 'transform' }}
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <polygon points="60,16 63.5,58 56.5,58" fill="#10B981" />
              <polygon points="60,104 62.5,62 57.5,62" fill={strokeMuted} />
            </motion.svg>

            <div className="relative z-10">
              <PrayanaLogo className="w-8 h-8" showRing />
            </div>
          </div>

          <div className="text-center space-y-1">
            <div className="font-mono text-[9px] sm:text-[10px] tracking-[0.16em] uppercase font-bold">
              [ {statusText || 'CALIBRATING CORRIDOR ENGINE...'} ]
            </div>
            <div
              className="font-mono text-[8px] tracking-widest uppercase tabular-nums"
              style={{ color: lockedNorth ? '#10B981' : strokeMuted }}
            >
              BEARING {formattedBearing}° · LIVE TELEMETRY
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative h-screen w-screen flex flex-col items-center justify-between p-6 sm:p-8 overflow-hidden select-none transition-colors duration-200 ${
        isLight ? 'bg-[#F4F3EF] text-[#111111]' : 'bg-[#0E0E0E] text-[#F2F0EB]'
      } ${className}`}
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
      <div
        className="relative z-10 w-full flex items-center justify-between font-mono text-[9px] sm:text-[10px] tracking-widest uppercase border-b pb-3"
        style={{ borderColor: strokeSubtle }}
      >
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-semantic-nominal animate-pulse" />
          <span>SYS.PRYN.COMPASS // HYDRATION_LOCK</span>
        </div>

        <button
          type="button"
          onClick={handleSoundButton}
          className="px-2.5 py-1 border flex items-center space-x-1.5 cursor-pointer transition-colors hover:opacity-85"
          style={{
            borderColor: strokeMuted,
            backgroundColor: isLight ? '#FFFFFF' : '#151515',
            color: strokePrimary,
          }}
        >
          {soundMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          <span>{soundLabel}</span>
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
            [ {statusText || 'INITIALIZING CORRIDOR ENGINE...'} ]
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
