import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { Mountain, Clock, Bookmark, ArrowRight, Check, Activity } from 'lucide-react';

interface MonolithShelfProps {
  side: 'left' | 'right';
}

export const MonolithShelf: React.FC<MonolithShelfProps> = ({ side }) => {
  const { 
    activeDestination, 
    activeStopId, 
    setActiveStopId, 
    hoveredStopId, 
    setHoveredStopId,
    wishlistIds,
    toggleWishlist,
    setActiveView 
  } = usePrayana();

  // Divide stops safely between left and right racks
  const safeStops = activeDestination?.stops ?? [];
  const half = Math.max(1, Math.ceil(safeStops.length / 2));
  const stops = side === 'left' 
    ? safeStops.slice(0, half) 
    : safeStops.slice(half);

  const handleViewInRoute = (e: React.MouseEvent, stopId: string) => {
    e.stopPropagation();
    setActiveStopId(stopId);
    setActiveView('ITINERARY_OUTPUT');
  };

  const handleToggleSave = (e: React.MouseEvent, stopId: string) => {
    e.stopPropagation();
    toggleWishlist(stopId);
  };

  return (
    <div className={`relative h-full flex flex-col justify-center px-2 sm:px-4 py-6 select-none ${
      side === 'left' ? 'items-end' : 'items-start'
    }`}>
      {/* Shelf Header Tag */}
      <div className={`flex items-center space-x-2 font-mono text-[9px] tracking-widest text-ink-muted uppercase mb-3 ${
        side === 'left' ? 'flex-row' : 'flex-row-reverse'
      }`}>
        <span>{side === 'left' ? '[ WEST CORRIDOR ]' : '[ EAST CORRIDOR ]'}</span>
        <span className="text-[10px] text-ink-secondary">
          {side === 'left' ? '01—04' : '05—08'}
        </span>
      </div>

      {/* Slabs Accordion / Stripe-Press Spines in 3D Perspective */}
      <div className="perspective-stage relative flex items-center space-x-1 sm:space-x-1.5 md:space-x-2.5 max-w-full overflow-visible py-4">
        {stops.map((stop, index) => {
          const isHovered = hoveredStopId === stop.id;
          const isSelected = activeStopId === stop.id;
          const isSaved = Array.isArray(wishlistIds) && wishlistIds.includes(stop.id);

          // Subtle natural shelf rotation angle based on side and index
          const initialRotateY = side === 'left' ? 16 - index * 2 : -16 + index * 2;

          return (
            <div
              key={stop.id}
              className="relative"
              onMouseEnter={() => setHoveredStopId(stop.id)}
              onMouseLeave={() => setHoveredStopId(null)}
              onClick={() => setActiveStopId(isSelected ? null : stop.id)}
            >
              {/* Vertical Monolith Slab / Book Spine */}
              <motion.div
                animate={{
                  scale: isHovered || isSelected ? 1.06 : 1,
                  z: isHovered || isSelected ? 36 : 0,
                  y: isHovered || isSelected ? -14 : 0,
                  rotateY: isHovered || isSelected ? (side === 'left' ? 10 : -10) : initialRotateY,
                }}
                whileTap={{ scale: 0.985 }}
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 24,
                }}
                className={`metallic-sheen relative w-7 sm:w-8 md:w-9 lg:w-10 h-64 sm:h-72 md:h-80 cursor-pointer rounded-none border transition-colors flex flex-col justify-between p-1.5 overflow-hidden shadow-2xl ${
                  isSelected
                    ? 'border-[#F2F0EB] bg-[#222222] shadow-[0_12px_32px_rgba(242,240,235,0.15)] ring-1 ring-[#F2F0EB]/30'
                    : isHovered
                    ? 'border-[#F2F0EB] bg-[#1C1C1C] shadow-[0_14px_36px_rgba(0,0,0,0.95)]'
                    : 'border-[rgba(242,240,235,0.14)] bg-[#141414] hover:border-ink-secondary'
                }`}
              >
                {/* Subtle Vertical Spine Grain Gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] via-transparent to-black/60 pointer-events-none" />

                {/* Top: Stop Index + Elevation Badge */}
                <div className="relative z-10 font-mono text-[9px] font-semibold flex items-center justify-between">
                  <span className={isSelected || isHovered ? 'text-ink-primary font-bold' : 'text-ink-muted'}>
                    0{stop.index}
                  </span>
                  {stop.effortRating === 'ELEVATED' ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-semantic-hazard" title="Elevated Physical Strain" />
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-ink-muted/50" />
                  )}
                </div>

                {/* Center: Vertical Rotated Stop Title */}
                <div className="relative z-10 flex-1 flex items-center justify-center py-2 overflow-hidden">
                  <span
                    className={`writing-vertical font-mono text-[10px] md:text-[11px] tracking-wide uppercase truncate transition-colors ${
                      isSelected
                        ? 'text-ink-primary font-bold'
                        : isHovered
                        ? 'text-ink-primary'
                        : 'text-ink-secondary'
                    }`}
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                  >
                    {stop.title}
                  </span>
                </div>

                {/* Bottom: Terrain & Elevation Indicator */}
                <div className="relative z-10 font-mono text-[8px] text-ink-muted text-center border-t border-[rgba(242,240,235,0.08)] pt-1">
                  +{stop.elevationDeltaM}m
                </div>
              </motion.div>

              {/* Hover Flyout Architectural Preview Card */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className={`absolute z-40 bottom-full mb-3 w-60 sm:w-68 bg-[#151515] border border-[rgba(242,240,235,0.28)] p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.95)] ${
                      side === 'left' ? 'left-0 sm:-left-4' : 'right-0 sm:-right-4'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between font-mono text-[9px] text-ink-muted uppercase border-b border-[rgba(242,240,235,0.1)] pb-1.5 mb-2">
                      <span>STOP 0{stop.index} // ROUTE</span>
                      <span className="text-ink-primary font-semibold tracking-wider">
                        {stop.vibeTag}
                      </span>
                    </div>

                    {/* Title & Subtitle */}
                    <h4 className="font-serif text-base text-ink-primary leading-tight mb-1">
                      {stop.title}
                    </h4>
                    <p className="font-sans text-[11px] text-ink-secondary line-clamp-2 mb-2.5 leading-relaxed">
                      {stop.description}
                    </p>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[9px] text-ink-secondary border-t border-[rgba(242,240,235,0.08)] pt-2 mb-3">
                      <div className="flex items-center space-x-1">
                        <Mountain className="w-3 h-3 text-ink-muted" />
                        <span>Δh {stop.elevationDeltaM}m · {stop.slopeDeg}°</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-ink-muted" />
                        <span>{stop.dwellMinutes} MIN DWELL</span>
                      </div>
                    </div>

                    {/* Action Buttons: + SAVE and VIEW IN ROUTE */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[rgba(242,240,235,0.1)]">
                      <motion.button
                        onClick={(e) => handleToggleSave(e, stop.id)}
                        whileHover={{ y: -2, scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                        className={`font-mono text-[9px] tracking-widest uppercase py-1.5 px-2 border transition-colors duration-150 flex items-center justify-center space-x-1 cursor-pointer ${
                          isSaved
                            ? 'bg-ink-primary text-canvas border-ink-primary font-bold'
                            : 'bg-[#1D1D1D] hover:bg-[#252525] text-ink-primary border-[rgba(242,240,235,0.2)]'
                        }`}
                      >
                        {isSaved ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>SAVED ✓</span>
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-3 h-3" />
                            <span>+ SAVE</span>
                          </>
                        )}
                      </motion.button>

                      <motion.button
                        onClick={(e) => handleViewInRoute(e, stop.id)}
                        whileHover={{ y: -2, scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                        className="font-mono text-[9px] tracking-widest uppercase py-1.5 px-2 bg-ink-primary text-canvas hover:bg-white font-bold transition-colors duration-150 flex items-center justify-center space-x-1 cursor-pointer shadow-md"
                      >
                        <span>VIEW IN ROUTE</span>
                        <ArrowRight className="w-3 h-3" />
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Edge Bracket Coordinates Indicator */}
      <div className={`mt-2 font-mono text-[8px] tracking-widest text-ink-muted ${
        side === 'left' ? 'text-right' : 'text-left'
      }`}>
        {side === 'left' ? '[<] RACK_WEST' : 'RACK_EAST [>]'}
      </div>
    </div>
  );
};
