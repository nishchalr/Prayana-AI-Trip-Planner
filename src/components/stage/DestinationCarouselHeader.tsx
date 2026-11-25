import React from 'react';
import { usePrayana } from '../../context/PrayanaContext';
import { INITIAL_DESTINATIONS } from '../../data/mockData';
import { motion, AnimatePresence } from 'framer-motion';
import { FLUID_CAROUSEL_SPRING, FLUID_GESTURE_TAP } from '../../motion/fluidTokens';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const DestinationCarouselHeader: React.FC = () => {
  const { destinations, activeDestinationId, setActiveDestinationId, theme } = usePrayana();
  const isLight = theme === 'light';

  const safeDests = destinations && destinations.length > 0 ? destinations : INITIAL_DESTINATIONS;
  const rawIdx = safeDests.findIndex(d => d.id === activeDestinationId);
  const currentIndex = rawIdx >= 0 ? rawIdx : 0;
  const currentDest = safeDests[currentIndex] || safeDests[0];

  const prevDest = currentIndex > 0 ? safeDests[currentIndex - 1] : null;
  const nextDest = currentIndex < safeDests.length - 1 ? safeDests[currentIndex + 1] : null;

  const goTo = (id: string) => setActiveDestinationId(id);

  return (
    <div className="relative z-20 w-full pt-2.5 pb-1.5 px-3 sm:px-6 flex flex-col items-center justify-center select-none gap-2">
      {/* Editorial Prev ← Active → Next strip */}
      <div className="w-full max-w-3xl flex items-center justify-between gap-2">
        {/* Previous destination (left) */}
        <div className="flex-1 flex justify-start">
          {prevDest ? (
            <motion.button
              type="button"
              onClick={() => goTo(prevDest.id)}
              {...FLUID_GESTURE_TAP}
              transition={FLUID_CAROUSEL_SPRING}
              className="flex items-center gap-1 font-mono text-[11px] tracking-widest uppercase text-[var(--ink-muted)] hover:text-[var(--ink-secondary)] transition-colors cursor-pointer group"
              title={`← ${prevDest.name}`}
            >
              <ChevronLeft className="w-3.5 h-3.5 shrink-0 group-hover:-translate-x-0.5 transition-transform" />
              <span className="truncate max-w-[120px] sm:max-w-[180px]">{prevDest.name}</span>
            </motion.button>
          ) : (
            <span className="w-4" />
          )}
        </div>

        {/* Active destination title */}
        <div className="flex-shrink-0 text-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={currentDest.id}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={FLUID_CAROUSEL_SPRING}
              className="text-center"
              style={{ willChange: 'transform, opacity' }}
            >
              <h1
                className={`font-serif text-4xl sm:text-5xl md:text-6xl tracking-tight text-[var(--ink-primary)] leading-none ${
                  isLight ? '' : 'drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]'
                }`}
              >
                {currentDest.name}
              </h1>
              <div className="font-mono text-[11px] sm:text-[12px] tracking-wideHud uppercase text-[var(--ink-secondary)] mt-1">
                {currentDest.region} · {currentDest.historicalPeriod}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Next destination (right) */}
        <div className="flex-1 flex justify-end">
          {nextDest ? (
            <motion.button
              type="button"
              onClick={() => goTo(nextDest.id)}
              {...FLUID_GESTURE_TAP}
              transition={FLUID_CAROUSEL_SPRING}
              className="flex items-center gap-1 font-mono text-[11px] tracking-widest uppercase text-[var(--ink-muted)] hover:text-[var(--ink-secondary)] transition-colors cursor-pointer group"
              title={`${nextDest.name} →`}
            >
              <span className="truncate max-w-[120px] sm:max-w-[180px]">{nextDest.name}</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </motion.button>
          ) : (
            <span className="w-4" />
          )}
        </div>
      </div>
    </div>
  );
};
