import React from 'react';
import { usePrayana } from '../../context/PrayanaContext';
import { DualModeRouteMap } from './DualModeRouteMap';
import { DraggableTimeline } from './DraggableTimeline';
import { OperationsCockpit } from './OperationsCockpit';

export const ItineraryWorkspace: React.FC = () => {
  const { 
    activeDestination, 
    activeTrip 
  } = usePrayana();

  return (
    <div className="relative z-10 flex-1 w-full max-w-[1560px] mx-auto px-4 md:px-6 py-4 flex flex-col justify-between overflow-y-auto select-none font-mono text-[11px]">
      {/* Editorial Workspace Header */}
      <div className="pb-3 border-b border-[rgba(242,240,235,0.12)] mb-4">
        <div className="text-[9px] font-mono text-ink-muted uppercase tracking-widest mb-1">
          ITINERARY WORKSPACE // CORRIDOR OPERATIONS
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl text-ink-primary tracking-tight leading-none">
          {activeDestination.routeTitle}
        </h1>
        <div className="text-[10px] text-ink-secondary mt-1.5 uppercase tracking-wide">
          {activeDestination.region} · DAY 0{activeTrip.dayIndex} OF 0{activeTrip.totalDays} · TRANSIT: {activeTrip.transitMode.toUpperCase()}
        </div>
      </div>

      {/* Main 2-Column Hairline Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pb-12">
        {/* Left Column: Dual-Mode Map + Operations Cockpit (Cols 1-7) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Dual-Mode Interactive Route Map */}
          <DualModeRouteMap />

          {/* Tabbed Operations Cockpit */}
          <OperationsCockpit />
        </div>

        {/* Right Column: Synchronized Draggable Daily Timeline (Cols 8-12) */}
        <div className="lg:col-span-5 min-h-[420px] lg:h-auto">
          <DraggableTimeline />
        </div>
      </div>
    </div>
  );
};
