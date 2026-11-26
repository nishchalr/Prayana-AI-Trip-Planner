import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { MonolithStop } from '../../types';
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
      <div className={`flex items-center space-x-2 font-mono text-[11px] tracking-widest text-[var(--ink-muted)] uppercase mb-3 ${
        side === 'left' ? 'flex-row' : 'flex-row-reverse'
      }`}>
        <span>{side === 'left' ? '[ WEST CORRIDOR ]' : '[ EAST CORRIDOR ]'}</span>
        <span className="text-[12px] text-[var(--ink-secondary)]">
          {side === 'left' ? '01—04' : '05—08'}
        </span>
      </div>

      {/* Vertical Book-Spine Slab Rack */}
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
                transition={FLUID_ISLAND_SPRING}
                className={`metallic-sheen relative w-7 sm:w-8 md:w-9 lg:w-10 h-64 sm:h-72 md:h-80 cursor-pointer rounded-none border transition-colors flex flex-col justify-between p-1.5 overflow-hidden ${
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
                    : 'border-[rgba(242,240,235,0.14)] bg-[#141414] hover:border-[var(--ink-secondary)] shadow-2xl'
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

                {/* Top: Stop Index + Effort Dot */}
                <div className="relative z-10 font-mono text-[11px] font-semibold flex items-center justify-between">
                  <span className={isSelected || isHovered ? 'text-[var(--ink-primary)] font-bold' : 'text-[var(--ink-muted)]'}>
                    0{stop.index}
                  </span>
                  {stop.effortRating === 'ELEVATED' ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-semantic-hazard" title="Elevated Physical Strain" />
                  ) : stop.effortRating === 'MODERATE' ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-semantic-caution" title="Moderate Effort" />
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-[var(--ink-muted)]/50" />
                  )}
                </div>

                {/* Center: Vertical Rotated Stop Title */}
                <div className="relative z-10 flex-1 flex items-center justify-center py-2 overflow-hidden">
                  <span
                    className={`font-mono text-[12px] md:text-[13px] tracking-wide uppercase truncate transition-colors ${
                      isSelected
                        ? 'text-[var(--ink-primary)] font-bold'
                        : isHovered
                        ? 'text-[var(--ink-primary)]'
                        : 'text-[var(--ink-secondary)]'
                    }`}
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                  >
                    {stop.title}
                  </span>
                </div>

                {/* Bottom: Elevation Indicator */}
                <div className="relative z-10 font-mono text-[11px] text-[var(--ink-muted)] text-center border-t border-[rgba(242,240,235,0.08)] pt-1">
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
                    className={`absolute z-40 bottom-full mb-3 w-60 border p-3.5 ${
                      isLight
                        ? 'bg-[#FFFFFF] border-[rgba(17,17,17,0.22)] shadow-[0_14px_32px_rgba(17,17,17,0.14)]'
                        : 'bg-[#151515] border-[rgba(242,240,235,0.28)] shadow-[0_16px_40px_rgba(0,0,0,0.95)]'
                    } ${
                      side === 'left' ? 'left-0 sm:-left-4' : 'right-0 sm:-right-4'
                    }`}
                  >
                    {/* Flyout Header */}
                    <div className="flex items-center justify-between font-mono text-[11px] text-[var(--ink-muted)] uppercase border-b border-[rgba(242,240,235,0.1)] pb-1.5 mb-2">
                      <span>STOP 0{stop.index} // ROUTE</span>
                      <span className="text-[var(--ink-primary)] font-semibold tracking-wider">
                        {stop.vibeTag}
                      </span>
                    </div>

                    {/* Title & Subtitle */}
                    <h4 className="font-serif text-base text-[var(--ink-primary)] leading-tight mb-1">
                      {stop.title}
                    </h4>
                    <p className="font-sans text-[13px] text-[var(--ink-secondary)] line-clamp-2 mb-2.5 leading-relaxed">
                      {stop.description}
                    </p>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] text-[var(--ink-secondary)] border-t border-[rgba(242,240,235,0.08)] pt-2 mb-3">
                      <div className="flex items-center space-x-1">
                        <Mountain className="w-3 h-3 text-[var(--ink-muted)]" />
                        <span>Δh {stop.elevationDeltaM}m · {stop.slopeDeg}°</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-[var(--ink-muted)]" />
                        <span>{stop.dwellMinutes} MIN DWELL</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[rgba(242,240,235,0.1)]">
                      <motion.button
                        onClick={(e) => handleToggleSave(e, stop.id)}
                        whileHover={{ y: -2, scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        transition={FLUID_ISLAND_SPRING}
                        className={`font-mono text-[11px] tracking-widest uppercase py-1.5 px-2 border transition-colors duration-150 flex items-center justify-center space-x-1 cursor-pointer ${
                          isSaved
                            ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] border-[var(--ink-primary)] font-bold'
                            : isLight
                            ? 'bg-[#F5F3EE] hover:bg-[#EAEAE0] text-[var(--ink-primary)] border-[rgba(17,17,17,0.2)]'
                            : 'bg-[#1D1D1D] hover:bg-[#252525] text-[var(--ink-primary)] border-[rgba(242,240,235,0.2)]'
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
                        className="font-mono text-[11px] tracking-widest uppercase py-1.5 px-2 bg-[var(--ink-primary)] text-[var(--bg-canvas)] hover:opacity-90 font-bold transition-colors duration-150 flex items-center justify-center space-x-1 cursor-pointer shadow-md"
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

      {/* Edge Bracket Rack Label */}
      <div className={`mt-2 font-mono text-[11px] tracking-widest text-[var(--ink-muted)] ${
        side === 'left' ? 'text-right' : 'text-left'
      }`}>
        {side === 'left' ? '[<] RACK_WEST' : 'RACK_EAST [>]'}
      </div>
    </div>
  );
};

// Thin horizontal readable card — reused for the mobile 2-col grid
interface CorridorStopCardProps {
  stop: MonolithStop;
  compact?: boolean;
  isLight: boolean;
  isSelected: boolean;
  isHovered?: boolean;
  isSaved: boolean;
  onSelect: () => void;
  onHoverChange?: (hovered: boolean) => void;
  onToggleSave: (e: React.MouseEvent) => void;
  onViewInRoute: (e: React.MouseEvent) => void;
}

export const CorridorStopCard: React.FC<CorridorStopCardProps> = ({
  stop,
  compact = false,
  isLight,
  isSelected,
  isHovered = false,
  isSaved,
  onSelect,
  onHoverChange,
  onToggleSave,
  onViewInRoute,
}) => {
  const strainColor =
    stop.effortRating === 'ELEVATED'
      ? '#DC2626'
      : stop.effortRating === 'MODERATE'
      ? '#D97706'
      : '#10B981';

  const badgeTone =
    stop.effortRating === 'ELEVATED'
      ? 'text-semantic-hazard border-semantic-hazard/40'
      : stop.effortRating === 'MODERATE'
      ? 'text-semantic-caution border-semantic-caution/40'
      : 'text-semantic-nominal border-semantic-nominal/40';

  const effortLabel = compact
    ? stop.effortRating === 'ELEVATED'
      ? 'HIGH'
      : stop.effortRating === 'MODERATE'
      ? 'MOD'
      : 'LOW'
    : stop.effortRating;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={FLUID_ISLAND_SPRING}
      className={`group relative w-full h-auto border text-left cursor-pointer transition-colors ${
        compact ? 'p-2.5 pl-3' : 'p-3 pl-3.5'
      } ${
        isSelected
          ? isLight
            ? 'border-[#111111] bg-[#EAE8E1] shadow-[0_8px_22px_rgba(17,17,17,0.12)] ring-1 ring-[#111111]/20'
            : 'border-[#F2F0EB] bg-[#202020] shadow-[0_10px_28px_rgba(242,240,235,0.12)] ring-1 ring-[#F2F0EB]/25'
          : isHovered
          ? 'border-[var(--ink-primary)] bg-[var(--bg-elevated)]'
          : 'border-[var(--hairline)] bg-[var(--bg-surface)] hover:border-[var(--ink-primary)]'
      }`}
    >
      {/* Left Effort Strain Indicator Bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: strainColor }}
      />

      {/* Row 1: Stop Index + Elevation/Strain Badge + Quick Actions */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1 min-w-0">
          <span className="font-mono text-[12px] font-bold text-[var(--ink-primary)] shrink-0">
            0{stop.index}
          </span>
          <span
            className={`font-mono text-[11px] px-1.5 py-0.5 border bg-[var(--bg-canvas)] whitespace-nowrap ${badgeTone}`}
          >
            +{stop.elevationDeltaM}m · {effortLabel}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggleSave}
            className={`p-1 border transition-colors cursor-pointer ${
              isSaved
                ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] border-[var(--ink-primary)]'
                : 'bg-[var(--bg-canvas)] text-[var(--ink-secondary)] border-[var(--hairline)] hover:border-[var(--ink-primary)] hover:text-[var(--ink-primary)]'
            }`}
            title={isSaved ? 'Saved to Bucket List' : 'Save to Bucket List'}
            aria-label={isSaved ? `Remove ${stop.title} from Bucket List` : `Save ${stop.title} to Bucket List`}
          >
            {isSaved ? <Check className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
          </button>

          <button
            type="button"
            onClick={onViewInRoute}
            className="px-1.5 py-1 border border-[var(--hairline)] bg-[var(--bg-canvas)] text-[var(--ink-secondary)] hover:bg-[var(--ink-primary)] hover:text-[var(--bg-canvas)] hover:border-[var(--ink-primary)] transition-colors cursor-pointer font-mono text-[11px] flex items-center gap-0.5"
            title={`Open ${stop.title} in Itinerary Timeline`}
          >
            {!compact && <span className="hidden xl:inline">ROUTE</span>}
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Row 2: Stop Name */}
      <h3
        className={`font-serif text-[var(--ink-primary)] leading-snug truncate mt-1.5 ${
          compact ? 'text-sm' : 'text-[15px]'
        }`}
        title={stop.title}
      >
        {stop.title}
      </h3>

      {/* Row 3: Terrain & Dwell Meta */}
      <div className="flex items-center justify-between gap-2 mt-1 font-mono text-[11px] text-[var(--ink-secondary)]">
        <span className="flex items-center gap-1 truncate">
          <Clock className="w-3 h-3 text-[var(--ink-muted)] shrink-0" />
          <span>{stop.dwellMinutes}m</span>
          <span className="text-[var(--ink-muted)]">·</span>
          <Mountain className="w-3 h-3 text-[var(--ink-muted)] shrink-0" />
          <span>{stop.slopeDeg}°</span>
        </span>
        {!compact && (
          <span className="text-[11px] text-[var(--ink-muted)] truncate max-w-[115px] uppercase">
            {stop.vibeTag}
          </span>
        )}
      </div>
    </motion.div>
  );
};
