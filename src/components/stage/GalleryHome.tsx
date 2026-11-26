import React, { useRef } from 'react';
import { DestinationCarouselHeader } from './DestinationCarouselHeader';
import { ThreeStageMonument } from './ThreeStageMonument';
import { MobileSpineRack, MonolithShelf } from './MonolithShelf';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { usePrayana } from '../../context/PrayanaContext';
import { INITIAL_DESTINATIONS } from '../../data/mockData';

export const GalleryHome: React.FC = () => {
  const { destinations, activeDestination, activeDestinationId, setActiveDestinationId } = usePrayana();
  const safeDests = destinations && destinations.length > 0 ? destinations : INITIAL_DESTINATIONS;
  const rawIdx = safeDests.findIndex(d => d.id === activeDestinationId);
  const currentIndex = rawIdx >= 0 ? rawIdx : 0;

  const lastWheelNavRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const stepDestination = (offset: number) => {
    const idx = (currentIndex + offset + safeDests.length) % safeDests.length;
    const target = safeDests[idx];
    if (target) setActiveDestinationId(target.id);
  };

  // Horizontal trackpad/wheel flick beside the 3D model switches 1 destination per 350ms
  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 18) {
      const now = Date.now();
      if (now - lastWheelNavRef.current < 350) return;
      lastWheelNavRef.current = now;
      stepDestination(e.deltaX > 0 ? 1 : -1);
    }
  };

  // Touch swipe beside/around the 3D model switches Next/Prev destination
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    const touch = e.changedTouches[0];
    if (!start || !touch) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      stepDestination(dx < 0 ? 1 : -1);
    }
  };

  return (
    <div
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative z-10 flex-1 flex flex-col justify-between w-full h-[calc(100vh-96px)] overflow-hidden"
    >
      {/* Editorial Destination Header */}
      <ErrorBoundary fallbackTitle="Destination Marquee">
        <DestinationCarouselHeader />
      </ErrorBoundary>

      {/* Center 3-Column Hairline Structural Grid */}
      <div className="relative shrink-0 lg:flex-1 w-full grid grid-cols-12 items-center min-h-0">
        {/* Left Monolith Shelf Column (Cols 1-3, desktop lg+) */}
        <div className="col-span-3 h-full hidden lg:flex items-center justify-end z-20">
          <ErrorBoundary fallbackTitle="West Shelf">
            <MonolithShelf side="left" />
          </ErrorBoundary>
        </div>

        {/* Center Interactive 3D Monument Stage Column */}
        <div className="col-span-12 lg:col-span-6 h-[46vh] min-h-[340px] lg:h-full flex flex-col items-center justify-center relative z-10 px-2">
          <ErrorBoundary fallbackTitle={activeDestination?.name ? `${activeDestination.name} Stage` : 'Architectural Stage'}>
            <ThreeStageMonument />
          </ErrorBoundary>
        </div>

        {/* Right Monolith Shelf Column (Cols 10-12, desktop lg+) */}
        <div className="col-span-3 h-full hidden lg:flex items-center justify-start z-20">
          <ErrorBoundary fallbackTitle="East Shelf">
            <MonolithShelf side="right" />
          </ErrorBoundary>
        </div>
      </div>

      {/* Single-Column Thin Horizontal Spine Stack for Mobile & Tablet (< lg) */}
      <MobileSpineRack />
    </div>
  );
};
