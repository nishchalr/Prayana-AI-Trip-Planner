import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { PrayanaLogo } from './PrayanaLogo';
import { 
  Heart, 
  Users, 
  Plus, 
  ChevronDown, 
  Check, 
  ShieldAlert, 
  Bookmark, 
  Share2,
  Sparkles,
  LogOut 
} from 'lucide-react';

const POP_SPRING = { type: 'spring' as const, stiffness: 420, damping: 24 };

export const HeaderHud: React.FC = () => {
  const { 
    travelers, 
    activeTraveler, 
    setActiveTravelerId,
    liveVitals, 
    activeView,
    setActiveView,
    setActiveStopId,
    setIsVitalsDrawerOpen, 
    setIsWizardOpen,
    wishlistIds,
    setIsBucketListOpen,
    setIsShareHubOpen,
    setIsCopilotDrawerOpen,
    activeAdvisory,
    logoutUser,
    currentUser,
    apiStatus,
    refreshApiStatus 
  } = usePrayana();

  const [isTravelerMenuOpen, setIsTravelerMenuOpen] = useState(false);

  // Status dot color based on strain
  const getStrainColor = (strain: string) => {
    switch (strain) {
      case 'ELEVATED':
        return 'bg-semantic-hazard shadow-[0_0_8px_rgba(220,38,38,0.6)]';
      case 'MODERATE':
        return 'bg-semantic-caution shadow-[0_0_8px_rgba(217,119,6,0.5)]';
      case 'LOW':
      default:
        return 'bg-semantic-nominal shadow-[0_0_8px_rgba(16,185,129,0.5)]';
    }
  };

  const navigateTo = (view: 'GALLERY_HOME' | 'PROFILES' | 'ITINERARY_OUTPUT') => {
    setActiveStopId(null);
    setActiveView(view);
  };

  return (
    <header className="relative z-30 h-12 w-full bg-[#0E0E0E] arch-hairline-b px-3 sm:px-6 flex items-center justify-between font-mono text-[11px] tracking-hud uppercase select-none">
      {/* Left: Minimalist Wordmark & Primary Navigation (3 items max) */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        <motion.button 
          onClick={() => navigateTo('GALLERY_HOME')}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={POP_SPRING}
          className="text-ink-primary font-medium tracking-[0.2em] hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
          title="Return to Explore (3D Monument Gallery)"
        >
          <PrayanaLogo className="w-6 h-6" showRing />
          <span className="font-mono text-xs font-bold tracking-widest">PRAYANA</span>
        </motion.button>

        <span className="text-ink-muted">/</span>

        {/* Primary Views: EXPLORE · ITINERARY · PROFILES */}
        <nav className="flex items-center space-x-1 sm:space-x-1.5" aria-label="Primary Navigation">
          <motion.button
            onClick={() => navigateTo('GALLERY_HOME')}
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={POP_SPRING}
            className={`px-2.5 py-0.5 transition-colors cursor-pointer text-[10px] ${
              activeView === 'GALLERY_HOME'
                ? '!bg-ink-primary !text-[#0E0E0E] font-bold'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            EXPLORE
          </motion.button>
          <motion.button
            onClick={() => navigateTo('ITINERARY_OUTPUT')}
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={POP_SPRING}
            className={`px-2.5 py-0.5 transition-colors cursor-pointer text-[10px] ${
              activeView === 'ITINERARY_OUTPUT'
                ? '!bg-ink-primary !text-[#0E0E0E] font-bold'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            ITINERARY
          </motion.button>
          <motion.button
            onClick={() => navigateTo('PROFILES')}
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={POP_SPRING}
            className={`px-2.5 py-0.5 transition-colors cursor-pointer text-[10px] ${
              activeView === 'PROFILES'
                ? '!bg-ink-primary !text-[#0E0E0E] font-bold'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            PROFILES ({travelers.length})
          </motion.button>
        </nav>

        {/* Live Top-Rail Caution/Advisory Ticker if Active */}
        {activeAdvisory && (
          <motion.div 
            onClick={() => setIsVitalsDrawerOpen(true)}
            whileHover={{ scale: 1.03 }}
            className="hidden 2xl:flex items-center space-x-1.5 text-[9px] text-semantic-hazard bg-[#261515] border border-semantic-hazard/40 px-2 py-0.5 cursor-pointer animate-pulse-subtle ml-2"
          >
            <ShieldAlert className="w-3 h-3" />
            <span className="truncate max-w-xs">{activeAdvisory}</span>
          </motion.div>
        )}
      </div>

      {/* Right: Global Utilities (Strictly in Top Navbar Only) */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        {/* API Connection Indicator */}
        <button
          onClick={() => refreshApiStatus()}
          className="hidden md:flex items-center space-x-1.5 px-2 py-1 border border-[rgba(242,240,235,0.14)] bg-[#121212] transition-colors cursor-pointer shrink-0"
          title="FastAPI Backend Status (click to re-check liveness)"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              apiStatus === 'LIVE'
                ? 'bg-semantic-nominal animate-pulse-subtle'
                : apiStatus === 'CONNECTING'
                ? 'bg-amber-400 animate-pulse-subtle'
                : 'bg-semantic-hazard'
            }`}
          />
          <span
            className={`font-mono text-[9px] ${
              apiStatus === 'LIVE'
                ? 'text-semantic-nominal'
                : 'text-ink-muted'
            }`}
          >
            [ API: {apiStatus} ]
          </span>
        </button>

        {/* 1. Bucket List Trigger: SAVED (n) */}
        <motion.button
          onClick={() => setIsBucketListOpen(true)}
          whileHover={{ y: -2, scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          transition={POP_SPRING}
          className="flex items-center space-x-1 px-2 py-1 border border-[rgba(242,240,235,0.12)] hover:border-ink-primary bg-[#151515] text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer text-[10px]"
          title="Open Personal Bucket List"
        >
          <Bookmark className="w-3 h-3" />
          <span className="hidden md:inline">SAVED ({wishlistIds.length})</span>
        </motion.button>

        {/* 2. Share & Dispatch Hub: DISPATCH */}
        <motion.button
          onClick={() => setIsShareHubOpen(true)}
          whileHover={{ y: -2, scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          transition={POP_SPRING}
          className="flex items-center space-x-1 px-2 py-1 border border-[rgba(242,240,235,0.12)] hover:border-ink-primary bg-[#151515] text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer text-[10px]"
          title="Open Archival Trip Summary & Offline Share Hub"
        >
          <Share2 className="w-3 h-3" />
          <span className="hidden md:inline">DISPATCH</span>
        </motion.button>

        {/* 3. Live Google Health Vitals Drawer Trigger */}
        <motion.button
          onClick={() => setIsVitalsDrawerOpen(true)}
          whileHover={{ y: -2, scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          transition={POP_SPRING}
          className="group relative flex items-center space-x-1.5 px-2 py-1 border border-[rgba(242,240,235,0.14)] hover:border-ink-primary bg-[#151515] transition-all cursor-pointer"
          title="Open Google Health Wearable Telemetry & Fitband Simulator"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${getStrainColor(liveVitals.strainLevel)} animate-pulse-subtle`} />
          <Heart className="w-3 h-3 text-semantic-nominal" />
          <span className="text-ink-primary font-mono text-[9px] sm:text-[10px]">
            {liveVitals.heartRate} BPM · {liveVitals.strainLevel}
          </span>
        </motion.button>

        {/* 4. Active Traveler Switcher */}
        <div className="relative">
          <motion.button
            onClick={() => setIsTravelerMenuOpen(prev => !prev)}
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={POP_SPRING}
            className="flex items-center space-x-1 px-2 py-1 border border-[rgba(242,240,235,0.14)] hover:border-ink-primary bg-[#151515] text-ink-primary text-[9px] sm:text-[10px] transition-all cursor-pointer"
            title="Switch Active Traveler"
          >
            <Users className="w-3 h-3 text-ink-secondary" />
            <span>[ G{travelers?.length ?? 1} · {(activeTraveler?.name || 'Traveler').split(' ')[0]} ▾ ]</span>
          </motion.button>

          {/* Traveler Dropdown Menu */}
          {isTravelerMenuOpen && (
            <div 
              className="absolute right-0 top-full mt-1.5 w-64 bg-[#151515] border border-[rgba(242,240,235,0.2)] shadow-2xl py-1 z-50 text-[10px]"
              onMouseLeave={() => setIsTravelerMenuOpen(false)}
            >
              <div className="px-3 py-1.5 text-ink-secondary text-[9px] border-b border-[rgba(242,240,235,0.08)] tracking-widest flex justify-between items-center">
                <span>SWITCH TRAVELER</span>
                <button
                  onClick={() => {
                    setIsTravelerMenuOpen(false);
                    navigateTo('PROFILES');
                  }}
                  className="text-ink-primary hover:underline cursor-pointer"
                >
                  MANAGE ALL →
                </button>
              </div>
              {travelers.map(t => {
                const isActive = t.id === activeTraveler.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTravelerId(t.id);
                      setIsTravelerMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[rgba(242,240,235,0.08)] transition-colors cursor-pointer ${
                      isActive ? 'bg-[rgba(242,240,235,0.1)] text-ink-primary font-semibold' : 'text-ink-secondary'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span>{t.name}</span>
                        <span className="text-[9px] text-ink-muted">({t.age}y)</span>
                      </div>
                      <div className="text-[8px] text-ink-muted uppercase">
                        {t.mobility} · {t.vitals.strainLevel} STRAIN
                      </div>
                    </div>
                    {isActive && <Check className="w-3 h-3 text-ink-primary" />}
                  </button>
                );
              })}

              {/* Sign Out Option */}
              <div className="border-t border-[rgba(242,240,235,0.1)] mt-1 pt-1">
                <button
                  onClick={() => {
                    setIsTravelerMenuOpen(false);
                    logoutUser();
                  }}
                  className="w-full text-left px-3 py-2 flex items-center justify-between text-semantic-hazard hover:bg-[rgba(255,107,107,0.1)] transition-colors cursor-pointer font-mono text-[9px] tracking-widest uppercase"
                >
                  <span className="flex items-center space-x-1.5">
                    <LogOut className="w-3 h-3" />
                    <span>[ SIGN OUT ]</span>
                  </span>
                  <span className="text-[8px] text-ink-muted">SYS.AUTH</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 5. AI Copilot Drawer Trigger: COPILOT [⌘K] */}
        <motion.button
          onClick={() => setIsCopilotDrawerOpen(true)}
          whileHover={{ y: -2, scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          transition={POP_SPRING}
          className="mono-hud-btn px-2.5 py-1 border border-[rgba(242,240,235,0.18)] hover:border-ink-primary bg-[#151515] text-ink-primary hover:bg-ink-primary hover:text-canvas transition-colors flex items-center space-x-1.5 cursor-pointer text-[10px]"
          title="Open Gemini AI Trip Copilot (⌘K / Ctrl+K)"
        >
          <Sparkles className="w-3 h-3" />
          <span className="hidden sm:inline">COPILOT [⌘K]</span>
        </motion.button>

        {/* 6. Plan Trip Wizard CTA: PLAN TRIP [+] */}
        <motion.button
          onClick={() => setIsWizardOpen(true)}
          whileHover={{ y: -2, scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          transition={POP_SPRING}
          className="mono-hud-btn px-2.5 py-1 bg-ink-primary text-canvas font-bold hover:bg-white transition-colors flex items-center space-x-1 cursor-pointer text-[10px]"
          title="Launch 3-Step Expedition Architect Wizard"
        >
          <span>PLAN TRIP [+]</span>
        </motion.button>
      </div>
    </header>
  );
};
