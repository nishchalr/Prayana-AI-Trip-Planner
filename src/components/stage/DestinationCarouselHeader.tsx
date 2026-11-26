import React from 'react';
import { usePrayana } from '../../context/PrayanaContext';
import { INITIAL_DESTINATIONS } from '../../data/mockData';
import { motion, AnimatePresence } from 'framer-motion';
import { FLUID_CAROUSEL_SPRING } from '../../motion/fluidTokens';

export const DestinationCarouselHeader: React.FC = () => {
  const { destinations, activeDestinationId, setActiveDestinationId, theme } = usePrayana();
  const isLight = theme === 'light';

  const safeDests = destinations && destinations.length > 0 ? destinations : INITIAL_DESTINATIONS;
  const rawIdx = safeDests.findIndex(d => d.id === activeDestinationId);
  const currentIndex = rawIdx >= 0 ? rawIdx : 0;

  // Circular navigation — always show prev & next
  const getAt = (offset: number) => {
    const idx = (currentIndex + offset + safeDests.length) % safeDests.length;
    return safeDests[idx] || safeDests[0];
  };

  const prevDest = getAt(-1);
  const currentDest = safeDests[currentIndex] || safeDests[0];
  const nextDest = getAt(1);

  return (
    <div className="relative z-20 w-full pt-4 pb-2 px-6 flex flex-col items-center justify-center select-none">
      {/* Editorial Destination Marquee: Prev ← Active → Next */}
      <div className="w-full max-w-5xl flex items-baseline justify-between md:justify-center md:space-x-16 lg:space-x-28">

        {/* Previous Destination */}
        <motion.button
          type="button"
          onClick={() => setActiveDestinationId(prevDest.id)}
          whileHover={{ scale: 1.025, x: -2 }}
          whileTap={{ scale: 0.96 }}
          transition={FLUID_CAROUSEL_SPRING}
          className="group text-left md:text-center transition-colors duration-150 focus:outline-none cursor-pointer"
          style={{ willChange: 'transform' }}
        >
          <span className={`font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight transition-colors inline-block ${
            isLight
              ? 'text-[#4A4945] group-hover:text-[#8A8882]'
              : 'text-[#4A4945] group-hover:text-[#8A8882]'
          }`}>
            {prevDest.name}
          </span>
          <div className={`font-mono text-[11px] uppercase tracking-widest flex items-center justify-start md:justify-center space-x-1 mt-0.5 transition-colors ${
            isLight
              ? 'text-[#8A8882] group-hover:text-[#4A4945]'
              : 'text-[#4A4945] group-hover:text-[#8A8882]'
          }`}>
            <span>[← PREV]</span>
          </div>
        </motion.button>

        {/* Current Active Destination — big serif centrepiece */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={currentDest.id}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={FLUID_CAROUSEL_SPRING}
            className="text-center shrink-0"
            style={{ willChange: 'transform, opacity' }}
          >
            <h1 className={`font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-[var(--ink-primary)] leading-none ${
              isLight ? '' : 'drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]'
            }`}>
              {currentDest.name}
            </h1>
            <div className="font-mono text-[12px] tracking-wideHud uppercase text-[var(--ink-secondary)] mt-1">
              {currentDest.region} · {currentDest.historicalPeriod}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Next Destination */}
        <motion.button
          type="button"
          onClick={() => setActiveDestinationId(nextDest.id)}
          whileHover={{ scale: 1.025, x: 2 }}
          whileTap={{ scale: 0.96 }}
          transition={FLUID_CAROUSEL_SPRING}
          className="group text-right md:text-center transition-colors duration-150 focus:outline-none cursor-pointer"
          style={{ willChange: 'transform' }}
        >
          <span className={`font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight transition-colors inline-block ${
            isLight
              ? 'text-[#4A4945] group-hover:text-[#8A8882]'
              : 'text-[#4A4945] group-hover:text-[#8A8882]'
          }`}>
            {nextDest.name}
          </span>
          <div className={`font-mono text-[11px] uppercase tracking-widest flex items-center justify-end md:justify-center space-x-1 mt-0.5 transition-colors ${
            isLight
              ? 'text-[#8A8882] group-hover:text-[#4A4945]'
              : 'text-[#4A4945] group-hover:text-[#8A8882]'
          }`}>
            <span>[NEXT →]</span>
          </div>
        </motion.button>
      </div>
    </div>
  );
};
