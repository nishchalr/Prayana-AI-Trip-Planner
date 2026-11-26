import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { CockpitTab } from '../../types';
import { FLUID_GPU_ENTER, FLUID_TAB_SPRING } from '../../motion/fluidTokens';
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
    activeCockpitTab,
    setActiveCockpitTab,
  } = usePrayana();

  return (
    <div className="relative z-10 flex-1 w-full max-w-[1560px] mx-auto px-3 sm:px-4 md:px-6 pt-11 sm:pt-12 pb-4 flex flex-col justify-between overflow-y-auto select-none font-mono text-[13px]">
      <div>
        {/* Editorial Workspace Header */}
        <div className="pb-3 border-b border-[var(--hairline)] mb-3">
          <div className="text-[11px] font-mono text-ink-muted uppercase tracking-widest mb-1">
            ITINERARY WORKSPACE // CORRIDOR OPERATIONS
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink-primary tracking-tight leading-none">
            {activeDestination.routeTitle}
          </h1>
          <div className="text-[12px] text-ink-secondary mt-1.5 uppercase tracking-wide">
            {activeDestination.region} · DAY 0{activeTrip.dayIndex} OF 0{activeTrip.totalDays} · TRANSIT: {activeTrip.transitMode.toUpperCase()}
          </div>
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

        {/* Immediate GPU-Only Sub-View Stage (Zero Hold Pause) */}
        <motion.div
          key={activeCockpitTab}
          initial={FLUID_GPU_ENTER.initial}
          animate={FLUID_GPU_ENTER.animate}
          transition={FLUID_GPU_ENTER.transition}
          className="w-full transform-gpu"
        >
          {activeCockpitTab === 'ROUTE_TIMELINE' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pb-12">
              <div className="lg:col-span-7">
                <DualModeRouteMap />
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
        </motion.div>
      </div>
    </div>
  );
};
