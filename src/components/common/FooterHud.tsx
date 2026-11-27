/**
 * FooterHud
 *
 * Bottom dock — context-sensitive per active view.
 *
 * GALLERY_HOME:
 *   Left  = active route summary (title · day · vibe match · xl: offline + API + HR)
 *   Right = SAVED (n) | DISPATCH | VIEW ITINERARY →
 *   Removed: [← PREV] / [NEXT →] carousel nav (lives in DestinationCarouselHeader)
 *
 * ITINERARY_OUTPUT:
 *   Left  = stops ordered · budget · synced
 *   Right = SIMULATE STORM / CLEAR DISRUPTION  |  ADD STOP [+]
 *
 * PROFILES:
 *   Left  = traveler count · allergies · slope cap
 *   Right = NEW TRAVELER [+]
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { CloudRain, Plus, ArrowRight, Bookmark, Share2, Heart } from 'lucide-react';
import { FLUID_SPRING } from '../../motion/fluidTokens';

const POP_SPRING = FLUID_SPRING;

export const FooterHud: React.FC = () => {
  const {
    activeDestination,
    activeTrip,
    activeView,
    setActiveView,
    routeStops,
    isStormDisrupted,
    toggleStormDisruption,
    wishlistIds,
    setIsBucketListOpen,
    setIsShareHubOpen,
    setIsVitalsDrawerOpen,
    setIsIntakeModalOpen,
    setEditingTravelerId,
    travelers,
    liveVitals,
    apiStatus,
    refreshApiStatus,
  } = usePrayana();

  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const totalAllergies = React.useMemo(() => {
    return (travelers || []).reduce((sum, t) => {
      const allergies = t.dietaryTags?.filter((d) => d.includes('Allergy') || d === 'Gluten-Free') || [];
      return sum + allergies.length;
    }, 0);
  }, [travelers]);

  return (
    <footer className="relative z-30 h-12 w-full bg-[var(--bg-canvas)] arch-hairline-x px-2.5 sm:px-4 lg:px-5 flex items-center justify-between gap-2 font-mono text-[11px] tracking-hud uppercase select-none">

      {/* ════════════════════════════════════════════════════════════════
          CONTEXT 1: EXPLORE — 3D Monument Gallery
          ════════════════════════════════════════════════════════════════ */}
      {activeView === 'GALLERY_HOME' && (
        <>
          {/* Left: active corridor summary + inline passive telemetry (xl+) */}
          <div className="min-w-0 flex-1 flex items-center space-x-2 text-[var(--ink-primary)]">
            <span className="text-semantic-nominal font-bold shrink-0">[▸]</span>
            <span className="font-semibold tracking-wide truncate text-[11px] sm:text-[12px]">
              {activeDestination?.routeTitle || 'Active Expedition Corridor'}
            </span>
            <span className="text-[var(--ink-muted)] hidden md:inline shrink-0">·</span>
            <span className="text-[var(--ink-secondary)] text-[11px] hidden md:inline shrink-0 whitespace-nowrap">
              DAY 0{activeTrip?.dayIndex ?? 1} / 0{activeTrip?.totalDays ?? 1}
            </span>
            <span className="text-[var(--ink-muted)] hidden lg:inline shrink-0">·</span>
            <span className="text-semantic-nominal text-[11px] hidden lg:inline font-medium shrink-0 whitespace-nowrap">
              {activeDestination?.vibeMatchScore ?? 94}% VIBE MATCH
            </span>

            {/* Passive telemetry strip — xl screens only */}
            <div className="hidden xl:flex items-center space-x-2 pl-2 ml-1 border-l border-[var(--hairline)] text-[11px] text-[var(--ink-secondary)] shrink-0 whitespace-nowrap">
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-semantic-nominal' : 'bg-semantic-caution'}`} />
                <span>{isOnline ? 'OFFLINE READY' : 'OFFLINE LOCAL'}</span>
              </span>
              <span className="text-[var(--ink-muted)]">·</span>
              <button
                type="button"
                onClick={() => refreshApiStatus()}
                className={`cursor-pointer hover:underline ${
                  apiStatus === 'LIVE' ? 'text-semantic-nominal' : 'text-[var(--ink-muted)]'
                }`}
                title="Re-check FastAPI backend status"
              >
                API {apiStatus}
              </button>
              <span className="text-[var(--ink-muted)]">·</span>
              <button
                type="button"
                onClick={() => setIsVitalsDrawerOpen(true)}
                className="flex items-center gap-1 hover:text-[var(--ink-primary)] cursor-pointer transition-colors"
                title="Open Wearable Telemetry & Vitals Drawer"
              >
                <Heart className="w-3 h-3 text-semantic-nominal" />
                <span>{liveVitals.heartRate} BPM</span>
              </button>
            </div>
          </div>

          {/* Right: SAVED (n) · DISPATCH · VIEW ITINERARY → */}
          <div className="shrink-0 flex items-center space-x-1.5 sm:space-x-2">
            <motion.button
              type="button"
              onClick={() => setIsBucketListOpen(true)}
              whileHover={{ y: -1.5, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={POP_SPRING}
              className="mono-hud-btn px-2 sm:px-2.5 py-1.5 border border-[var(--hairline)] bg-[var(--bg-surface)] text-[var(--ink-primary)] transition-colors flex items-center space-x-1 cursor-pointer text-[11px] whitespace-nowrap shrink-0"
              title="Open Saved Bucket List"
            >
              <Bookmark className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">SAVED ({wishlistIds.length})</span>
              <span className="sm:hidden">{wishlistIds.length}</span>
            </motion.button>

            <motion.button
              type="button"
              onClick={() => setIsShareHubOpen(true)}
              whileHover={{ y: -1.5, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={POP_SPRING}
              className="mono-hud-btn px-2 sm:px-2.5 py-1.5 border border-[var(--hairline)] bg-[var(--bg-surface)] text-[var(--ink-primary)] transition-colors flex items-center space-x-1 cursor-pointer text-[11px] whitespace-nowrap shrink-0"
              title="Open Archival Trip Summary & Offline Share Dispatch"
            >
              <Share2 className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">SHARE &amp; PDF</span>
            </motion.button>

            <motion.button
              type="button"
              onClick={() => setActiveView('ITINERARY_OUTPUT')}
              whileHover={{ y: -1.5, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={POP_SPRING}
              className="mono-hud-btn px-2.5 sm:px-3.5 py-1.5 bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold transition-colors flex items-center space-x-1 cursor-pointer text-[11px] whitespace-nowrap shrink-0"
            >
              <span className="hidden sm:inline">VIEW ITINERARY</span>
              <span className="sm:hidden">ITINERARY</span>
              <ArrowRight className="w-3 h-3 ml-0.5" />
            </motion.button>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════
          CONTEXT 2: ITINERARY — Workspace Operations
          ════════════════════════════════════════════════════════════════ */}
      {activeView === 'ITINERARY_OUTPUT' && (
        <>
          <div className="flex items-center space-x-2.5 text-[var(--ink-primary)]">
            <span className="text-semantic-nominal font-bold">[▸]</span>
            <span className="font-semibold tracking-wide text-[11px] sm:text-[12px]">
              {routeStops.length} STOPS ORDERED
            </span>
            <span className="text-[var(--ink-muted)] hidden md:inline">·</span>
            <span className="text-[var(--ink-secondary)] text-[11px] hidden md:inline">
              ₹{activeTrip?.totalBudget?.toLocaleString('en-IN') ?? '45,000'} BUDGET
            </span>
            <span className="text-[var(--ink-muted)] hidden lg:inline">·</span>
            <span className="text-semantic-nominal text-[11px] hidden lg:inline font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-semantic-nominal animate-pulse-subtle" />
              SYNCED
            </span>
          </div>

          <div className="flex items-center space-x-2 md:space-x-3">
            <motion.button
              onClick={toggleStormDisruption}
              whileHover={{ y: -1.5, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={POP_SPRING}
              className={`mono-hud-btn px-2.5 py-1.5 border transition-colors duration-150 flex items-center space-x-1.5 cursor-pointer text-[11px] whitespace-nowrap ${
                isStormDisrupted
                  ? 'border-semantic-hazard bg-[#B91C1C]/12 text-semantic-hazard font-bold animate-pulse-subtle'
                  : 'border-[var(--hairline)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:border-[var(--ink-primary)]'
              }`}
              title="Toggle monsoon microclimate disruption scenario"
            >
              <CloudRain className="w-3 h-3" />
              <span>{isStormDisrupted ? 'CLEAR DISRUPTION [↺]' : 'SIMULATE STORM'}</span>
            </motion.button>

            <motion.button
              onClick={() => setIsBucketListOpen(true)}
              whileHover={{ y: -1.5, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={POP_SPRING}
              className="mono-hud-btn px-3 py-1.5 bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold transition-colors flex items-center space-x-1 cursor-pointer text-[11px] whitespace-nowrap"
              title="Insert bookmarked stop from Bucket List into route"
            >
              <Plus className="w-3 h-3" />
              <span>ADD STOP [+]</span>
            </motion.button>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════
          CONTEXT 3: PROFILES — Passenger & Medical Hub
          ════════════════════════════════════════════════════════════════ */}
      {activeView === 'PROFILES' && (
        <>
          <div className="flex items-center space-x-2.5 text-[var(--ink-primary)]">
            <span className="text-semantic-nominal font-bold">[▸]</span>
            <span className="font-semibold tracking-wide text-[11px] sm:text-[12px]">
              {travelers.length} TRAVELERS
            </span>
            <span className="text-[var(--ink-muted)] hidden md:inline">·</span>
            <span className="text-[var(--ink-secondary)] text-[11px] hidden md:inline">
              {totalAllergies} {totalAllergies === 1 ? 'ALLERGY' : 'ALLERGIES'}
            </span>
            <span className="text-[var(--ink-muted)] hidden lg:inline">·</span>
            <span className="text-semantic-nominal text-[11px] hidden lg:inline font-medium">
              MAX SLOPE ≤ 3.0°
            </span>
          </div>

          <div className="flex items-center space-x-2 md:space-x-3">
            <motion.button
              onClick={() => { setEditingTravelerId(null); setIsIntakeModalOpen(true); }}
              whileHover={{ y: -1.5, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={POP_SPRING}
              className="mono-hud-btn px-3 py-1.5 bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold transition-colors flex items-center space-x-1 cursor-pointer text-[11px] whitespace-nowrap"
            >
              <Plus className="w-3 h-3" />
              <span>NEW TRAVELER</span>
            </motion.button>
          </div>
        </>
      )}
    </footer>
  );
};
