import React from 'react';
import { usePrayana } from '../../context/PrayanaContext';
import { INITIAL_DESTINATIONS } from '../../data/mockData';
import { motion } from 'framer-motion';

export const DestinationCarouselHeader: React.FC = () => {
  const { destinations, activeDestinationId, setActiveDestinationId } = usePrayana();

  const safeDests = destinations && destinations.length > 0 ? destinations : INITIAL_DESTINATIONS;
  const rawIdx = safeDests.findIndex(d => d.id === activeDestinationId);
  const currentIndex = rawIdx >= 0 ? rawIdx : 0;

  // Helper to get destination at circular offset (-1, 0, +1)
  const getDestinationAtOffset = (offset: number) => {
    const idx = (currentIndex + offset + safeDests.length) % safeDests.length;
    return safeDests[idx] || safeDests[0];
  };

  const prevDest = getDestinationAtOffset(-1);
  const currentDest = safeDests[currentIndex] || safeDests[0];
  const nextDest = getDestinationAtOffset(1);

  return (
    <div className="relative z-20 w-full pt-4 pb-2 px-6 flex flex-col items-center justify-center select-none">
      {/* Editorial Destination Marquee */}
      <div className="w-full max-w-5xl flex items-baseline justify-between md:justify-center md:space-x-16 lg:space-x-28">
        {/* Previous Destination */}
        <button
          onClick={() => setActiveDestinationId(prevDest.id)}
          className="group text-left md:text-center transition-colors duration-150 hover:text-ink-secondary focus:outline-none cursor-pointer"
        >
          <span className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight text-[#4A4945] group-hover:text-[#8A8882] transition-colors inline-block">
            {prevDest.name}
          </span>
          <div className="font-mono text-[11px] uppercase tracking-widest text-ink-secondary flex items-center justify-start md:justify-center space-x-1 mt-0.5 group-hover:text-ink-primary transition-colors">
            <span>[← PREV]</span>
          </div>
        </button>

        {/* Current Active Destination */}
        <motion.div
          key={currentDest.id}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-[#F2F0EB] drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
            {currentDest.name}
          </h1>
          <div className="font-mono text-[12px] tracking-wideHud uppercase text-ink-secondary mt-1">
            {currentDest.region} · {currentDest.historicalPeriod}
          </div>
        </motion.div>

        {/* Next Destination */}
        <button
          onClick={() => setActiveDestinationId(nextDest.id)}
          className="group text-right md:text-center transition-colors duration-150 hover:text-ink-secondary focus:outline-none cursor-pointer"
        >
          <span className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight text-[#4A4945] group-hover:text-[#8A8882] transition-colors inline-block">
            {nextDest.name}
          </span>
          <div className="font-mono text-[11px] uppercase tracking-widest text-ink-secondary flex items-center justify-end md:justify-center space-x-1 mt-0.5 group-hover:text-ink-primary transition-colors">
            <span>[NEXT →]</span>
          </div>
        </button>
      </div>
    </div>
  );
};
