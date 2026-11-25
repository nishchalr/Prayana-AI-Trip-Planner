import React from 'react';
import { motion } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { MonolithStop } from '../../types';
import { Mountain, Clock, Bookmark, ArrowRight, Check } from 'lucide-react';
import { FLUID_ISLAND_SPRING } from '../../motion/fluidTokens';

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

      {/* Row 2: Horizontal Stop Name */}
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

  const safeStops = activeDestination?.stops ?? [];
  const half = Math.max(1, Math.ceil(safeStops.length / 2));
  const stops = side === 'left' ? safeStops.slice(0, half) : safeStops.slice(half);

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
    <div
      className={`relative w-full max-w-[340px] h-full flex flex-col justify-center px-3 lg:px-4 py-2 select-none ${
        side === 'left' ? 'items-end' : 'items-start'
      }`}
    >
      {/* Shelf Header Tag */}
      <div className="w-full flex items-center justify-between font-mono text-[11px] tracking-widest text-[var(--ink-muted)] uppercase mb-2 px-0.5">
        <span>{side === 'left' ? '[ WEST CORRIDOR ]' : '[ EAST CORRIDOR ]'}</span>
        <span className="text-[11px] text-[var(--ink-secondary)]">
          {side === 'left' ? `01—0${stops.length}` : `0${half + 1}—0${half + stops.length}`}
        </span>
      </div>

      {/* Horizontal Readable POI Card Stack */}
      <div className="w-full flex flex-col gap-2">
        {stops.map((stop) => {
          const isHovered = hoveredStopId === stop.id;
          const isSelected = activeStopId === stop.id;
          const isSaved = Array.isArray(wishlistIds) && wishlistIds.includes(stop.id);

          return (
            <CorridorStopCard
              key={stop.id}
              stop={stop}
              isLight={isLight}
              isSelected={isSelected}
              isHovered={isHovered}
              isSaved={isSaved}
              onSelect={() => setActiveStopId(isSelected ? null : stop.id)}
              onHoverChange={(h) => setHoveredStopId(h ? stop.id : null)}
              onToggleSave={(e) => handleToggleSave(e, stop.id)}
              onViewInRoute={(e) => handleViewInRoute(e, stop.id)}
            />
          );
        })}
      </div>
    </div>
  );
};
