import React, { useRef } from 'react';
import { animate, useMotionValue } from 'framer-motion';
import { DestinationCarouselHeader } from './DestinationCarouselHeader';
import { ThreeStageMonument } from './ThreeStageMonument';
import { MobileSpineRack, MonolithShelf } from './MonolithShelf';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { usePrayana } from '../../context/PrayanaContext';
import { INITIAL_DESTINATIONS } from '../../data/mockData';
import { FLUID_CAROUSEL_SPRING } from '../../motion/fluidTokens';

export const GalleryHome: React.FC = () => {
  const { destinations, activeDestination, activeDestinationId, setActiveDestinationId } = usePrayana();
  const safeDests = destinations && destinations.length > 0 ? destinations : INITIAL_DESTINATIONS;
  const rawIdx = safeDests.findIndex((d) => d.id === activeDestinationId);
  const currentIndex = rawIdx >= 0 ? rawIdx : 0;

  // 1:1 Gesture-Tracking MotionValue shared across Header + 3D Monument Stage
  const dragX = useMotionValue(0);
  const wheelSettleTimerRef = useRef<number | null>(null);
  const pointerGestureRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startTime: number;
    lockedAxis: 'x' | 'y' | null;
  } | null>(null);

  const commitStep = (offset: number) => {
    const idx = (currentIndex + offset + safeDests.length) % safeDests.length;
    const target = safeDests[idx];
    if (!target) return;

    setActiveDestinationId(target.id);
    void animate(dragX, 0, FLUID_CAROUSEL_SPRING);
  };

  // Horizontal trackpad/wheel 1:1 tracking with spring settle on release
  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 4) {
      const nextVal = Math.max(-260, Math.min(260, dragX.get() - e.deltaX * 1.15));
      dragX.set(nextVal);

      if (wheelSettleTimerRef.current) window.clearTimeout(wheelSettleTimerRef.current);
      wheelSettleTimerRef.current = window.setTimeout(() => {
        const current = dragX.get();
        if (current <= -90) {
          commitStep(1);
        } else if (current >= 90) {
          commitStep(-1);
        } else {
          void animate(dragX, 0, FLUID_CAROUSEL_SPRING);
        }
      }, 110);
    }
  };

  // 1:1 Touch / Pointer Swipe tracking beside the 3D model
  const handlePointerDown = (e: React.PointerEvent) => {
    const targetEl = e.target as HTMLElement | null;
    if (targetEl?.closest('button, a, input, canvas')) return;
    pointerGestureRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
      lockedAxis: null,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const g = pointerGestureRef.current;
    if (!g || !g.active) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (!g.lockedAxis && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      g.lockedAxis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    }
    if (g.lockedAxis === 'x') {
      dragX.set(Math.max(-280, Math.min(280, dx)));
    }
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent) => {
    const g = pointerGestureRef.current;
    pointerGestureRef.current = null;
    if (!g || g.lockedAxis !== 'x') {
      if (dragX.get() !== 0) void animate(dragX, 0, FLUID_CAROUSEL_SPRING);
      return;
    }
    const dx = e.clientX - g.startX;
    const elapsed = Math.max(16, Date.now() - g.startTime);
    const velocity = (dx / elapsed) * 1000;

    if (dx < -90 || velocity < -350) {
      commitStep(1);
    } else if (dx > 90 || velocity > 350) {
      commitStep(-1);
    } else {
      void animate(dragX, 0, FLUID_CAROUSEL_SPRING);
    }
  };

  return (
    <div
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      data-lenis-prevent
      className="relative z-10 flex-1 flex flex-col justify-start lg:justify-between w-full h-[calc(100vh-96px)] overflow-y-auto lg:overflow-hidden touch-pan-y"
    >
      {/* Editorial Destination Header (1:1 synced with dragX) */}
      <ErrorBoundary fallbackTitle="Destination Marquee">
        <DestinationCarouselHeader dragX={dragX} />
      </ErrorBoundary>

      {/* Center 3-Column Hairline Structural Grid */}
      <div className="relative shrink-0 lg:flex-1 w-full grid grid-cols-12 items-center min-h-0">
        {/* Left Monolith Shelf Column (Cols 1-3, desktop lg+) */}
        <div className="col-span-3 h-full hidden lg:flex items-center justify-end z-20">
          <ErrorBoundary fallbackTitle="West Shelf">
            <MonolithShelf side="left" />
          </ErrorBoundary>
        </div>

        {/* Center Interactive 3D Monument Stage Column (1:1 synced with dragX) */}
        <div className="col-span-12 lg:col-span-6 h-[48vh] min-h-[340px] lg:h-full flex flex-col items-center justify-center relative z-10 px-2">
          <ErrorBoundary fallbackTitle={activeDestination?.name ? `${activeDestination.name} Stage` : 'Architectural Stage'}>
            <ThreeStageMonument dragX={dragX} />
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
