import React, { useRef, useState } from 'react';
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
import { Network, CreditCard, Utensils, Camera, CloudRain, Compass, Menu, X, Trash2 } from 'lucide-react';

const SUB_TABS: Array<{
  id: CockpitTab;
  shortLabel: string;
  desktopLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'ROUTE_TIMELINE', shortLabel: 'ROUTE', desktopLabel: '01 // ROUTE', icon: Network },
  { id: 'BUDGET', shortLabel: 'BUDGET', desktopLabel: '02 // BUDGET', icon: CreditCard },
  { id: 'DINING', shortLabel: 'DINING', desktopLabel: '03 // DINING & STAYS', icon: Utensils },
  { id: 'OCR_ALLERGEN', shortLabel: 'TRANSLATE', desktopLabel: '04 // TRANSLATOR', icon: Camera },
  { id: 'TRAVELLING', shortLabel: 'TRAVEL', desktopLabel: '05 // TRAVELLING', icon: Compass },
  { id: 'DISRUPTION_SAFETY', shortLabel: 'MED & ALERTS', desktopLabel: '06 // MED KIT & DISCREPANCIES', icon: CloudRain },
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
    isMobileRailOpen,
    toggleMobileRail,
    hasPlannedTrip,
    setIsWizardOpen,
    clearEntireItinerary,
    activeSharedTrip,
    canEditSchedule,
    requestEditAccess,
    grantEditAccess,
    currentUser,
  } = usePrayana();

  const totalDays = Math.max(1, activeTrip.totalDays || 1);
  const dayNumbers = Array.from({ length: totalDays }, (_, i) => i + 1);
  const subViewRef = useRef<HTMLDivElement | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
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

  if (!hasPlannedTrip) {
    return (
      <div className="relative z-10 flex-1 w-full max-w-[1560px] mx-auto px-4 md:px-6 flex items-center justify-center select-none font-mono">
        <div className="p-8 prayana-glass text-center max-w-md space-y-4">
          <div className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest">
            ITINERARY WORKSPACE // STANDBY
          </div>
          <h2 className="font-serif text-3xl text-[var(--ink-primary)] tracking-tight">
            No Active Expedition Planned
          </h2>
          <p className="text-[12px] text-[var(--ink-secondary)] font-sans leading-relaxed">
            Select your destination, travel dates, co-travellers, and day-wise schedule in the 3-step Trip Architect to populate your live itinerary.
          </p>
          <button
            type="button"
            onClick={() => setIsWizardOpen(true)}
            className="mono-hud-btn px-5 py-2.5 bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold text-[12px] cursor-pointer"
          >
            [ PLAN A TRIP (+) ]
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-lenis-prevent className="relative z-10 flex-1 w-full max-w-[1560px] mx-auto px-3 sm:px-4 md:px-6 pt-11 sm:pt-12 pb-4 flex flex-col justify-between overflow-y-auto select-none font-mono text-[13px]">
      <div>
        {/* Editorial Workspace Header */}
        <div className="pb-2.5 border-b border-[var(--hairline)] mb-2.5 flex flex-col lg:flex-row lg:items-end justify-between gap-2">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl text-ink-primary tracking-tight leading-none">
              {activeDestination.routeTitle}
            </h1>
            <div className="text-[11px] text-ink-secondary mt-1 uppercase tracking-wide flex flex-wrap items-center gap-2">
              <span>{activeDestination.region} · DAY {String(activeDay).padStart(2, '0')} OF {String(totalDays).padStart(2, '0')}</span>
              {activeSharedTrip && (
                <span className="px-1.5 py-0.5 border border-emerald-400/50 text-emerald-400 text-[9px] font-bold">
                  COLLAB TRIP · HOST: {activeSharedTrip.hostName.toUpperCase()}
                </span>
              )}
              {!canEditSchedule && (
                <button
                  type="button"
                  onClick={() => void requestEditAccess()}
                  className="px-2 py-0.5 border border-amber-400/60 bg-amber-500/15 text-amber-300 text-[9px] font-bold cursor-pointer"
                >
                  {(activeSharedTrip?.editRequestUids || []).includes(currentUser?.uid || '')
                    ? 'EDIT ACCESS REQUESTED (HOST ONLY)'
                    : 'HOST ONLY · [ REQUEST EDIT ACCESS ]'}
                </button>
              )}
              {activeSharedTrip &&
                activeSharedTrip.hostUid === currentUser?.uid &&
                (activeSharedTrip.editRequestUids || []).map((reqUid) => (
                  <button
                    key={reqUid}
                    type="button"
                    onClick={() => void grantEditAccess(reqUid)}
                    className="px-2 py-0.5 border border-emerald-400/60 bg-emerald-500/15 text-emerald-300 text-[9px] font-bold cursor-pointer"
                  >
                    [ GRANT EDIT ACCESS ({reqUid.slice(0, 6)}) ]
                  </button>
                ))}
            </div>
          </div>

          {/* Desktop Synchronized Multi-Day Switcher */}
          {renderDaySwitcher('desktop')}
        </div>

        {/* 6-Tab Fixed-Width Single-Line Sub-Navigation Bar + Inline Curl Toggle */}
        <div
          className="mb-4 pb-3 border-b border-[var(--hairline)] flex items-center justify-between gap-1.5"
          role="tablist"
          aria-label="Itinerary Sub-Navigation"
        >
          <div className="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0 overflow-hidden lg:overflow-visible">
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
                  className={`relative h-9 flex items-center justify-center text-[10px] sm:text-[11px] leading-none whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer z-10 border transform-gpu ${
                    isActive
                      ? 'w-[96px] px-2 lg:flex-1 lg:min-w-[128px] lg:px-3 text-[var(--bg-canvas)] font-bold border-[var(--ink-primary)]'
                      : 'w-9 lg:flex-1 lg:min-w-[128px] lg:px-3 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] bg-[var(--bg-surface)] border-[var(--hairline)]'
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
                        className="lg:hidden ml-1 tracking-wide truncate"
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

          {/* 7th Icon: Clear / Delete Entire Itinerary */}
          <button
            type="button"
            onClick={() => setIsClearModalOpen(true)}
            aria-label="Clear entire itinerary"
            title="Clear entire itinerary"
            className="w-9 h-9 shrink-0 flex items-center justify-center border border-rose-500/35 text-rose-400/80 hover:bg-rose-500/15 bg-[var(--bg-surface)] transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleMobileRail}
            aria-label={isMobileRailOpen ? 'Collapse Quick Actions' : 'Expand Quick Actions'}
            aria-expanded={isMobileRailOpen}
            className="lg:hidden w-9 h-9 shrink-0 flex items-center justify-center border border-[var(--hairline-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:border-[var(--ink-primary)] transition-colors cursor-pointer"
          >
            {isMobileRailOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
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
          {activeCockpitTab === 'TRAVELLING' && <TravellingPage />}
          {activeCockpitTab === 'DISRUPTION_SAFETY' && <DisruptionKitPage />}
        </div>
      </div>

      {/* Clear Entire Itinerary Confirmation Modal */}
      {isClearModalOpen && (
        <div
          onClick={() => setIsClearModalOpen(false)}
          className="fixed inset-0 z-50 prayana-backdrop flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm p-5 prayana-glass space-y-4 shadow-2xl"
          >
            <div className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest">
              ITINERARY RESET
            </div>
            <h3 className="font-serif text-2xl text-[var(--ink-primary)]">
              Clear entire itinerary?
            </h3>
            <p className="text-[12px] text-[var(--ink-secondary)] font-sans">
              This removes the active trip, scheduled stops, and logged expenses from this workspace.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="px-3.5 py-1.5 border border-[var(--hairline-strong)] text-[11px] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
              >
                [ CANCEL ]
              </button>
              <button
                type="button"
                onClick={() => {
                  clearEntireItinerary();
                  setIsClearModalOpen(false);
                }}
                className="px-3.5 py-1.5 border border-rose-400/50 bg-rose-500/20 text-rose-300 font-bold text-[11px] cursor-pointer"
              >
                [ CLEAR ITINERARY ]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
