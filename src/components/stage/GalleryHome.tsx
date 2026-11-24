import React from 'react';
import { DestinationCarouselHeader } from './DestinationCarouselHeader';
import { ThreeStageMonument } from './ThreeStageMonument';
import { MonolithShelf } from './MonolithShelf';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { usePrayana } from '../../context/PrayanaContext';

export const GalleryHome: React.FC = () => {
  const { activeDestination } = usePrayana();

  return (
    <div className="relative z-10 flex-1 flex flex-col justify-between w-full h-[calc(100vh-96px)] overflow-hidden">
      {/* Editorial Destination Header */}
      <ErrorBoundary fallbackTitle="Destination Marquee">
        <DestinationCarouselHeader />
      </ErrorBoundary>

      {/* Center 3-Column Hairline Structural Grid */}
      <div className="relative flex-1 w-full grid grid-cols-12 items-center">
        {/* Left Monolith Shelf Column (Cols 1-3) */}
        <div className="col-span-3 h-full hidden md:flex items-center justify-end z-20">
          <ErrorBoundary fallbackTitle="West Shelf">
            <MonolithShelf side="left" />
          </ErrorBoundary>
        </div>

        {/* Center Interactive 3D Monument Stage Column (Cols 4-9 on desktop, full width on mobile) */}
        <div className="col-span-12 md:col-span-6 h-full flex flex-col items-center justify-center relative z-10 px-2 min-h-[440px]">
          <ErrorBoundary fallbackTitle={activeDestination?.name ? `${activeDestination.name} Stage` : 'Architectural Stage'}>
            <ThreeStageMonument />
          </ErrorBoundary>
        </div>

        {/* Right Monolith Shelf Column (Cols 10-12) */}
        <div className="col-span-3 h-full hidden md:flex items-center justify-start z-20">
          <ErrorBoundary fallbackTitle="East Shelf">
            <MonolithShelf side="right" />
          </ErrorBoundary>
        </div>
      </div>

      {/* Subtle Mobile Monolith Shelf Accordion fallback for screens < 768px */}
      <div className="md:hidden w-full px-4 pb-2 flex justify-center space-x-2">
        <span className="text-[10px] font-mono text-ink-muted">
          [SWIPE LEFT/RIGHT OR DRAG 3D MODEL TO EXPLORE]
        </span>
      </div>
    </div>
  );
};
