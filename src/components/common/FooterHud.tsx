import React from 'react';
import { motion } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { CloudRain, Plus, ArrowRight } from 'lucide-react';

const POP_SPRING = { type: 'spring' as const, stiffness: 650, damping: 32, mass: 0.6 };

export const FooterHud: React.FC = () => {
  const { 
    activeDestination, 
    activeTrip, 
    activeView,
    setActiveView,
    prevDestination,
    nextDestination,
    routeStops,
    isStormDisrupted,
    toggleStormDisruption,
    setIsBucketListOpen,
    setIsIntakeModalOpen,
    setEditingTravelerId,
    travelers 
  } = usePrayana();

  // Calculate total allergies across the active cohort
  const totalAllergies = React.useMemo(() => {
    return (travelers || []).reduce((sum, t) => {
      const allergies = t.dietaryTags?.filter(d => d.includes('Allergy') || d === 'Gluten-Free') || [];
      return sum + allergies.length;
    }, 0);
  }, [travelers]);

  return (
    <footer className="relative z-30 h-12 w-full bg-[#0E0E0E] arch-hairline-x px-2.5 sm:px-4 md:px-6 flex items-center justify-between gap-2 font-mono text-[11px] tracking-hud uppercase select-none">
      {/* ========================================================
          CONTEXT 1: ON EXPLORE (3D Monument Gallery)
          ======================================================== */}
      {activeView === 'GALLERY_HOME' && (
        <>
          {/* Left: Active Destination Corridor Status */}
          <div className="min-w-0 flex-1 flex items-center space-x-1.5 sm:space-x-2.5 text-ink-primary">
            <span className="text-semantic-nominal font-bold shrink-0">[▸]</span>
            <span className="font-semibold tracking-wide truncate text-[11px] sm:text-[12px]">
              {activeDestination?.routeTitle || 'Active Expedition Corridor'}
            </span>
            <span className="text-ink-muted hidden md:inline shrink-0">—</span>
            <span className="text-ink-secondary text-[11px] hidden md:inline shrink-0">
              DAY 0{activeTrip?.dayIndex ?? 1} / 0{activeTrip?.totalDays ?? 1}
            </span>
            <span className="text-ink-muted hidden lg:inline shrink-0">·</span>
            <span className="text-semantic-nominal text-[11px] hidden lg:inline font-medium shrink-0">
              {activeDestination?.vibeMatchScore ?? 94}% VIBE MATCH
            </span>
          </div>

          {/* Right: Destination Stepper & View Itinerary CTA (Zero Duplication!) */}
          <div className="shrink-0 flex items-center space-x-1.5 sm:space-x-2 md:space-x-3">
            <div className="flex items-center space-x-0.5 sm:space-x-1 font-mono text-[11px] text-ink-secondary bg-[#151515] border border-[rgba(242,240,235,0.12)] p-0.5 whitespace-nowrap">
              <button
                onClick={prevDestination}
                className="px-1.5 sm:px-2 py-1 hover:text-ink-primary hover:bg-[#202020] transition-colors duration-100 cursor-pointer whitespace-nowrap"
                title="Previous Destination Corridor"
              >
                <span className="hidden sm:inline">[← PREV]</span>
                <span className="sm:hidden">[←]</span>
              </button>
              <span className="text-ink-muted">/</span>
              <button
                onClick={nextDestination}
                className="px-1.5 sm:px-2 py-1 hover:text-ink-primary hover:bg-[#202020] transition-colors duration-100 cursor-pointer whitespace-nowrap"
                title="Next Destination Corridor"
              >
                <span className="hidden sm:inline">[NEXT →]</span>
                <span className="sm:hidden">[→]</span>
              </button>
            </div>

            <motion.button
              onClick={() => setActiveView('ITINERARY_OUTPUT')}
              whileHover={{ y: -2, scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={POP_SPRING}
              className="mono-hud-btn px-2.5 sm:px-3 py-1.5 bg-ink-primary text-canvas font-bold hover:bg-white transition-colors duration-100 flex items-center space-x-1 cursor-pointer text-[11px] whitespace-nowrap shrink-0"
            >
              <span className="hidden sm:inline">VIEW ITINERARY</span>
              <span className="sm:hidden">ITINERARY</span>
              <ArrowRight className="w-3 h-3 ml-0.5" />
            </motion.button>
          </div>
        </>
      )}

      {/* ========================================================
          CONTEXT 2: ON ITINERARY (Workspace Operations)
          ======================================================== */}
      {activeView === 'ITINERARY_OUTPUT' && (
        <>
          {/* Left: Live Workspace Status */}
          <div className="flex items-center space-x-2.5 text-ink-primary">
            <span className="text-semantic-nominal font-bold">[▸]</span>
            <span className="font-semibold tracking-wide text-[11px] sm:text-[12px]">
              {routeStops.length} STOPS ORDERED
            </span>
            <span className="text-ink-muted hidden md:inline">·</span>
            <span className="text-ink-secondary text-[11px] hidden md:inline">
              ₹{activeTrip?.totalBudget?.toLocaleString('en-IN') ?? '45,000'} BUDGET
            </span>
            <span className="text-ink-muted hidden lg:inline">·</span>
            <span className="text-semantic-nominal text-[11px] hidden lg:inline font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-semantic-nominal animate-pulse-subtle" />
              SYNCED
            </span>
          </div>

          {/* Right: Contextual Itinerary Quick Actions */}
          <div className="flex items-center space-x-2 md:space-x-3">
            <motion.button
              onClick={toggleStormDisruption}
              whileHover={{ y: -2, scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={POP_SPRING}
              className={`mono-hud-btn px-2.5 py-1.5 border transition-colors duration-150 flex items-center space-x-1.5 cursor-pointer text-[11px] whitespace-nowrap ${
                isStormDisrupted
                  ? 'border-semantic-hazard bg-[#2b1414] text-semantic-hazard font-bold animate-pulse-subtle'
                  : 'border-[rgba(242,240,235,0.14)] bg-[#151515] text-ink-secondary hover:text-ink-primary hover:border-ink-primary'
              }`}
              title="Toggle monsoon microclimate disruption scenario"
            >
              <CloudRain className="w-3 h-3" />
              <span>{isStormDisrupted ? 'CLEAR DISRUPTION [↺]' : 'SIMULATE STORM'}</span>
            </motion.button>

            <motion.button
              onClick={() => setIsBucketListOpen(true)}
              whileHover={{ y: -2, scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={POP_SPRING}
              className="mono-hud-btn px-3 py-1.5 bg-ink-primary text-canvas font-bold hover:bg-white transition-colors flex items-center space-x-1 cursor-pointer text-[11px] whitespace-nowrap"
              title="Insert bookmarked stop from Bucket List into route"
            >
              <Plus className="w-3 h-3" />
              <span>ADD STOP [+]</span>
            </motion.button>
          </div>
        </>
      )}

      {/* ========================================================
          CONTEXT 3: ON PROFILES (Passenger & Medical Hub)
          ======================================================== */}
      {activeView === 'PROFILES' && (
        <>
          {/* Left: Group Safety & Physiology Summary */}
          <div className="flex items-center space-x-2.5 text-ink-primary">
            <span className="text-semantic-nominal font-bold">[▸]</span>
            <span className="font-semibold tracking-wide text-[11px] sm:text-[12px]">
              {travelers.length} TRAVELERS
            </span>
            <span className="text-ink-muted hidden md:inline">·</span>
            <span className="text-ink-secondary text-[11px] hidden md:inline">
              {totalAllergies} {totalAllergies === 1 ? 'ALLERGY' : 'ALLERGIES'}
            </span>
            <span className="text-ink-muted hidden lg:inline">·</span>
            <span className="text-semantic-nominal text-[11px] hidden lg:inline font-medium">
              MAX SLOPE ≤ 3.0°
            </span>
          </div>

          {/* Right: + NEW TRAVELER Intake Trigger */}
          <div className="flex items-center space-x-2 md:space-x-3">
            <motion.button
              onClick={() => {
                setEditingTravelerId(null);
                setIsIntakeModalOpen(true);
              }}
              whileHover={{ y: -2, scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={POP_SPRING}
              className="mono-hud-btn px-3 py-1.5 bg-ink-primary text-canvas font-bold hover:bg-white transition-colors flex items-center space-x-1 cursor-pointer text-[11px] whitespace-nowrap"
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
