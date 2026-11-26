import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { PrayanaLogo } from './PrayanaLogo';
import {
  attachCompassAudioUnlockListeners,
  playCompassTick,
  unlockCompassAudio,
} from '../../utils/compassAudio';

interface CompassLoaderProps {
  theme?: 'light' | 'dark';
  variant?: 'fullscreen' | 'overlay' | 'inline';
  statusText?: string;
  className?: string;
}

const CLICK_MILESTONES = [18, 36, 54, 72, 88, 100];

/**
 * Interactive canvas grid that smoothly bends radially outward around the
 * center Prayana logo and follows the live pointer, adapted from MechanicalGrid.
 */
const BendingGridCanvas: React.FC<{ isLight: boolean; compact?: boolean }> = ({
  isLight,
  compact = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let width = 0;
    let height = 0;
    const startTime = performance.now();

    const resize = () => {
      const parent = canvas.parentElement;
      width = parent ? parent.clientWidth : window.innerWidth;
      height = parent ? parent.clientHeight : window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };
    const onPointerLeave = () => {
      pointerRef.current.active = false;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);

    const GRID = 48;
    const STEP = 18;
    const CENTER_RADIUS = compact ? 130 : 210;
    const CURSOR_RADIUS = 175;

    const warpPoint = (px: number, py: number, elapsedSec: number) => {
      let wx = px;
      let wy = py;
      const cx = width / 2;
      const cy = height / 2;

      // Radial gravitational warp around center logo + subtle breathing wave
      const cdx = wx - cx;
      const cdy = wy - cy;
      const cDist = Math.sqrt(cdx * cdx + cdy * cdy) || 0.001;
      if (cDist < CENTER_RADIUS) {
        const t = 1 - cDist / CENTER_RADIUS;
        const pulse = 1 + 0.14 * Math.sin(elapsedSec * 3.2);
        const push = Math.pow(t, 1.55) * (compact ? 11 : 20) * pulse;
        wx += (cdx / cDist) * push;
        wy += (cdy / cDist) * push;
      }

      // Secondary radial warp around active cursor
      const p = pointerRef.current;
      if (p.active) {
        const pdx = wx - p.x;
        const pdy = wy - p.y;
        const pDist = Math.sqrt(pdx * pdx + pdy * pdy) || 0.001;
        if (pDist < CURSOR_RADIUS) {
          const t = 1 - pDist / CURSOR_RADIUS;
          const push = Math.pow(t, 1.6) * 14;
          wx += (pdx / pDist) * push;
          wy += (pdy / pDist) * push;
        }
      }

      return [wx, wy];
    };

    const draw = (now: number) => {
      const elapsedSec = (now - startTime) / 1000;
      ctx.clearRect(0, 0, width, height);

      const baseLineAlpha = isLight
        ? compact
          ? 0.09
          : 0.14
        : compact
        ? 0.055
        : 0.085;
      const strokeRgb = isLight ? '14, 14, 14' : '242, 240, 235';
      ctx.strokeStyle = `rgba(${strokeRgb}, ${baseLineAlpha})`;
      ctx.lineWidth = 1;

      const cols = Math.ceil(width / GRID);
      const rows = Math.ceil(height / GRID);

      for (let i = 0; i <= cols; i += 1) {
        const x = i * GRID;
        ctx.beginPath();
        for (let y = 0; y <= height; y += STEP) {
          const [wx, wy] = warpPoint(x, y, elapsedSec);
          if (y === 0) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.stroke();
      }

      for (let j = 0; j <= rows; j += 1) {
        const y = j * GRID;
        ctx.beginPath();
        for (let x = 0; x <= width; x += STEP) {
          const [wx, wy] = warpPoint(x, y, elapsedSec);
          if (x === 0) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.stroke();
      }

      // Precision node crossmarks (+) near focal zones
      const nodeAlpha = isLight ? (compact ? 0.14 : 0.24) : 0.18;
      ctx.strokeStyle = `rgba(${strokeRgb}, ${nodeAlpha})`;
      for (let i = 1; i < cols; i += 1) {
        for (let j = 1; j < rows; j += 1) {
          const [wx, wy] = warpPoint(i * GRID, j * GRID, elapsedSec);
          ctx.beginPath();
          ctx.moveTo(wx - 2.5, wy);
          ctx.lineTo(wx + 2.5, wy);
          ctx.moveTo(wx, wy - 2.5);
          ctx.lineTo(wx, wy + 2.5);
          ctx.stroke();
        }
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [isLight, compact]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 w-full h-full"
    />
  );
};

export const CompassLoader: React.FC<CompassLoaderProps> = ({
  theme = 'dark',
  variant = 'fullscreen',
  statusText,
  className = '',
}) => {
  const isLight = theme === 'light';
  const [progress, setProgress] = useState<number>(0);
  const firedMilestonesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    attachCompassAudioUnlockListeners();
    void unlockCompassAudio(false);
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
      const t = Math.max(0, Math.min(1, (now - startTime) / DURATION_MS));
      const eased = 1 - Math.pow(1 - t, 2.4);
      const pct = Math.max(0, Math.min(100, Math.round(eased * 100)));
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

  const borderSubtle = isLight ? 'rgba(14, 14, 14, 0.16)' : 'rgba(242, 240, 235, 0.14)';
  const borderStrong = isLight ? 'rgba(14, 14, 14, 0.38)' : 'rgba(242, 240, 235, 0.36)';
  const bezelPrimary = isLight ? '#111111' : '#F2F0EB';
  const bezelMuted = isLight ? 'rgba(17, 17, 17, 0.24)' : 'rgba(242, 240, 235, 0.24)';

  // Compact translucent 'overlay' and 'inline' variants for in-app operations
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
            ? 'bg-[#F4F3EF]/72 text-[#111111]'
            : 'bg-[#0E0E0E]/60 text-[#F2F0EB]'
        } ${className}`}
      >
        <BendingGridCanvas isLight={isLight} compact />

        <div className="relative z-10 flex flex-col items-center space-y-3">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <motion.svg
              viewBox="0 0 120 120"
              className="absolute inset-0 w-full h-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
              style={{ willChange: 'transform' }}
            >
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke={bezelMuted}
                strokeWidth="3.5"
                strokeDasharray="24 10 8 10"
              />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke={bezelPrimary}
                strokeWidth="3.5"
                strokeDasharray="42 298"
                strokeLinecap="round"
              />
            </motion.svg>
            <motion.svg
              viewBox="0 0 120 120"
              className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)]"
              animate={{ rotate: -360 }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'linear' }}
              style={{ willChange: 'transform' }}
            >
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={borderStrong}
                strokeWidth="2.5"
                strokeDasharray="16 14 4 14"
              />
            </motion.svg>
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
              <PrayanaLogo className="w-12 h-12" showRing />
            </motion.div>
          </div>

          <div className="font-mono text-[11px] sm:text-xs tracking-[0.16em] uppercase font-bold text-center">
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
      {/* Interactive Bending Mechanical Grid Canvas */}
      <BendingGridCanvas isLight={isLight} />

      {/* Sweeping Calibration Hairlines */}
      <motion.div
        animate={{ y: ['-10vh', '110vh'] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
        style={{
          willChange: 'transform',
          backgroundColor: isLight ? 'rgba(14, 14, 14, 0.14)' : 'rgba(242, 240, 235, 0.10)',
        }}
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
      />
      <motion.div
        animate={{ x: ['-10vw', '110vw'] }}
        transition={{ duration: 4.1, repeat: Infinity, ease: 'linear' }}
        style={{
          willChange: 'transform',
          backgroundColor: isLight ? 'rgba(14, 14, 14, 0.12)' : 'rgba(242, 240, 235, 0.08)',
        }}
        className="pointer-events-none absolute inset-y-0 left-0 w-px"
      />

      {/* Animated Corner Registration Brackets ┌ ┐ └ ┘ */}
      <motion.div
        animate={{ opacity: [0.45, 0.9, 0.45] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute inset-4 sm:inset-6 font-mono text-base leading-none z-10 flex flex-col justify-between"
        style={{ color: borderStrong }}
      >
        <div className="flex justify-between">
          <span>┌</span>
          <span>┐</span>
        </div>
        <div className="flex justify-between">
          <span>└</span>
          <span>┘</span>
        </div>
      </motion.div>

      {/* Top Architectural Header Bar (Mute Toggle Removed) */}
      <div
        className="relative z-20 w-full flex items-center justify-between font-mono text-[11px] tracking-widest uppercase border-b pb-3"
        style={{ borderColor: borderSubtle }}
      >
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-semantic-nominal animate-pulse" />
          <span className="font-semibold">PRAYANA // BOOT_SEQUENCE</span>
        </div>

        <span className="opacity-75">CORRIDOR TELEMETRY</span>
      </div>

      {/* Center Outlined PrayanaLogo + Thick Counter-Rotating Compass Bezels + 0% -> 100% Counter */}
      <div className="relative z-20 flex flex-col items-center justify-center my-auto space-y-6">
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
          {/* Outer Thick Segmented Compass Bezel + Degree Ring (clockwise) */}
          <motion.svg
            viewBox="0 0 220 220"
            className="absolute inset-0 w-full h-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            style={{ willChange: 'transform' }}
          >
            {/* Base thick segmented bezel */}
            <circle
              cx="110"
              cy="110"
              r="100"
              fill="none"
              stroke={bezelMuted}
              strokeWidth="4"
              strokeDasharray="36 12 10 12"
            />
            {/* Sweeping highlight arc */}
            <circle
              cx="110"
              cy="110"
              r="100"
              fill="none"
              stroke={bezelPrimary}
              strokeWidth="4"
              strokeDasharray="75 554"
              strokeLinecap="butt"
            />
            {/* 12 degree ticks around the outer ring */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = i * 30;
              const isCardinal = i % 3 === 0;
              return (
                <line
                  key={i}
                  x1="110"
                  y1={isCardinal ? '4' : '8'}
                  x2="110"
                  y2="16"
                  stroke={i === 0 ? '#10B981' : bezelPrimary}
                  strokeWidth={isCardinal ? '3' : '1.5'}
                  transform={`rotate(${angle} 110 110)`}
                />
              );
            })}
          </motion.svg>

          {/* Counter-Rotating Inner Segmented Arc (counter-clockwise -360°) */}
          <motion.svg
            viewBox="0 0 220 220"
            className="absolute inset-3 w-[calc(100%-24px)] h-[calc(100%-24px)]"
            animate={{ rotate: -360 }}
            transition={{ duration: 7.5, repeat: Infinity, ease: 'linear' }}
            style={{ willChange: 'transform' }}
          >
            <circle
              cx="110"
              cy="110"
              r="94"
              fill="none"
              stroke={borderStrong}
              strokeWidth="2.5"
              strokeDasharray="48 22 14 22"
            />
            <circle
              cx="110"
              cy="110"
              r="94"
              fill="none"
              stroke={bezelPrimary}
              strokeWidth="2.5"
              strokeDasharray="55 536"
              strokeLinecap="round"
            />
          </motion.svg>

          {/* Fixed Cardinal N / E / S / W Markers */}
          <div className="pointer-events-none absolute inset-0 font-mono text-[10px] font-bold tracking-widest">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-semantic-nominal">N</span>
            <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 opacity-70">S</span>
            <span className="absolute top-1/2 -right-3.5 -translate-y-1/2 opacity-70">E</span>
            <span className="absolute top-1/2 -left-3.5 -translate-y-1/2 opacity-70">W</span>
          </div>

          {/* Large Centered Rocking PrayanaLogo (w-28 h-28 sm:w-32 sm:h-32) */}
          <motion.div
            animate={{ rotate: [-16, 14, -10, 6, -3, 0] }}
            transition={{
              duration: 1.35,
              times: [0, 0.2, 0.4, 0.6, 0.82, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{ willChange: 'transform' }}
            className="relative z-10"
          >
            <PrayanaLogo className="w-28 h-28 sm:w-32 sm:h-32" showRing />
          </motion.div>
        </div>

        <div className="text-center space-y-2.5">
          <div className="font-mono text-3xl sm:text-4xl font-semibold tracking-[0.2em] tabular-nums">
            {String(progress).padStart(3, '0')}%
          </div>
          <div className="font-mono text-xs tracking-[0.2em] uppercase opacity-80">
            [ {statusText || 'INITIALIZING CORRIDOR ENGINE...'} ]
          </div>
        </div>
      </div>

      {/* Bottom Precision Telemetry Line */}
      <div
        className="relative z-20 w-full flex items-center justify-between font-mono text-[11px] tracking-widest uppercase opacity-75 border-t pt-2.5"
        style={{ borderColor: borderSubtle }}
      >
        <span>LOC. 15°19&apos;N 76°27&apos;E</span>
        <span>LOCAL CACHE &amp; CLOUD SYNC</span>
      </div>
    </div>
  );
};
