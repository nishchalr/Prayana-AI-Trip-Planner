import React, { useEffect, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { usePrayana } from '../../context/PrayanaContext';
import { INITIAL_DESTINATIONS } from '../../data/mockData';
import { MotionValue, animate, useMotionValue } from 'framer-motion';
import { FLUID_CAROUSEL_SPRING } from '../../motion/fluidTokens';

interface DestinationCarouselHeaderProps {
  dragX?: MotionValue<number>;
}

export const DestinationCarouselHeader: React.FC<DestinationCarouselHeaderProps> = ({
  dragX: externalDragX,
}) => {
  const { destinations, activeDestinationId, setActiveDestinationId, theme } = usePrayana();
  const isLight = theme === 'light';

  const fallbackDragX = useMotionValue(0);
  const dragX = externalDragX ?? fallbackDragX;

  const safeDests = destinations && destinations.length > 0 ? destinations : INITIAL_DESTINATIONS;
  const rawIdx = safeDests.findIndex((d) => d.id === activeDestinationId);
  const currentIndex = rawIdx >= 0 ? rawIdx : 0;

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'center',
    skipSnaps: false,
    dragFree: false,
    startIndex: currentIndex,
  });

  const syncingExternalRef = useRef(false);

  // Sync external destination changes (e.g. TripWizardModal or GalleryHome wheel) to Embla without snap-back
  useEffect(() => {
    if (!emblaApi) return;
    if (emblaApi.selectedScrollSnap() !== currentIndex) {
      syncingExternalRef.current = true;
      emblaApi.scrollTo(currentIndex);
      window.setTimeout(() => {
        syncingExternalRef.current = false;
      }, 280);
    }
  }, [emblaApi, currentIndex]);

  // Listen to Embla selection & 1:1 scroll progress to drive 3D stage tilt smoothly with zero flash
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      if (syncingExternalRef.current) return;
      const snap = emblaApi.selectedScrollSnap();
      const target = safeDests[snap];
      if (target && target.id !== activeDestinationId) {
        setActiveDestinationId(target.id);
      }
      void animate(dragX, 0, FLUID_CAROUSEL_SPRING);
    };

    const onScroll = () => {
      const snaps = emblaApi.scrollSnapList();
      if (!snaps || snaps.length === 0) return;
      const progress = emblaApi.scrollProgress();
      const selected = emblaApi.selectedScrollSnap();
      const snapPos = snaps[selected] ?? 0;
      let delta = snapPos - progress;
      if (delta > 0.5) delta -= 1;
      if (delta < -0.5) delta += 1;
      const px = Math.max(-240, Math.min(240, delta * snaps.length * 160));
      dragX.set(px);
    };

    emblaApi.on('select', onSelect);
    emblaApi.on('scroll', onScroll);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('scroll', onScroll);
    };
  }, [emblaApi, safeDests, activeDestinationId, setActiveDestinationId, dragX]);

  const handleSlideClick = (idx: number) => {
    if (!emblaApi) {
      const target = safeDests[idx];
      if (target) setActiveDestinationId(target.id);
      return;
    }
    if (idx === currentIndex) return;
    const prevIdx = (currentIndex - 1 + safeDests.length) % safeDests.length;
    const nextIdx = (currentIndex + 1) % safeDests.length;
    if (idx === prevIdx) {
      emblaApi.scrollPrev();
    } else if (idx === nextIdx) {
      emblaApi.scrollNext();
    } else {
      emblaApi.scrollTo(idx);
    }
  };

  return (
    <div className="relative z-20 shrink-0 w-full pt-2.5 sm:pt-4 pb-1.5 sm:pb-2 px-3 sm:px-6 flex flex-col items-center justify-center select-none overflow-hidden">
      {/* Embla Native 1:1 Inertial Swipe Viewport */}
      <div
        ref={emblaRef}
        className="w-full max-w-5xl overflow-hidden cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-baseline touch-pan-y">
          {safeDests.map((dest, idx) => {
            const isCurrent = idx === currentIndex;
            const prevIdx = (currentIndex - 1 + safeDests.length) % safeDests.length;
            const nextIdx = (currentIndex + 1) % safeDests.length;
            const isPrev = idx === prevIdx;
            const isNext = idx === nextIdx;

            return (
              <div
                key={dest.id}
                className="flex-[0_0_56%] sm:flex-[0_0_38%] md:flex-[0_0_34%] min-w-0 px-2 flex flex-col items-center justify-center text-center"
              >
                <button
                  type="button"
                  onClick={() => handleSlideClick(idx)}
                  aria-current={isCurrent ? 'true' : undefined}
                  title={isPrev ? `Previous: ${dest.name}` : isNext ? `Next: ${dest.name}` : dest.name}
                  className="group focus:outline-none cursor-pointer w-full flex flex-col items-center"
                >
                  {isCurrent ? (
                    <>
                      <h1
                        className={`font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight leading-none ${
                          isLight
                            ? 'text-[#111111]'
                            : 'text-[#F2F0EB] drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]'
                        }`}
                      >
                        {dest.name}
                      </h1>
                      <div
                        className={`font-mono text-[10px] sm:text-[12px] tracking-wideHud uppercase mt-1 leading-snug whitespace-normal break-words ${
                          isLight ? 'text-[#666666]' : 'text-ink-secondary'
                        }`}
                      >
                        {dest.region} · {dest.historicalPeriod}
                      </div>
                    </>
                  ) : (
                    <>
                      <span
                        className={`font-serif text-lg sm:text-3xl md:text-5xl lg:text-6xl tracking-tight transition-colors block truncate max-w-full ${
                          isLight
                            ? 'text-[#8A8882] group-hover:text-[#4A4945]'
                            : 'text-[#6A6862] sm:text-[#4A4945] group-hover:text-[#8A8882]'
                        }`}
                      >
                        {dest.name}
                      </span>
                      {(isPrev || isNext) && (
                        <div
                          className={`font-mono text-[10px] sm:text-[11px] uppercase tracking-widest flex items-center justify-center space-x-1 mt-0.5 transition-colors ${
                            isLight
                              ? 'text-[#8A8882] group-hover:text-[#4A4945]'
                              : 'text-[#6A6862] sm:text-[#4A4945] group-hover:text-[#8A8882]'
                          }`}
                        >
                          {isPrev ? (
                            <>
                              <span className="sm:hidden">[←]</span>
                              <span className="hidden sm:inline">[← PREV]</span>
                            </>
                          ) : (
                            <>
                              <span className="sm:hidden">[→]</span>
                              <span className="hidden sm:inline">[NEXT →]</span>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
