import React, { useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { MonolithStop, StrainLevel } from '../../types';
import { 
  GripVertical, 
  Clock, 
  Mountain, 
  Pin, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Navigation,
  CheckCircle2,
  AlertTriangle 
} from 'lucide-react';

const getStrainColor = (strain: StrainLevel) => {
  switch (strain) {
    case 'LOW':
      return '#10B981'; // Emerald
    case 'MODERATE':
      return '#D97706'; // Amber
    case 'ELEVATED':
      return '#DC2626'; // Crimson
  }
};

interface TimelineStopItemProps {
  stop: MonolithStop;
  idx: number;
  totalCount: number;
  isSelected: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  onMove: (from: number, to: number) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onRemove: (id: string) => void;
}

const TimelineStopItem: React.FC<TimelineStopItemProps> = ({
  stop,
  idx,
  totalCount,
  isSelected,
  isHovered,
  onHover,
  onSelect,
  onMove,
  onTogglePin,
  onRemove,
}) => {
  const dragControls = useDragControls();
  const strainColor = getStrainColor(stop.effortRating);

  return (
    <Reorder.Item
      value={stop}
      dragListener={false}
      dragControls={dragControls}
      layout
      onMouseEnter={() => onHover(stop.id)}
      onMouseLeave={() => onHover(null)}
      transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      className={`metallic-sheen relative pl-4 pr-3 py-3 bg-[#151515] border transition-colors overflow-hidden ${
        isSelected
          ? 'border-ink-primary bg-[#1C1C1C] shadow-lg ring-1 ring-[#F2F0EB]/20'
          : isHovered
          ? 'border-ink-primary bg-[#1A1A1A] translate-x-1 shadow-md'
          : 'border-[rgba(242,240,235,0.1)] hover:border-ink-secondary'
      }`}
    >
      {/* Left Vertical Effort Strain Indicator Bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 transition-colors"
        style={{ backgroundColor: strainColor }}
        title={`Effort Strain: ${stop.effortRating}`}
      />

      <div className="flex items-start justify-between gap-2">
        {/* Left: Touch-Safe Drag Handle & Stop Sequence Number */}
        <div className="flex items-center space-x-1 shrink-0">
          <div
            onPointerDown={(e) => dragControls.start(e)}
            style={{ touchAction: 'none' }}
            className="p-2 -ml-1 cursor-grab active:cursor-grabbing text-ink-muted hover:text-ink-primary transition-colors"
            title="Drag handle to reorder"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <span className="font-mono text-xs font-bold text-ink-primary">
            0{stop.index}
          </span>
        </div>

        {/* Center: Title & Terrain Specs (touching here scrolls normally) */}
        <div
          className="flex-1 cursor-pointer min-w-0"
          onClick={() => onSelect(isSelected ? null : stop.id)}
        >
          <div className="flex items-center flex-wrap gap-1.5">
            <h4 className="font-serif text-base text-ink-primary leading-tight">
              {stop.title}
            </h4>
            {stop.isPinned && (
              <span className="text-[8px] px-1 bg-[#252525] border border-[rgba(242,240,235,0.2)] text-ink-primary font-bold">
                PINNED
              </span>
            )}
          </div>
          <div className="text-[8px] text-ink-secondary mt-0.5">
            {stop.subtitle}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[8px] text-ink-muted mt-2">
            <div className="flex items-center space-x-1">
              <Clock className="w-2.5 h-2.5" />
              <span>{stop.optimalTime} ({stop.dwellMinutes}m)</span>
            </div>
            <div className="flex items-center space-x-1">
              <Mountain className="w-2.5 h-2.5" />
              <span>+{stop.elevationDeltaM}m · {stop.slopeDeg}°</span>
            </div>
            <div className="flex items-center space-x-1">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: strainColor }}
              />
              <span style={{ color: strainColor }}>
                {stop.effortRating}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            type="button"
            disabled={idx === 0}
            onClick={() => onMove(idx, idx - 1)}
            className="p-1 text-ink-muted hover:text-[#0E0E0E] hover:bg-[#F2F0EB] transition-colors disabled:opacity-20 cursor-pointer"
            title="Move up"
          >
            <ArrowUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            disabled={idx === totalCount - 1}
            onClick={() => onMove(idx, idx + 1)}
            className="p-1 text-ink-muted hover:text-[#0E0E0E] hover:bg-[#F2F0EB] transition-colors disabled:opacity-20 cursor-pointer"
            title="Move down"
          >
            <ArrowDown className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onTogglePin(stop.id, !stop.isPinned)}
            className={`p-1 transition-colors cursor-pointer ${
              stop.isPinned
                ? 'text-ink-primary bg-[#252525]'
                : 'text-ink-muted hover:text-[#0E0E0E] hover:bg-[#F2F0EB]'
            }`}
            title={stop.isPinned ? 'Unpin' : 'Pin stop'}
          >
            <Pin className="w-3 h-3" />
          </button>
          {totalCount > 1 && (
            <button
              type="button"
              onClick={() => onRemove(stop.id)}
              className="p-1 text-ink-muted hover:text-semantic-hazard hover:bg-[#201010] transition-colors cursor-pointer"
              title="Remove stop"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </Reorder.Item>
  );
};

export const DraggableTimeline: React.FC = () => {
  const { 
    routeStops, 
    setRouteStops, 
    reorderRouteStops, 
    updateRouteStop, 
    removeRouteStop,
    activeStopId,
    setActiveStopId,
    hoveredStopId,
    setHoveredStopId,
    activeTraveler,
    optimizeActiveRoute 
  } = usePrayana();

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [solverBadge, setSolverBadge] = useState<string | null>(null);

  const handleOptimize = async () => {
    if (isOptimizing) return;
    setIsOptimizing(true);
    try {
      const res = await optimizeActiveRoute();
      if (res) {
        setSolverBadge(`${res.solverStatus} · ${Math.round(res.solveTimeMs)}MS`);
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleDragEnd = (newOrder: MonolithStop[]) => {
    // Re-index stops cleanly
    const reindexed = newOrder.map((s, idx) => ({ ...s, index: idx + 1 }));
    setRouteStops(reindexed);
  };

  return (
    <div className="w-full h-full bg-[#121212] border border-[rgba(242,240,235,0.12)] p-4 flex flex-col justify-between font-mono text-[10px] select-none">
      {/* Timeline Column Header */}
      <div className="pb-3 border-b border-[rgba(242,240,235,0.08)] mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-[9px] text-ink-muted uppercase tracking-widest">
            SYNCHRONIZED TIMELINE //
          </div>
          <div className="font-serif text-2xl text-ink-primary mt-0.5">
            Day 01 Schedule
          </div>
        </div>
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="text-[9px] text-ink-primary hover:bg-ink-primary hover:text-canvas bg-[#1C1C1C] px-2 py-0.5 border border-[rgba(242,240,235,0.22)] transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            title="Run CP-SAT Effort-Aware Route Optimization"
          >
            {isOptimizing ? 'SOLVING...' : solverBadge ? `[ ${solverBadge} ]` : '[ OPTIMIZE CP-SAT ]'}
          </button>
          <span className="text-[9px] text-ink-secondary bg-[#181818] px-2 py-0.5 border border-[rgba(242,240,235,0.1)] whitespace-nowrap">
            {routeStops.length} NODES
          </span>
        </div>
      </div>

      {/* Reorderable List */}
      <div className="flex-1 overflow-y-auto pr-1">
        <Reorder.Group
          axis="y"
          values={routeStops}
          onReorder={handleDragEnd}
          className="space-y-0"
        >
          {routeStops.map((stop, idx) => {
            const isSelected = activeStopId === stop.id;
            const isHovered = hoveredStopId === stop.id;
            const nextStop = routeStops[idx + 1];

            return (
              <React.Fragment key={stop.id}>
                <TimelineStopItem
                  stop={stop}
                  idx={idx}
                  totalCount={routeStops.length}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  onHover={setHoveredStopId}
                  onSelect={setActiveStopId}
                  onMove={reorderRouteStops}
                  onTogglePin={(id, pinned) => updateRouteStop(id, { isPinned: pinned })}
                  onRemove={removeRouteStop}
                />

                {/* Vertical Hairline Transit Connector between stops */}
                {nextStop && (
                  <div className="flex items-center justify-center my-1.5">
                    <div className="flex items-center space-x-2 text-[8px] font-mono text-ink-muted bg-[#0E0E0E] px-2.5 py-0.5 border border-[rgba(242,240,235,0.08)]">
                      <span className="text-[#8A8882]">↓</span>
                      <span>{Math.max(6, Math.round(nextStop.distanceKm * 5))} MIN TRANSIT</span>
                      <span className="text-[rgba(242,240,235,0.2)]">·</span>
                      <span>{nextStop.distanceKm} KM</span>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </Reorder.Group>
      </div>

      {/* Footer Pacing Summary */}
      <div className="pt-3 border-t border-[rgba(242,240,235,0.08)] flex items-center justify-between text-[8px] text-ink-muted mt-2">
        <span>DRAG TO REORDER INSTANTLY WITH MAP</span>
        <span className="text-semantic-nominal">SYNC LOCKED</span>
      </div>
    </div>
  );
};
