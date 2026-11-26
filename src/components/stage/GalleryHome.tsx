import React from 'react';
import { DestinationCarouselHeader } from './DestinationCarouselHeader';
import { ThreeStageMonument } from './ThreeStageMonument';
import { MonolithShelf } from './MonolithShelf';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { usePrayana } from '../../context/PrayanaContext';
import { Bookmark, Clock } from 'lucide-react';

export const GalleryHome: React.FC = () => {
  const { activeDestination, activeStopId, setActiveStopId, wishlistIds, toggleWishlist, theme } = usePrayana();
  const isLight = theme === 'light';
  const stops = activeDestination?.stops ?? [];

  return (
    <div className="relative z-10 flex-1 flex flex-col justify-between w-full h-[calc(100vh-96px)] overflow-hidden">
      {/* Editorial Destination Header */}
      <ErrorBoundary fallbackTitle="Destination Marquee">
        <DestinationCarouselHeader />
      </ErrorBoundary>

      {/* Center 3-Column Hairline Structural Grid */}
      <div className="relative flex-1 w-full grid grid-cols-12 items-center min-h-0">
        {/* Left Monolith Shelf Column (Cols 1-3, desktop lg+) */}
        <div className="col-span-3 h-full hidden lg:flex items-center justify-end z-20">
          <ErrorBoundary fallbackTitle="West Shelf">
            <MonolithShelf side="left" />
          </ErrorBoundary>
        </div>

        {/* Center Interactive 3D Monument Stage Column */}
        <div className="col-span-12 lg:col-span-6 h-[42vh] min-h-[300px] lg:h-full flex flex-col items-center justify-center relative z-10 px-2">
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

      {/* Horizontal Swipeable Stop Strip for Mobile & Tablet (< lg) */}
      <div className="flex lg:hidden w-full overflow-x-auto snap-x snap-mandatory gap-3 px-4 pb-3 pt-1 shrink-0">
        {stops.map((stop, idx) => {
          const isSelected = activeStopId === stop.id;
          const isSaved = Array.isArray(wishlistIds) && wishlistIds.includes(stop.id);
          const strainColor =
            stop.effortRating === 'ELEVATED'
              ? '#DC2626'
              : stop.effortRating === 'MODERATE'
              ? '#D97706'
              : '#10B981';

          return (
            <div
              key={stop.id}
              onClick={() => setActiveStopId(stop.id)}
              className={`snap-start shrink-0 w-[210px] p-2.5 border cursor-pointer transition-colors relative flex flex-col justify-between ${
                isLight
                  ? isSelected
                    ? 'border-[#111111] bg-[#EAE8E1]'
                    : 'border-[rgba(17,17,17,0.14)] bg-[#FFFFFF]'
                  : isSelected
                  ? 'border-ink-primary bg-[#1C1C1C]'
                  : 'border-[rgba(242,240,235,0.14)] bg-[#141414]'
              }`}
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: strainColor }}
              />
              <div className="flex items-center justify-between pl-2">
                <span className={`font-mono text-[12px] font-bold ${isLight ? 'text-[#111111]' : 'text-ink-primary'}`}>
                  0{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWishlist(stop.id);
                  }}
                  className={`p-1 border cursor-pointer ${
                    isSaved
                      ? 'border-ink-primary bg-ink-primary text-canvas'
                      : 'border-[rgba(242,240,235,0.16)] text-ink-muted'
                  }`}
                  title={isSaved ? 'Saved to Bucket List' : 'Save to Bucket List'}
                >
                  <Bookmark className="w-2.5 h-2.5" />
                </button>
              </div>
              <div className="pl-2 mt-1.5">
                <div className={`font-serif text-sm leading-tight truncate ${isLight ? 'text-[#111111]' : 'text-ink-primary'}`}>
                  {stop.title}
                </div>
                <div className="flex items-center gap-2 mt-1 font-mono text-[11px] text-ink-muted">
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" /> {stop.dwellMinutes}m
                  </span>
                  <span>· {stop.slopeDeg}°</span>
                  <span>· {stop.effortRating}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
