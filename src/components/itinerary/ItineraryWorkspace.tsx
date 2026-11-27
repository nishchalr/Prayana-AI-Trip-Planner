import React, { useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { CockpitTab } from '../../types';
import { FLUID_TAB_SPRING } from '../../motion/fluidTokens';
import { useGsapEnter } from '../../motion/gsapAnimations';
import { DualModeRouteMap } from './DualModeRouteMap';
import { DraggableTimeline } from './DraggableTimeline';
import { BudgetPage } from './pages/BudgetPage';
import { DiningStaysPage } from './pages/DiningStaysPage';
import { OcrScannerPage } from './pages/OcrScannerPage';
import { DisruptionKitPage } from './pages/DisruptionKitPage';
import { TravellingPage } from './pages/TravellingPage';
import { Network, CreditCard, Utensils, Camera, CloudRain, Compass } from 'lucide-react';

const SUB_TABS: Array<{
  id: CockpitTab;
  shortLabel: string;
  desktopLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'ROUTE_TIMELINE', shortLabel: 'ROUTE', desktopLabel: '01 // ROUTE', icon: Network },
  { id: 'BUDGET', shortLabel: 'BUDGET', desktopLabel: '02 // BUDGET', icon: CreditCard },
  { id: 'DINING', shortLabel: 'DINING & STAYS', desktopLabel: '03 // DINING & STAYS', icon: Utensils },
  { id: 'OCR_ALLERGEN', shortLabel: 'TRANSLATOR', desktopLabel: '04 // TRANSLATOR', icon: Camera },
  { id: 'DISRUPTION_SAFETY', shortLabel: 'DISRUPTION', desktopLabel: '05 // DISRUPTION', icon: CloudRain },
  { id: 'TRAVELLING', shortLabel: 'TRAVELLING', desktopLabel: '06 // TRAVELLING', icon: Compass },
];

export const ItineraryWorkspace: React.FC = () => {
  const {
    activeDestination,
    activeTrip,
    activeDay,
    setActiveDay,
    routeStops,
    activeCockpitTab,
    setActiveCockpitTab,
  } = usePrayana();

  const totalDays = Math.max(1, activeTrip.totalDays || 1);
  const dayNumbers = Array.from({ length: totalDays }, (_, i) => i + 1);
  const subViewRef = useRef<HTMLDivElement | null>(null);
  useGsapEnter(subViewRef, [activeCockpitTab], 6);

  const renderDaySwitcher = (variant: 'desktop' | 'mobile') => (
    <div
      className={
        variant === 'desktop'
          ? 'hidden lg:flex items-center gap-1 overflow-x-auto pb-0.5 shrink-0'
          : 'flex lg:hidden items-center gap-1.5 overflow-x-auto py-2 px-1 border-y border-[var(--hairline)] bg-[var(--bg-surface)]'
      }
      role="tablist"
      aria-label="Trip Day Switcher"
    >
      {dayNumbers.map((dayNum) => {
        const isDayActive = activeDay === dayNum;
        const dayStopCount = routeStops.filter(s => (s.day ?? 1) === dayNum).length;
        return (
          <button
            key={`${variant}-day-${dayNum}`}
            type="button"
            role="tab"
            aria-selected={isDayActive}
            onClick={() => setActiveDay(dayNum)}
            className={`relative px-2.5 py-1.5 text-[11px] leading-none whitespace-nowrap border transition-colors duration-150 cursor-pointer z-10 shrink-0 ${
              isDayActive
                ? 'text-[var(--bg-canvas)] font-bold border-[var(--ink-primary)]'
                : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] bg-[var(--bg-surface)] border-[var(--hairline)]'
            }`}
          >
            {isDayActive && (
              <motion.div
                layoutId={`activeDayPill-${variant}`}
                className="absolute inset-0 bg-[var(--ink-primary)] -z-10 shadow-sm"
                transition={FLUID_TAB_SPRING}
              />
            )}
            <span>DAY {String(dayNum).padStart(2, '0')}</span>
            <span className={`ml-1 text-[10px] ${isDayActive ? 'opacity-80' : 'text-[var(--ink-muted)]'}`}>
              ({dayStopCount})
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div data-lenis-prevent className="relative z-10 flex-1 w-full max-w-[1560px] mx-auto px-3 sm:px-4 md:px-6 pt-11 sm:pt-12 pb-4 flex flex-col justify-between overflow-y-auto select-none font-mono text-[13px]">
      <div>
        {/* Editorial Workspace Header */}
        <div className="pb-3 border-b border-[var(--hairline)] mb-3 flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-mono text-ink-muted uppercase tracking-widest mb-1">
              ITINERARY WORKSPACE // CORRIDOR OPERATIONS
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-ink-primary tracking-tight leading-none">
              {activeDestination.routeTitle}
            </h1>
            <div className="text-[12px] text-ink-secondary mt-1.5 uppercase tracking-wide">
              {activeDestination.region} · DAY {String(activeDay).padStart(2, '0')} OF {String(totalDays).padStart(2, '0')} · TRANSIT: {activeTrip.transitMode.toUpperCase()}
            </div>
          </div>

          {/* Desktop Synchronized Multi-Day Switcher */}
          {renderDaySwitcher('desktop')}
        </div>

        {/* 6-Tab Expanding Square-Icon Morphing Sub-Navigation Bar */}
        <div
          className="mb-4 pb-3 border-b border-[var(--hairline)] flex items-center"
          role="tablist"
          aria-label="Itinerary Sub-Navigation"
        >
          <div className="flex items-center gap-1 sm:gap-1.5 w-full overflow-hidden lg:overflow-visible">
            {SUB_TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeCockpitTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  layout
                  transition={FLUID_TAB_SPRING}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={tab.desktopLabel}
                  title={tab.desktopLabel}
                  onClick={() => setActiveCockpitTab(tab.id)}
                  className={`relative h-9 flex items-center justify-center text-[11px] sm:text-[12px] leading-none whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer z-10 border transform-gpu ${
                    isActive
                      ? 'px-3 lg:px-3 text-[var(--bg-canvas)] font-bold border-[var(--ink-primary)]'
                      : 'w-9 lg:w-auto lg:px-3 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] bg-[var(--bg-surface)] border-[var(--hairline)]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeItinerarySubNav"
                      className="absolute inset-0 bg-[var(--ink-primary)] -z-10 shadow-sm"
                      transition={FLUID_TAB_SPRING}
                    />
                  )}
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.span
                        key={`${tab.id}-mobile-label`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        className="lg:hidden ml-1.5 tracking-wide"
                      >
                        {tab.shortLabel}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <span className="hidden lg:inline ml-1.5">{tab.desktopLabel}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* GSAP GPU-Only Sub-View Stage (Zero Hold Pause) */}
        <div
          ref={subViewRef}
          key={activeCockpitTab}
          className="w-full"
        >
          {activeCockpitTab === 'ROUTE_TIMELINE' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pb-12">
              <div className="lg:col-span-7">
                <DualModeRouteMap />
              </div>
              {/* Mobile Multi-Day Switcher directly below Map/Elevation and above Day Schedule */}
              <div className="lg:hidden">
                {renderDaySwitcher('mobile')}
              </div>
              <div className="lg:col-span-5 min-h-[420px] lg:h-auto">
                <DraggableTimeline />
              </div>
            </div>
          )}

          {activeCockpitTab === 'BUDGET' && <BudgetPage />}
          {activeCockpitTab === 'DINING' && <DiningStaysPage />}
          {activeCockpitTab === 'OCR_ALLERGEN' && <OcrScannerPage />}
          {activeCockpitTab === 'DISRUPTION_SAFETY' && <DisruptionKitPage />}
          {activeCockpitTab === 'TRAVELLING' && <TravellingPage />}
        </div>
      </div>
    </div>
  );
};
