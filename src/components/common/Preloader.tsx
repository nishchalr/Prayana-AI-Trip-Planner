import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface PreloaderProps {
  onStartExit: () => void;
  onComplete?: () => void;
}

const TELEMETRY_STAGES = [
  '[01/04] INITIALIZING BIOMETRIC WEARABLE TELEMETRY...',
  '[02/04] COMPILING TOPOLOGICAL TERRAIN VECTORS...',
  '[03/04] CALIBRATING LIQUID CHROME SPECULAR ENGINE...',
  '[04/04] PRAYANA ARCHITECTURAL OS READY.',
];

export const Preloader: React.FC<PreloaderProps> = ({ onStartExit, onComplete }) => {
  const [progress, setProgress] = useState<number>(0);
  const [stageIndex, setStageIndex] = useState<number>(0);
  const exitedRef = useRef<boolean>(false);

  const triggerExit = useCallback(() => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    onStartExit();
  }, [onStartExit]);

  useEffect(() => {
    const DURATION = 1350; // 1.35 seconds smooth continuous startup
    let rafId: number;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / DURATION);
      // Cubic bezier ease-out curve [0.22, 1, 0.36, 1] approximation:
      // 1 - (1 - t)^3 provides smooth acceleration into a gradual deceleration at 100%
      const eased = 1 - Math.pow(1 - t, 3);
      const pct = Math.min(100, Math.round(eased * 100));

      setProgress(pct);

      if (pct < 28) setStageIndex(0);
      else if (pct < 60) setStageIndex(1);
      else if (pct < 88) setStageIndex(2);
      else setStageIndex(3);

      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        triggerExit();
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [triggerExit]);

  return (
    <motion.div
      initial={{ y: '0%' }}
      exit={{ y: '-100%', transition: { duration: 0.65, ease: [0.76, 0, 0.24, 1] } }}
      style={{ willChange: 'transform' }}
      onClick={triggerExit}
      className="fixed inset-0 z-[100] w-screen h-screen bg-[#0E0E0E] flex flex-col items-center justify-between p-8 select-none cursor-pointer overflow-hidden"
    >
      {/* Background Architectural Grid Lines */}
      <div className="absolute inset-0 arch-grid-bg opacity-40 pointer-events-none" />

      {/* Top Header Rail */}
      <div className="relative z-10 w-full flex items-center justify-between font-mono text-[12px] text-ink-muted uppercase tracking-widest border-b border-[rgba(242,240,235,0.1)] pb-3">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#F2F0EB] animate-pulse" />
          <span className="text-ink-primary font-bold">PRAYANA // BOOT_SEQUENCE</span>
        </div>
        <div className="text-[11px] text-ink-secondary hover:text-ink-primary transition-colors">
          [ CLICK ANYWHERE TO SKIP ↵ ]
        </div>
      </div>

      {/* Center: Precision Compass Rose & Prayana Medallion */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
          {/* Outer Rotating Compass Ring with Ticks (GPU accelerated transform: rotate) */}
          <motion.svg
            animate={{ rotate: 360 }}
            transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
            style={{ willChange: 'transform' }}
            viewBox="0 0 260 260"
            className="absolute inset-0 w-full h-full text-[rgba(242,240,235,0.25)] pointer-events-none"
          >
            {/* Outer Circular Track */}
            <circle cx="130" cy="130" r="124" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="130" cy="130" r="116" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />

            {/* 12 Radial Ticks */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const x1 = 130 + Math.cos(angle) * 116;
              const y1 = 130 + Math.sin(angle) * 116;
              const x2 = 130 + Math.cos(angle) * 124;
              const y2 = 130 + Math.sin(angle) * 124;
              return (
                <line
                  key={`tick-${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  strokeWidth={i % 3 === 0 ? '1.5' : '0.8'}
                  opacity={i % 3 === 0 ? '1' : '0.5'}
                />
              );
            })}
          </motion.svg>

          {/* Counter-Rotating Inner Precision Reticle (GPU accelerated transform: rotate) */}
          <motion.svg
            animate={{ rotate: -360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            style={{ willChange: 'transform' }}
            viewBox="0 0 200 200"
            className="absolute w-48 h-48 sm:w-56 sm:h-56 text-[rgba(242,240,235,0.35)] pointer-events-none"
          >
            <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="0.8" />
            {/* Crosshair Hairlines */}
            <line x1="100" y1="4" x2="100" y2="18" stroke="currentColor" strokeWidth="1.2" />
            <line x1="100" y1="182" x2="100" y2="196" stroke="currentColor" strokeWidth="1.2" />
            <line x1="4" y1="100" x2="18" y2="100" stroke="currentColor" strokeWidth="1.2" />
            <line x1="182" y1="100" x2="196" y2="100" stroke="currentColor" strokeWidth="1.2" />
          </motion.svg>

          {/* Center Prayana Medallion Emblem */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-2 ring-[#F2F0EB]/30 shadow-[0_0_36px_rgba(242,240,235,0.22)] bg-[#0E0E0E] flex items-center justify-center"
          >
            <img
              src="/prayana-logo.png"
              alt="Prayana Official Logo"
              className="w-[185%] h-[185%] max-w-none object-cover object-[center_34%] pointer-events-none"
            />
          </motion.div>
        </div>

        {/* Brand Name Title */}
        <h1 className="font-serif text-3xl sm:text-4xl text-[#F2F0EB] tracking-tight mt-6">
          Prayana
        </h1>
        <div className="font-mono text-[11px] uppercase tracking-wideHud text-ink-secondary mt-1">
          Architectural Travel Operating System
        </div>

        {/* Animated Continuous Progress Metric */}
        <div className="mt-6 flex flex-col items-center">
          <div className="font-mono text-2xl sm:text-3xl font-bold tracking-widest text-[#F2F0EB]">
            {progress.toString().padStart(3, '0')}%
          </div>

          {/* Hairline Progress Meter Bar (GPU scaleX animation with zero layout reflows) */}
          <div className="w-56 sm:w-64 h-[2px] bg-[#222222] overflow-hidden mt-2 relative">
            <div
              className="h-full w-full bg-[#F2F0EB]"
              style={{
                transformOrigin: 'left',
                transform: `scaleX(${progress / 100})`,
                willChange: 'transform',
              }}
            />
          </div>

          {/* Telemetry Stage Message */}
          <div className="font-mono text-[11px] tracking-widest text-ink-muted uppercase mt-3 h-4 text-center">
            {TELEMETRY_STAGES[stageIndex]}
          </div>
        </div>
      </div>

      {/* Bottom Legal / Engine Attribution */}
      <div className="relative z-10 w-full flex items-center justify-between font-mono text-[11px] text-ink-muted uppercase tracking-widest border-t border-[rgba(242,240,235,0.1)] pt-3">
        <span>EST. 2026 // BRUTALIST ARCHITECTURAL NOIR</span>
        <span>GOOGLE HEALTH · PRAYANA AI · SPECULAR CHROME 3D</span>
      </div>
    </motion.div>
  );
};
