import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { Mountain, Clock, Bookmark, ArrowRight, Check } from 'lucide-react';
import { FLUID_ISLAND_SPRING } from '../../motion/fluidTokens';

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
    setActiveView,
    setActiveCockpitTab,
    theme
  } = usePrayana();
  const isLight = theme === 'light';

  // Divide stops safely between left and right racks
  const safeStops = activeDestination?.stops ?? [];
  const half = Math.max(1, Math.ceil(safeStops.length / 2));
  const stops = side === 'left' 
    ? safeStops.slice(0, half) 
    : safeStops.slice(half);

  const handleViewInRoute = (e: React.MouseEvent, stopId: string) => {
    e.stopPropagation();
    setActiveStopId(stopId);
    setActiveCockpitTab('ROUTE_TIMELINE');
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
      <div className={`flex items-center space-x-2 font-mono text-[11px] tracking-widest text-ink-muted uppercase mb-3 ${
        side === 'left' ? 'flex-row' : 'flex-row-reverse'
      }`}>
        <span>{side === 'left' ? '[ WEST CORRIDOR ]' : '[ EAST CORRIDOR ]'}</span>
        <span className="text-[12px] text-ink-secondary">
          {side === 'left' ? '01—04' : '05—08'}
        </span>
      </div>

      {/* Slabs Accordion / Stripe-Press Spines in 3D Perspective (Stepped toward center 3D model) */}
      <div className="perspective-stage relative flex items-end space-x-1 sm:space-x-1.5 md:space-x-2.5 max-w-full overflow-visible py-4">
        {stops.map((stop, index) => {
          const isHovered = hoveredStopId === stop.id;
          const isSelected = activeStopId === stop.id;
          const isSaved = Array.isArray(wishlistIds) && wishlistIds.includes(stop.id);

          // Stepped heights: West 01->04 steps taller toward center; East 05->08 mirrors taller->shorter
          const westHeights = ['h-[228px]', 'h-[262px]', 'h-[296px]', 'h-[330px]'];
          const eastHeights = ['h-[330px]', 'h-[296px]', 'h-[262px]', 'h-[228px]'];
          const steppedHeightClass =
            side === 'left'
              ? westHeights[Math.min(index, westHeights.length - 1)]
              : eastHeights[Math.min(index, eastHeights.length - 1)];

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
                transition={FLUID_ISLAND_SPRING}
                className={`metallic-sheen relative w-7 sm:w-8 md:w-9 lg:w-10 ${steppedHeightClass} cursor-pointer rounded-none border transition-colors flex flex-col justify-between p-1.5 overflow-hidden ${
                  isLight
                    ? isSelected
                      ? 'border-[#111111] bg-[#EAE8E1] shadow-[0_12px_28px_rgba(17,17,17,0.14)] ring-1 ring-[#111111]/25'
                      : isHovered
                      ? 'border-[#111111] bg-[#FFFFFF] shadow-[0_14px_30px_rgba(17,17,17,0.14)]'
                      : 'border-[rgba(17,17,17,0.14)] bg-[#FFFFFF] hover:border-[#111111]/40 shadow-[0_6px_18px_rgba(17,17,17,0.06)]'
                    : isSelected
                    ? 'border-[#F2F0EB] bg-[#222222] shadow-[0_12px_32px_rgba(242,240,235,0.15)] ring-1 ring-[#F2F0EB]/30'
                    : isHovered
                    ? 'border-[#F2F0EB] bg-[#1C1C1C] shadow-[0_14px_36px_rgba(0,0,0,0.95)]'
                    : 'border-[rgba(242,240,235,0.14)] bg-[#141414] hover:border-ink-secondary shadow-2xl'
                }`}
              >
                {/* Subtle Vertical Spine Grain Gradient */}
                <div
                  className={`absolute inset-0 pointer-events-none ${
                    isLight
                      ? 'bg-gradient-to-b from-black/[0.02] via-transparent to-[#EAE8E1]/55'
                      : 'bg-gradient-to-b from-white/[0.05] via-transparent to-black/60'
                  }`}
                />

                {/* Top: Stop Index + Elevation Badge */}
                <div className="relative z-10 font-mono text-[11px] font-semibold flex items-center justify-between">
                  <span className={isSelected || isHovered ? 'text-ink-primary font-bold' : 'text-ink-muted'}>
                    0{stop.index}
                  </span>
                  {stop.effortRating === 'ELEVATED' ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-semantic-hazard" title="Elevated Physical Strain" />
                  ) : stop.effortRating === 'MODERATE' ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-semantic-caution" title="Moderate Physical Strain" />
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-ink-muted/50" />
                  )}
                </div>

                {/* Center: Vertical Rotated Stop Title with Digital-Board Marquee for Long Names */}
                <div className="relative z-10 flex-1 w-full flex items-center justify-center py-2 overflow-hidden">
                  {stop.title.length > 18 ? (
                    <div
                      className="h-full overflow-hidden flex items-center"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                    >
                      <span
                        className={`animate-spine-marquee-v whitespace-nowrap font-mono text-[12px] md:text-[13px] tracking-wide uppercase transition-colors ${
                          isSelected
                            ? 'text-ink-primary font-bold'
                            : isHovered
                            ? 'text-ink-primary'
                            : 'text-ink-secondary'
                        }`}
                      >
                        <span>{stop.title}&nbsp;&nbsp;·&nbsp;&nbsp;</span>
                        <span>{stop.title}&nbsp;&nbsp;·&nbsp;&nbsp;</span>
                      </span>
                    </div>
                  ) : (
                    <span
                      className={`writing-vertical font-mono text-[12px] md:text-[13px] tracking-wide uppercase whitespace-nowrap transition-colors ${
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
                  )}
                </div>

                {/* Bottom: Terrain & Elevation Indicator */}
                <div className="relative z-10 font-mono text-[11px] text-ink-muted text-center border-t border-[rgba(242,240,235,0.08)] pt-1">
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
                    className={`absolute z-40 bottom-full mb-3 w-60 sm:w-68 border p-3.5 ${
                      isLight
                        ? 'bg-[#FFFFFF] border-[rgba(17,17,17,0.22)] shadow-[0_14px_32px_rgba(17,17,17,0.14)]'
                        : 'bg-[#151515] border-[rgba(242,240,235,0.28)] shadow-[0_16px_40px_rgba(0,0,0,0.95)]'
                    } ${
                      side === 'left' ? 'left-0 sm:-left-4' : 'right-0 sm:-right-4'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between font-mono text-[11px] text-ink-muted uppercase border-b border-[rgba(242,240,235,0.1)] pb-1.5 mb-2">
                      <span>STOP 0{stop.index} // ROUTE</span>
                      <span className="text-ink-primary font-semibold tracking-wider">
                        {stop.vibeTag}
                      </span>
                    </div>

                    {/* Title & Subtitle */}
                    <h4 className="font-serif text-base text-ink-primary leading-tight mb-1">
                      {stop.title}
                    </h4>
                    <p className="font-sans text-[13px] text-ink-secondary line-clamp-2 mb-2.5 leading-relaxed">
                      {stop.description}
                    </p>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] text-ink-secondary border-t border-[rgba(242,240,235,0.08)] pt-2 mb-3">
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
                        transition={FLUID_ISLAND_SPRING}
                        className={`font-mono text-[11px] tracking-widest uppercase py-1.5 px-2 border transition-colors duration-150 flex items-center justify-center space-x-1 cursor-pointer ${
                          isSaved
                            ? 'bg-ink-primary text-canvas border-ink-primary font-bold'
                            : isLight
                            ? 'bg-[#F5F3EE] hover:bg-[#EAEAE0] text-ink-primary border-[rgba(17,17,17,0.2)]'
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
                        transition={FLUID_ISLAND_SPRING}
                        className="font-mono text-[11px] tracking-widest uppercase py-1.5 px-2 bg-ink-primary text-canvas hover:bg-white font-bold transition-colors duration-150 flex items-center justify-center space-x-1 cursor-pointer shadow-md"
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
      <div className={`mt-2 font-mono text-[11px] tracking-widest text-ink-muted ${
        side === 'left' ? 'text-right' : 'text-left'
      }`}>
        {side === 'left' ? '[<] RACK_WEST' : 'RACK_EAST [>]'}
      </div>
    </div>
  );
};

/**
 * Mobile (< lg) single-column vertical stack of thin, full-width horizontal book-spine strips.
 * Matches the sleek thin proportions of the desktop book-spines, oriented horizontally.
 */
export const MobileSpineRack: React.FC = () => {
  const {
    activeDestination,
    activeStopId,
    setActiveStopId,
    wishlistIds,
    toggleWishlist,
    setActiveView,
    setActiveCockpitTab,
    theme,
  } = usePrayana();
  const isLight = theme === 'light';
  const stops = activeDestination?.stops ?? [];

  return (
    <div className="flex flex-col lg:hidden w-full shrink-0 px-3 pb-2 pt-1 select-none">
      <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-ink-muted uppercase px-0.5 pb-1">
        <span>[ CORRIDOR SPINES ]</span>
        <span className="text-ink-secondary">01—0{stops.length} · SCROLL ↓</span>
      </div>

      {/* Natural Full-Page Vertical Stack (no inner scroll trap) */}
      <div className="relative flex flex-col gap-1.5">
        {stops.map((stop, idx) => {
        const isSelected = activeStopId === stop.id;
        const isSaved = Array.isArray(wishlistIds) && wishlistIds.includes(stop.id);
        const strainColor =
          stop.effortRating === 'ELEVATED'
            ? '#B91C1C'
            : stop.effortRating === 'MODERATE'
            ? '#B45309'
            : '#047857';
        const effortShort =
          stop.effortRating === 'ELEVATED'
            ? 'HIGH'
            : stop.effortRating === 'MODERATE'
            ? 'MOD'
            : 'LOW';
        const effortTone =
          stop.effortRating === 'ELEVATED'
            ? 'text-semantic-hazard'
            : stop.effortRating === 'MODERATE'
            ? 'text-semantic-caution'
            : 'text-semantic-nominal';

        return (
          <motion.div
            key={stop.id}
            role="button"
            tabIndex={0}
            onClick={() => setActiveStopId(isSelected ? null : stop.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveStopId(isSelected ? null : stop.id);
              }
            }}
            whileTap={{ scale: 0.985 }}
            transition={FLUID_ISLAND_SPRING}
            className={`relative w-full h-10 shrink-0 border flex items-center justify-between gap-2 pl-3 pr-2 cursor-pointer transition-colors ${
              isLight
                ? isSelected
                  ? 'border-[#111111] bg-[#EAE8E1] shadow-sm'
                  : 'border-[rgba(17,17,17,0.16)] bg-[#FFFFFF]'
                : isSelected
                ? 'border-[#F2F0EB] bg-[#222222] shadow-md'
                : 'border-[rgba(242,240,235,0.14)] bg-[#141414]'
            }`}
          >
            {/* Left strain bar */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{ backgroundColor: strainColor }}
            />

            {/* Single-line spine content: 01 · Title (with marquee if long) */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1 font-mono text-[11px] overflow-hidden">
              <span className="font-bold text-[var(--ink-primary)] shrink-0">
                0{idx + 1}
              </span>
              <span className="text-[var(--ink-muted)] shrink-0">·</span>
              {stop.title.length > 26 ? (
                <div className="flex-1 min-w-0 overflow-hidden">
                  <span className="animate-spine-marquee-h font-serif text-[14px] text-[var(--ink-primary)]">
                    <span>{stop.title}&nbsp;&nbsp;·&nbsp;&nbsp;</span>
                    <span>{stop.title}&nbsp;&nbsp;·&nbsp;&nbsp;</span>
                  </span>
                </div>
              ) : (
                <span className="font-serif text-[14px] text-[var(--ink-primary)] truncate">
                  {stop.title}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
              <span className="text-[var(--ink-secondary)]">+{stop.elevationDeltaM}m</span>
              <span className="text-[var(--ink-muted)]">·</span>
              <span className={`font-semibold ${effortTone}`}>{effortShort}</span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWishlist(stop.id);
                }}
                className={`p-1 border cursor-pointer ml-0.5 ${
                  isSaved
                    ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--bg-canvas)]'
                    : 'border-[var(--hairline)] text-[var(--ink-muted)]'
                }`}
                title={isSaved ? 'Saved to Bucket List' : 'Save to Bucket List'}
                aria-label={isSaved ? `Remove ${stop.title}` : `Save ${stop.title}`}
              >
                {isSaved ? <Check className="w-2.5 h-2.5" /> : <Bookmark className="w-2.5 h-2.5" />}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveStopId(stop.id);
                  setActiveCockpitTab('ROUTE_TIMELINE');
                  setActiveView('ITINERARY_OUTPUT');
                }}
                className="p-1 border border-[var(--hairline)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
                title={`Open ${stop.title} in Route`}
                aria-label={`Open ${stop.title} in Route`}
              >
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </motion.div>
        );
      })}
        {/* Subtle bottom fade indicating more spines below */}
        <div
          aria-hidden="true"
          className="pointer-events-none sticky bottom-0 left-0 right-0 h-5 -mt-5 shrink-0 bg-gradient-to-t from-[var(--bg-canvas)] via-[var(--bg-canvas)]/70 to-transparent"
        />
      </div>
    </div>
  );
};
