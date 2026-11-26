import React from 'react';
import { usePrayana } from '../../context/PrayanaContext';
import { INITIAL_DESTINATIONS } from '../../data/mockData';
import {
  AnimatePresence,
  MotionValue,
  PanInfo,
  animate,
  motion,
  useMotionValue,
  useTransform,
} from 'framer-motion';
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

  const getAt = (offset: number) => {
    const idx = (currentIndex + offset + safeDests.length) % safeDests.length;
    return safeDests[idx] || safeDests[0];
  };

  const prevDest = getAt(-1);
  const currentDest = safeDests[currentIndex] || safeDests[0];
  const nextDest = getAt(1);

  // 1:1 real-time transforms for active, outgoing, and incoming destinations
  const activeTranslateX = useTransform(dragX, [-240, 0, 240], [-110, 0, 110]);
  const activeOpacity = useTransform(dragX, [-240, 0, 240], [0.25, 1, 0.25]);
  const activeScale = useTransform(dragX, [-240, 0, 240], [0.92, 1, 0.92]);

  const prevTranslateX = useTransform(dragX, [-240, 0, 240], [-40, 0, 75]);
  const prevScale = useTransform(dragX, [-240, 0, 240], [0.9, 1, 1.14]);
  const prevOpacity = useTransform(dragX, [-240, 0, 240], [0.35, 0.72, 1]);

  const nextTranslateX = useTransform(dragX, [-240, 0, 240], [-75, 0, 40]);
  const nextScale = useTransform(dragX, [-240, 0, 240], [1.14, 1, 0.9]);
  const nextOpacity = useTransform(dragX, [-240, 0, 240], [1, 0.72, 0.35]);

  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    dragX.set(Math.max(-260, Math.min(260, info.offset.x)));
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 90 || info.velocity.x > 350) {
      setActiveDestinationId(prevDest.id);
      dragX.set(-120);
      void animate(dragX, 0, FLUID_CAROUSEL_SPRING);
    } else if (info.offset.x < -90 || info.velocity.x < -350) {
      setActiveDestinationId(nextDest.id);
      dragX.set(120);
      void animate(dragX, 0, FLUID_CAROUSEL_SPRING);
    } else {
      void animate(dragX, 0, FLUID_CAROUSEL_SPRING);
    }
  };

  return (
    <div className="relative z-20 w-full pt-2.5 sm:pt-4 pb-1.5 sm:pb-2 px-3 sm:px-6 flex flex-col items-center justify-center select-none overflow-hidden">
      {/* Editorial Destination Marquee: 1:1 Gesture Tracking */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.28}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="w-full max-w-5xl grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:flex items-center md:items-baseline md:justify-center gap-2 sm:gap-6 md:gap-0 md:space-x-16 lg:space-x-28 cursor-grab active:cursor-grabbing"
      >
        {/* Previous Destination */}
        <motion.button
          type="button"
          onClick={() => setActiveDestinationId(prevDest.id)}
          style={{ x: prevTranslateX, scale: prevScale, opacity: prevOpacity }}
          className="group text-left md:text-center transition-colors duration-150 focus:outline-none cursor-pointer min-w-0"
          title={`Previous: ${prevDest.name}`}
        >
          <span
            className={`font-serif text-lg sm:text-3xl md:text-5xl lg:text-6xl tracking-tight transition-colors block truncate ${
              isLight
                ? 'text-[#8A8882] group-hover:text-[#4A4945]'
                : 'text-[#6A6862] sm:text-[#4A4945] group-hover:text-[#8A8882]'
            }`}
          >
            {prevDest.name}
          </span>
          <div
            className={`font-mono text-[10px] sm:text-[11px] uppercase tracking-widest flex items-center justify-start md:justify-center space-x-1 mt-0.5 transition-colors ${
              isLight
                ? 'text-[#8A8882] group-hover:text-[#4A4945]'
                : 'text-[#6A6862] sm:text-[#4A4945] group-hover:text-[#8A8882]'
            }`}
          >
            <span className="sm:hidden">[←]</span>
            <span className="hidden sm:inline">[← PREV]</span>
          </div>
        </motion.button>

        {/* Current Active Destination */}
        <motion.div
          style={{ x: activeTranslateX, opacity: activeOpacity, scale: activeScale }}
          className="text-center shrink-0 min-w-0 max-w-[205px] sm:max-w-none px-1"
        >
          <motion.div
            key={currentDest.id}
            initial={{ opacity: 0, transform: 'translate3d(0, -6px, 0) scale(0.98)' }}
            animate={{ opacity: 1, transform: 'translate3d(0, 0px, 0) scale(1)' }}
            transition={FLUID_CAROUSEL_SPRING}
            className="text-center pointer-events-none transform-gpu"
          >
            <h1
              className={`font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight leading-none ${
                isLight
                  ? 'text-[#111111]'
                  : 'text-[#F2F0EB] drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]'
              }`}
            >
              {currentDest.name}
            </h1>
            <div
              className={`font-mono text-[10px] sm:text-[12px] tracking-wideHud uppercase mt-1 leading-snug whitespace-normal break-words ${
                isLight ? 'text-[#666666]' : 'text-ink-secondary'
              }`}
            >
              {currentDest.region} · {currentDest.historicalPeriod}
            </div>
          </motion.div>
        </motion.div>

        {/* Next Destination */}
        <motion.button
          type="button"
          onClick={() => setActiveDestinationId(nextDest.id)}
          style={{ x: nextTranslateX, scale: nextScale, opacity: nextOpacity }}
          className="group text-right md:text-center transition-colors duration-150 focus:outline-none cursor-pointer min-w-0"
          title={`Next: ${nextDest.name}`}
        >
          <span
            className={`font-serif text-lg sm:text-3xl md:text-5xl lg:text-6xl tracking-tight transition-colors block truncate ${
              isLight
                ? 'text-[#8A8882] group-hover:text-[#4A4945]'
                : 'text-[#6A6862] sm:text-[#4A4945] group-hover:text-[#8A8882]'
            }`}
          >
            {nextDest.name}
          </span>
          <div
            className={`font-mono text-[10px] sm:text-[11px] uppercase tracking-widest flex items-center justify-end md:justify-center space-x-1 mt-0.5 transition-colors ${
              isLight
                ? 'text-[#8A8882] group-hover:text-[#4A4945]'
                : 'text-[#6A6862] sm:text-[#4A4945] group-hover:text-[#8A8882]'
            }`}
          >
            <span className="sm:hidden">[→]</span>
            <span className="hidden sm:inline">[NEXT →]</span>
          </div>
        </motion.button>
      </motion.div>
    </div>
  );
};
