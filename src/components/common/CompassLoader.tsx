import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { PrayanaLogo } from './PrayanaLogo';
import {
  attachCompassAudioUnlockListeners,
  isCompassAudioUnlocked,
  isCompassSoundMuted,
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

const CLICK_MILESTONES = [18, 36, 54, 72, 88, 100];

export const CompassLoader: React.FC<CompassLoaderProps> = ({
  theme = 'dark',
  variant = 'fullscreen',
  statusText,
  className = '',
}) => {
  const isLight = theme === 'light';
  const [progress, setProgress] = useState<number>(0);
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(() => isCompassAudioUnlocked());
  const [soundMuted, setSoundMuted] = useState<boolean>(() => isCompassSoundMuted());
  const firedMilestonesRef = useRef<Set<number>>(new Set());

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

  // Animate crisp 0% -> 100% progress over ~1400ms on fullscreen startup
  useEffect(() => {
    if (variant !== 'fullscreen') return;

    firedMilestonesRef.current = new Set();
    setProgress(0);
    const DURATION_MS = 1350;
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 2.4);
      const pct = Math.min(100, Math.round(eased * 100));
      setProgress(pct);

      for (const milestone of CLICK_MILESTONES) {
        if (pct >= milestone && !firedMilestonesRef.current.has(milestone)) {
          firedMilestonesRef.current.add(milestone);
          playCompassTick();
          break;
        }
      }

      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
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

  const gridLine = isLight
    ? variant === 'fullscreen'
      ? 'rgba(14, 14, 14, 0.14)'
      : 'rgba(14, 14, 14, 0.08)'
    : variant === 'fullscreen'
    ? 'rgba(242, 240, 235, 0.06)'
    : 'rgba(242, 240, 235, 0.045)';

  const borderSubtle = isLight ? 'rgba(14, 14, 14, 0.14)' : 'rgba(242, 240, 235, 0.14)';
  const borderButton = isLight ? 'rgba(14, 14, 14, 0.24)' : 'rgba(242, 240, 235, 0.24)';

  const soundLabel = soundMuted
    ? '[ SOUND: MUTED ]'
    : audioUnlocked
    ? '[ SOUND: ON ]'
    : '[ SOUND: TAP TO ENABLE ]';

  // Compact translucent 'overlay' and 'inline' variants for in-app operations
  if (variant !== 'fullscreen') {
    const isOverlay = variant === 'overlay';
    return (
      <div
        className={`${
          isOverlay
            ? 'absolute inset-0 z-30 backdrop-blur-sm'
            : 'relative w-full min-h-[156px] border border-[var(--hairline)] backdrop-blur-sm'
        } flex flex-col items-center justify-center p-5 overflow-hidden select-none transition-colors duration-200 ${
          isLight
            ? 'bg-[#F4F3EF]/72 text-[#111111]'
            : 'bg-[#0E0E0E]/60 text-[#F2F0EB]'
        } ${className}`}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundSize: '48px 48px',
            backgroundImage: `linear-gradient(to right, ${gridLine} 1px, transparent 1px), linear-gradient(to bottom, ${gridLine} 1px, transparent 1px)`,
          }}
        />

        <div className="relative z-10 flex flex-col items-center space-y-3">
          <motion.div
            animate={{ rotate: [-12, 10, -7, 4, -2, 0] }}
            transition={{
              duration: 1.4,
              times: [0, 0.2, 0.4, 0.6, 0.82, 1],
              ease: [0.22, 1, 0.36, 1],
              repeat: Infinity,
              repeatDelay: 0.25,
            }}
            style={{ willChange: 'transform' }}
          >
            <PrayanaLogo className="w-10 h-10" showRing />
          </motion.div>

          <div className="font-mono text-[9px] sm:text-[10px] tracking-[0.16em] uppercase font-bold text-center">
            [ {statusText || 'INITIALIZING CORRIDOR ENGINE...'} ]
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
      {/* 48px Architectural Coordinate Grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundSize: '48px 48px',
          backgroundImage: `linear-gradient(to right, ${gridLine} 1px, transparent 1px), linear-gradient(to bottom, ${gridLine} 1px, transparent 1px)`,
        }}
      />

      {/* Top Architectural Header Bar */}
      <div
        className="relative z-10 w-full flex items-center justify-between font-mono text-[9px] sm:text-[10px] tracking-widest uppercase border-b pb-3"
        style={{ borderColor: borderSubtle }}
      >
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-semantic-nominal animate-pulse" />
          <span>PRAYANA // BOOT_SEQUENCE</span>
        </div>

        <button
          type="button"
          data-sound-toggle="true"
          onClick={handleSoundButton}
          className="px-2.5 py-1 border flex items-center space-x-1.5 cursor-pointer transition-colors hover:opacity-85"
          style={{
            borderColor: borderButton,
            backgroundColor: isLight ? '#FFFFFF' : '#151515',
            color: isLight ? '#111111' : '#F2F0EB',
          }}
        >
          {soundMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          <span>{soundLabel}</span>
        </button>
      </div>

      {/* Center Clean Rocking PrayanaLogo & 0% -> 100% Counter */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto space-y-5">
        <motion.div
          animate={{ rotate: [-16, 14, -10, 6, -3, 0] }}
          transition={{
            duration: 1.35,
            times: [0, 0.2, 0.4, 0.6, 0.82, 1],
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{ willChange: 'transform' }}
        >
          <PrayanaLogo className="w-20 h-20" showRing />
        </motion.div>

        <div className="text-center space-y-2">
          <div className="font-mono text-2xl sm:text-3xl font-bold tracking-[0.18em] tabular-nums">
            {String(progress).padStart(3, '0')}%
          </div>
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-75">
            [ {statusText || 'INITIALIZING CORRIDOR ENGINE...'} ]
          </div>
        </div>
      </div>

      {/* Bottom Precision Telemetry Line */}
      <div
        className="relative z-10 w-full flex items-center justify-between font-mono text-[8px] tracking-widest uppercase opacity-65 border-t pt-2.5"
        style={{ borderColor: borderSubtle }}
      >
        <span>LOC. 15°19&apos;N 76°27&apos;E</span>
        <span>LOCAL CACHE &amp; CLOUD SYNC</span>
      </div>
    </div>
  );
};
