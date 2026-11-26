import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { CockpitTab } from '../../types';
import { FLUID_GLIDE, FLUID_SPRING } from '../../motion/fluidTokens';
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
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'ROUTE_TIMELINE', label: '01 // ROUTE & TIMELINE', icon: Network },
  { id: 'BUDGET', label: '02 // LIVE BUDGET', icon: CreditCard },
  { id: 'DINING', label: '03 // DINING & STAYS', icon: Utensils },
  { id: 'OCR_ALLERGEN', label: '04 // TRANSLATOR', icon: Camera },
  { id: 'DISRUPTION_SAFETY', label: '05 // DISRUPTION & KIT', icon: CloudRain },
  { id: 'TRAVELLING', label: '06 // TRAVELLING', icon: Compass },
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

        {/* 5-Tab Itinerary Sub-Navigation Bar */}
        <div
          className="mb-4 pb-3 border-b border-[var(--hairline)] flex flex-col xl:flex-row xl:items-center justify-between gap-2"
          role="tablist"
          aria-label="Itinerary Sub-Navigation"
        >
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0">
            {SUB_TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeCockpitTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveCockpitTab(tab.id)}
                  className={`relative px-3 py-2 flex items-center space-x-1.5 text-[12px] sm:text-[13px] leading-none whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer z-10 border ${
                    isActive
                      ? '!text-[#0E0E0E] font-bold border-ink-primary'
                      : 'text-ink-secondary hover:text-ink-primary bg-[#161616] border-[var(--hairline)]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeItinerarySubNav"
                      className="absolute inset-0 bg-ink-primary -z-10 shadow-sm"
                      transition={FLUID_SPRING}
                    />
                  )}
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-ink-muted shrink-0 hidden sm:block">
            WORKSPACE MODULE: <span className="text-semantic-nominal font-bold">DEDICATED VIEW</span>
          </div>
        </div>

        {/* Fluid Parallel Sub-View Stage */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={activeCockpitTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={FLUID_GLIDE}
            className="w-full gpu-fluid"
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
        </AnimatePresence>
      </div>
    </div>
  );
};
