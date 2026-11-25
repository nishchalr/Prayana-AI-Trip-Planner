import React from 'react';
import { DestinationCarouselHeader } from './DestinationCarouselHeader';
import { ThreeStageMonument } from './ThreeStageMonument';
import { CorridorStopCard, MonolithShelf } from './MonolithShelf';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { usePrayana } from '../../context/PrayanaContext';

export const GalleryHome: React.FC = () => {
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
    <div className="relative z-10 flex-1 flex flex-col justify-between w-full h-[calc(100vh-96px)] overflow-hidden">
      {/* Top Corridor Switcher Strip + Editorial Header */}
      <ErrorBoundary fallbackTitle="Destination Marquee">
        <DestinationCarouselHeader />
      </ErrorBoundary>

      {/* Center 3-Column Structural Grid: 4 Left Cards · 3D Stage · 4 Right Cards */}
      <div className="relative shrink-0 lg:flex-1 w-full grid grid-cols-12 items-center min-h-0 px-2 lg:px-4">
        {/* Left Horizontal Corridor Cards (Cols 1-3, desktop lg+) */}
        <div className="col-span-3 h-full hidden lg:flex items-center justify-end z-20 min-h-0">
          <ErrorBoundary fallbackTitle="West Corridor Cards">
            <MonolithShelf side="left" />
          </ErrorBoundary>
        </div>

        {/* Center Interactive 3D Monument Stage Column */}
        <div className="col-span-12 lg:col-span-6 h-[240px] sm:h-[290px] lg:h-full flex flex-col items-center justify-center relative z-10 px-2 min-h-0">
          <ErrorBoundary fallbackTitle={activeDestination?.name ? `${activeDestination.name} Stage` : 'Architectural Stage'}>
            <ThreeStageMonument />
          </ErrorBoundary>
        </div>

        {/* Right Horizontal Corridor Cards (Cols 10-12, desktop lg+) */}
        <div className="col-span-3 h-full hidden lg:flex items-center justify-start z-20 min-h-0">
          <ErrorBoundary fallbackTitle="East Corridor Cards">
            <MonolithShelf side="right" />
          </ErrorBoundary>
        </div>
      </div>

      {/* Responsive 2-Column Readable POI Cards Grid for Mobile & Tablet (< lg) */}
      <div className="grid grid-cols-2 auto-rows-max lg:hidden w-full flex-1 min-h-0 overflow-y-auto gap-2 px-3 pb-3 pt-1.5 content-start">
        {stops.map((stop) => {
          const isSelected = activeStopId === stop.id;
          const isSaved = Array.isArray(wishlistIds) && wishlistIds.includes(stop.id);

          return (
            <CorridorStopCard
              key={stop.id}
              stop={stop}
              compact
              isLight={isLight}
              isSelected={isSelected}
              isSaved={isSaved}
              onSelect={() => setActiveStopId(isSelected ? null : stop.id)}
              onToggleSave={(e) => {
                e.stopPropagation();
                toggleWishlist(stop.id);
              }}
              onViewInRoute={(e) => {
                e.stopPropagation();
                setActiveStopId(stop.id);
                setActiveCockpitTab('ROUTE_TIMELINE');
                setActiveView('ITINERARY_OUTPUT');
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
