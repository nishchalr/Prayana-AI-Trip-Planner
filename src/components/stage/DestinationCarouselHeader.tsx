import React from 'react';
import { usePrayana } from '../../context/PrayanaContext';
import { INITIAL_DESTINATIONS } from '../../data/mockData';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
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

  // Swipe / Drag handling on header
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 45 || info.velocity.x > 250) {
      setActiveDestinationId(prevDest.id);
    } else if (info.offset.x < -45 || info.velocity.x < -250) {
      setActiveDestinationId(nextDest.id);
    }
  };

  return (
    <div className="relative z-20 w-full pt-2.5 sm:pt-4 pb-1.5 sm:pb-2 px-3 sm:px-6 flex flex-col items-center justify-center select-none overflow-hidden">
      {/* Editorial Destination Marquee: Symmetric on 390px mobile, wide editorial on desktop */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.22}
        onDragEnd={handleDragEnd}
        className="w-full max-w-5xl grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:flex items-center md:items-baseline md:justify-center gap-2 sm:gap-6 md:gap-0 md:space-x-16 lg:space-x-28 cursor-grab active:cursor-grabbing"
      >
        {/* Previous Destination */}
        <button
          type="button"
          onClick={() => setActiveDestinationId(prevDest.id)}
          className="group text-left md:text-center transition-colors duration-150 focus:outline-none cursor-pointer min-w-0"
          title={`Previous: ${prevDest.name}`}
        >
          <span
            className={`font-serif text-lg sm:text-3xl md:text-5xl lg:text-6xl tracking-tight transition-colors block truncate ${
              isLight
                ? 'text-[#8A8882] group-hover:text-[#4A4945]'
                : 'text-[#6A6862] sm:text-[#4A4945] group-hover:text-[#8A8882]'
            }`}
          >
            {prevDest.name}
          </span>
          <div
            className={`font-mono text-[10px] sm:text-[11px] uppercase tracking-widest flex items-center justify-start md:justify-center space-x-1 mt-0.5 transition-colors ${
              isLight
                ? 'text-[#8A8882] group-hover:text-[#4A4945]'
                : 'text-[#6A6862] sm:text-[#4A4945] group-hover:text-[#8A8882]'
            }`}
          >
            <span className="sm:hidden">[←]</span>
            <span className="hidden sm:inline">[← PREV]</span>
          </div>
        </button>

        {/* Current Active Destination */}
        <div className="text-center shrink-0 min-w-0 max-w-[205px] sm:max-w-none px-1">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={currentDest.id}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={FLUID_CAROUSEL_SPRING}
              className="text-center pointer-events-none"
              style={{ willChange: 'transform, opacity' }}
            >
              <h1
                className={`font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight leading-none ${
                  isLight
                    ? 'text-[#111111]'
                    : 'text-[#F2F0EB] drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]'
                }`}
              >
                {currentDest.name}
              </h1>
              <div
                className={`font-mono text-[10px] sm:text-[12px] tracking-wideHud uppercase mt-1 leading-snug whitespace-normal break-words ${
                  isLight ? 'text-[#666666]' : 'text-ink-secondary'
                }`}
              >
                {currentDest.region} · {currentDest.historicalPeriod}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Next Destination */}
        <button
          type="button"
          onClick={() => setActiveDestinationId(nextDest.id)}
          className="group text-right md:text-center transition-colors duration-150 focus:outline-none cursor-pointer min-w-0"
          title={`Next: ${nextDest.name}`}
        >
          <span
            className={`font-serif text-lg sm:text-3xl md:text-5xl lg:text-6xl tracking-tight transition-colors block truncate ${
              isLight
                ? 'text-[#8A8882] group-hover:text-[#4A4945]'
                : 'text-[#6A6862] sm:text-[#4A4945] group-hover:text-[#8A8882]'
            }`}
          >
            {nextDest.name}
          </span>
          <div
            className={`font-mono text-[10px] sm:text-[11px] uppercase tracking-widest flex items-center justify-end md:justify-center space-x-1 mt-0.5 transition-colors ${
              isLight
                ? 'text-[#8A8882] group-hover:text-[#4A4945]'
                : 'text-[#6A6862] sm:text-[#4A4945] group-hover:text-[#8A8882]'
            }`}
          >
            <span className="sm:hidden">[→]</span>
            <span className="hidden sm:inline">[NEXT →]</span>
          </div>
        </button>
      </motion.div>
    </div>
  );
};
