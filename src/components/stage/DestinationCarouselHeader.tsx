import React, { useRef } from 'react';
import { usePrayana } from '../../context/PrayanaContext';
import { INITIAL_DESTINATIONS } from '../../data/mockData';
import { MotionValue, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { FLUID_CAROUSEL_SPRING } from '../../motion/fluidTokens';

interface DestinationCarouselHeaderProps {
  dragX?: MotionValue<number>;
}

export const DestinationCarouselHeader: React.FC<DestinationCarouselHeaderProps> = ({
  dragX: externalDragX,
}) => {
  const { destinations, activeDestinationId, setActiveDestinationId, theme } = usePrayana();
  const isLight = theme === 'light';

  const fallbackDragX = useMotionValue(0);
  const dragX = externalDragX ?? fallbackDragX;

  const safeDests = destinations && destinations.length > 0 ? destinations : INITIAL_DESTINATIONS;
  const rawIdx = safeDests.findIndex((d) => d.id === activeDestinationId);
  const currentIndex = rawIdx >= 0 ? rawIdx : 0;

  const prevDest = safeDests[(currentIndex - 1 + safeDests.length) % safeDests.length] || safeDests[0];
  const currentDest = safeDests[currentIndex] || safeDests[0];
  const nextDest = safeDests[(currentIndex + 1) % safeDests.length] || safeDests[0];

  const swipeRef = useRef<{ active: boolean; startX: number; moved: boolean } | null>(null);

  const activeTranslateX = useTransform(dragX, [-220, 0, 220], [-60, 0, 60]);
  const activeOpacity = useTransform(dragX, [-220, 0, 220], [0.45, 1, 0.45]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement | null)?.closest('button')) return;
    swipeRef.current = { active: true, startX: e.clientX, moved: false };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const s = swipeRef.current;
    if (!s || !s.active) return;
    const dx = e.clientX - s.startX;
    if (Math.abs(dx) > 6) s.moved = true;
    if (s.moved) {
      dragX.set(Math.max(-220, Math.min(220, dx)));
    }
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent) => {
    const s = swipeRef.current;
    swipeRef.current = null;
    if (!s || !s.moved) {
      if (dragX.get() !== 0) void animate(dragX, 0, FLUID_CAROUSEL_SPRING);
      return;
    }
    const dx = e.clientX - s.startX;
    if (dx > 75) {
      setActiveDestinationId(prevDest.id);
    } else if (dx < -75) {
      setActiveDestinationId(nextDest.id);
    }
    void animate(dragX, 0, FLUID_CAROUSEL_SPRING);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      className="relative z-20 shrink-0 w-full pt-2.5 sm:pt-4 pb-1.5 sm:pb-2 flex flex-col items-center justify-center select-none overflow-hidden cursor-grab active:cursor-grabbing"
    >
      {/* Clean Zero-Overlap 3-Column Grid (Mobile + Desktop always show Prev | Active | Next) */}
      <div className="w-full max-w-5xl grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6 px-3">
        {/* Left: Previous Destination */}
        <button
          type="button"
          onClick={() => setActiveDestinationId(prevDest.id)}
          title={`Previous: ${prevDest.name}`}
          className="group min-w-0 text-left focus:outline-none cursor-pointer"
        >
          <span
            className={`font-serif text-sm sm:text-xl tracking-tight opacity-45 group-hover:opacity-85 transition-opacity block truncate ${
              isLight ? 'text-[#111111]' : 'text-[#F2F0EB]'
            }`}
          >
            {prevDest.name}
          </span>
          <div
            className={`font-mono text-[10px] sm:text-[11px] uppercase tracking-widest flex items-center justify-start mt-0.5 opacity-50 group-hover:opacity-90 transition-opacity ${
              isLight ? 'text-[#4A4945]' : 'text-[#8A8882]'
            }`}
          >
            <span className="sm:hidden">[←]</span>
            <span className="hidden sm:inline">[← PREV]</span>
          </div>
        </button>

        {/* Center: Active Destination */}
        <motion.div
          style={{ x: activeTranslateX, opacity: activeOpacity }}
          className="text-center min-w-0 flex flex-col items-center justify-center pointer-events-none"
        >
          <h1
            style={{ fontSize: 'clamp(1.6rem, 3.8vw, 3.25rem)' }}
            className={`font-serif tracking-tight leading-none max-w-[54vw] sm:max-w-[42vw] truncate ${
              isLight
                ? 'text-[#111111]'
                : 'text-[#F2F0EB] drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]'
            }`}
          >
            {currentDest.name}
          </h1>
          <div
            className={`font-mono text-[10px] sm:text-[11px] tracking-wideHud uppercase mt-1 max-w-[54vw] sm:max-w-[44vw] truncate ${
              isLight ? 'text-[#666666]' : 'text-ink-secondary'
            }`}
          >
            {currentDest.region} · {currentDest.historicalPeriod}
          </div>
        </motion.div>

        {/* Right: Next Destination */}
        <button
          type="button"
          onClick={() => setActiveDestinationId(nextDest.id)}
          title={`Next: ${nextDest.name}`}
          className="group min-w-0 text-right focus:outline-none cursor-pointer"
        >
          <span
            className={`font-serif text-sm sm:text-xl tracking-tight opacity-45 group-hover:opacity-85 transition-opacity block truncate ${
              isLight ? 'text-[#111111]' : 'text-[#F2F0EB]'
            }`}
          >
            {nextDest.name}
          </span>
          <div
            className={`font-mono text-[10px] sm:text-[11px] uppercase tracking-widest flex items-center justify-end mt-0.5 opacity-50 group-hover:opacity-90 transition-opacity ${
              isLight ? 'text-[#4A4945]' : 'text-[#8A8882]'
            }`}
          >
            <span className="sm:hidden">[→]</span>
            <span className="hidden sm:inline">[NEXT →]</span>
          </div>
        </button>
      </div>
    </div>
  );
};
