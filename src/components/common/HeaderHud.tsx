import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { PrayanaLogo3D } from './PrayanaLogo3D';
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
  LogOut,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { FLUID_SPRING } from '../../motion/fluidTokens';

const POP_SPRING = FLUID_SPRING;

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
    refreshApiStatus,
    theme,
    toggleTheme
  } = usePrayana();

  const [isTravelerMenuOpen, setIsTravelerMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
    setIsMobileMenuOpen(false);
    setActiveView(view);
  };

  return (
    <header className="relative z-30 h-12 w-full bg-[#0E0E0E] arch-hairline-b px-3 sm:px-6 flex items-center justify-between font-mono text-[11px] tracking-hud uppercase select-none">
      {/* Left: Minimalist Wordmark & Desktop Primary Navigation */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        <motion.button 
          onClick={() => navigateTo('GALLERY_HOME')}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={POP_SPRING}
          style={{ color: theme === 'light' ? '#0E0E0E' : '#FFFFFF' }}
          className="font-medium tracking-[0.2em] transition-colors flex items-center gap-2 cursor-pointer"
          title="Return to Explore (3D Monument Gallery)"
        >
          <PrayanaLogo3D size={32} theme={theme} />
          <span className="font-mono text-xs font-bold tracking-widest">PRAYANA</span>
        </motion.button>

        <span className="hidden md:inline text-ink-muted">/</span>

        {/* Desktop Primary Views: EXPLORE · ITINERARY · PROFILES */}
        <nav className="hidden md:flex items-center space-x-1 sm:space-x-1.5" aria-label="Primary Navigation">
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

      {/* Right: Global Utilities (Desktop full bar; Mobile concise [♥ BPM] + PLAN [+] + [MENU ☰]) */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        {/* Offline / PWA Readiness Indicator */}
        <div
          className={`${isOnline ? 'hidden 2xl:flex' : 'hidden lg:flex'} items-center space-x-1.5 px-2 py-1 border bg-[#121212] shrink-0 ${
            isOnline
              ? 'border-[rgba(242,240,235,0.14)] text-ink-secondary'
              : 'border-amber-500/40 text-amber-400'
          }`}
          title={
            isOnline
              ? 'PWA Service Worker Precached — Ready for Airplane Mode'
              : 'Network Offline — Local Prayana Engine & Cached Assets Active'
          }
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isOnline ? 'bg-semantic-nominal' : 'bg-amber-400 animate-pulse-subtle'
            }`}
          />
          <span className="font-mono text-[9px] whitespace-nowrap">
            {isOnline ? '[ OFFLINE READY ]' : '[ NETWORK: OFFLINE — LOCAL ENGINE ACTIVE ]'}
          </span>
        </div>

        {/* Theme Toggle: [ ☀ LIGHT ] / [ ☾ DARK ] (Desktop) */}
        <motion.button
          onClick={toggleTheme}
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          transition={POP_SPRING}
          className="hidden md:flex items-center space-x-1 px-2 py-1 border border-[var(--hairline)] hover:border-ink-primary bg-[var(--bg-surface)] text-ink-primary transition-colors duration-100 cursor-pointer text-[9px] whitespace-nowrap shrink-0"
          title={`Switch to ${theme === 'dark' ? 'Swiss Paper Light' : 'Architectural Noir Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
          <span>{theme === 'dark' ? '[ ☀ LIGHT ]' : '[ ☾ DARK ]'}</span>
        </motion.button>

        {/* API Connection Indicator (Desktop) */}
        <button
          onClick={() => refreshApiStatus()}
          className="hidden lg:flex items-center space-x-1.5 px-2 py-1 border border-[rgba(242,240,235,0.14)] bg-[#121212] transition-colors cursor-pointer shrink-0"
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

        {/* 1. Bucket List Trigger: SAVED (n) (Desktop) */}
        <motion.button
          onClick={() => setIsBucketListOpen(true)}
          whileHover={{ y: -2, scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          transition={POP_SPRING}
          className="hidden md:flex items-center space-x-1 px-2 py-1 border border-[rgba(242,240,235,0.12)] hover:border-ink-primary bg-[#151515] text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer text-[10px]"
          title="Open Personal Bucket List"
        >
          <Bookmark className="w-3 h-3" />
          <span className="hidden lg:inline">SAVED ({wishlistIds.length})</span>
        </motion.button>

        {/* 2. Share & Dispatch Hub: DISPATCH (Desktop) */}
        <motion.button
          onClick={() => setIsShareHubOpen(true)}
          whileHover={{ y: -2, scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          transition={POP_SPRING}
          className="hidden md:flex items-center space-x-1 px-2 py-1 border border-[rgba(242,240,235,0.12)] hover:border-ink-primary bg-[#151515] text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer text-[10px]"
          title="Open Archival Trip Summary & Offline Share Hub"
        >
          <Share2 className="w-3 h-3" />
          <span className="hidden lg:inline">DISPATCH</span>
        </motion.button>

        {/* 3. Live Wearable Fitband & Vitals Drawer Trigger (Always visible: compact BPM on mobile) */}
        <motion.button
          onClick={() => setIsVitalsDrawerOpen(true)}
          whileHover={{ y: -2, scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          transition={POP_SPRING}
          className="group relative flex items-center space-x-1.5 px-2 py-1 border border-[rgba(242,240,235,0.14)] hover:border-ink-primary bg-[#151515] transition-colors duration-100 cursor-pointer shrink-0"
          title="Open Wearable Telemetry (Web Bluetooth BLE & Manual Simulator)"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${getStrainColor(liveVitals.strainLevel)} animate-pulse-subtle`} />
          <Heart className="w-3 h-3 text-semantic-nominal" />
          <span className="text-ink-primary font-mono text-[9px] sm:text-[10px] whitespace-nowrap">
            {liveVitals.heartRate} BPM<span className="hidden md:inline"> · {liveVitals.strainLevel}</span>
          </span>
        </motion.button>

        {/* 4. Active Traveler Switcher (Desktop) */}
        <div className="relative hidden md:block">
          <motion.button
            onClick={() => setIsTravelerMenuOpen(prev => !prev)}
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={POP_SPRING}
            className="flex items-center space-x-1 px-2 py-1 border border-[rgba(242,240,235,0.14)] hover:border-ink-primary bg-[#151515] text-ink-primary text-[9px] sm:text-[10px] transition-colors duration-100 cursor-pointer whitespace-nowrap shrink-0"
            title="Switch Active Traveler"
          >
            <Users className="w-3 h-3 text-ink-secondary shrink-0" />
            <span>[ G{travelers?.length ?? 0} · {travelers.length > 0 ? (activeTraveler?.name || 'Traveler').split(' ')[0] : 'EMPTY'} ▾ ]</span>
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
              {travelers.length === 0 ? (
                <div className="px-3 py-2 text-[9px] text-ink-muted uppercase">
                  No traveler profiles in cohort
                </div>
              ) : (
                travelers.map(t => {
                  const isActive = t.id === activeTraveler?.id;
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
                })
              )}

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

        {/* 5. AI Copilot Drawer Trigger: COPILOT [⌘K] (Desktop) */}
        <motion.button
          onClick={() => setIsCopilotDrawerOpen(true)}
          whileHover={{ y: -2, scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          transition={POP_SPRING}
          className="hidden md:flex mono-hud-btn px-2 py-1 border border-[rgba(242,240,235,0.18)] hover:border-ink-primary bg-[#151515] text-ink-primary hover:bg-ink-primary hover:text-canvas transition-colors items-center space-x-1 cursor-pointer text-[10px] whitespace-nowrap shrink-0"
          title="Open Gemini AI Trip Copilot (⌘K / Ctrl+K)"
        >
          <Sparkles className="w-3 h-3 shrink-0" />
          <span className="hidden 2xl:inline">COPILOT [⌘K]</span>
          <span className="hidden lg:inline 2xl:hidden">COPILOT</span>
        </motion.button>

        {/* 6. Plan Trip Wizard CTA: PLAN [+] (Always visible) */}
        <motion.button
          onClick={() => setIsWizardOpen(true)}
          whileHover={{ y: -2, scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          transition={POP_SPRING}
          className="mono-hud-btn px-2.5 py-1 bg-ink-primary text-canvas font-bold hover:bg-white transition-colors flex items-center space-x-1 cursor-pointer text-[10px] whitespace-nowrap shrink-0"
          title="Launch 3-Step Expedition Architect Wizard"
        >
          <span className="hidden 2xl:inline">PLAN TRIP [+]</span>
          <span className="2xl:hidden">PLAN [+]</span>
        </motion.button>

        {/* Mobile Menu Trigger (< md) */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(prev => !prev)}
          aria-label="Toggle Mobile Navigation Menu"
          className="flex md:hidden items-center space-x-1 px-2 py-1 border border-[rgba(242,240,235,0.22)] bg-[#151515] text-ink-primary text-[10px] cursor-pointer shrink-0"
        >
          {isMobileMenuOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
          <span>MENU</span>
        </button>
      </div>

      {/* Full-Width Monochrome Mobile Drawer (< md) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-x-0 top-12 z-50 bg-[#0E0E0E] border-b border-[rgba(242,240,235,0.22)] shadow-2xl p-4 space-y-3 md:hidden max-h-[calc(100vh-48px)] overflow-y-auto">
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => navigateTo('GALLERY_HOME')}
              className={`py-2 px-2 border text-center text-[10px] cursor-pointer ${
                activeView === 'GALLERY_HOME'
                  ? 'bg-[#F2F0EB] text-[#0E0E0E] border-[#F2F0EB] font-bold'
                  : 'bg-[#151515] text-[#F2F0EB] border-[rgba(242,240,235,0.14)]'
              }`}
            >
              EXPLORE
            </button>
            <button
              type="button"
              onClick={() => navigateTo('ITINERARY_OUTPUT')}
              className={`py-2 px-2 border text-center text-[10px] cursor-pointer ${
                activeView === 'ITINERARY_OUTPUT'
                  ? 'bg-[#F2F0EB] text-[#0E0E0E] border-[#F2F0EB] font-bold'
                  : 'bg-[#151515] text-[#F2F0EB] border-[rgba(242,240,235,0.14)]'
              }`}
            >
              ITINERARY
            </button>
            <button
              type="button"
              onClick={() => navigateTo('PROFILES')}
              className={`py-2 px-2 border text-center text-[10px] cursor-pointer ${
                activeView === 'PROFILES'
                  ? 'bg-[#F2F0EB] text-[#0E0E0E] border-[#F2F0EB] font-bold'
                  : 'bg-[#151515] text-[#F2F0EB] border-[rgba(242,240,235,0.14)]'
              }`}
            >
              PROFILES ({travelers.length})
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsBucketListOpen(true);
              }}
              className="py-2 px-2 bg-[#151515] border border-[rgba(242,240,235,0.14)] text-ink-primary flex items-center justify-center gap-1 text-[10px] cursor-pointer"
            >
              <Bookmark className="w-3 h-3" />
              <span>SAVED ({wishlistIds.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsShareHubOpen(true);
              }}
              className="py-2 px-2 bg-[#151515] border border-[rgba(242,240,235,0.14)] text-ink-primary flex items-center justify-center gap-1 text-[10px] cursor-pointer"
            >
              <Share2 className="w-3 h-3" />
              <span>DISPATCH</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsCopilotDrawerOpen(true);
              }}
              className="py-2 px-2 bg-[#151515] border border-[rgba(242,240,235,0.18)] text-ink-primary flex items-center justify-center gap-1 text-[10px] cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>COPILOT</span>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="py-2 px-2 bg-[#151515] border border-[rgba(242,240,235,0.18)] text-ink-primary flex items-center justify-center gap-1 text-[10px] cursor-pointer col-span-3"
            >
              {theme === 'dark' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
              <span>{theme === 'dark' ? '[ ☀ SWITCH TO LIGHT MODE ]' : '[ ☾ SWITCH TO DARK MODE ]'}</span>
            </button>
          </div>

          {/* Mobile Traveler Switcher */}
          <div className="border-t border-[rgba(242,240,235,0.12)] pt-2.5">
            <div className="text-[9px] text-ink-muted mb-1.5 flex flex-wrap items-center justify-between gap-1">
              <span>TRAVELER SWITCHER</span>
              <div className="flex items-center gap-2">
                <span className={isOnline ? 'text-semantic-nominal' : 'text-amber-400'}>
                  {isOnline ? '[ OFFLINE READY ]' : '[ NETWORK: OFFLINE — LOCAL ENGINE ACTIVE ]'}
                </span>
                <span className={apiStatus === 'LIVE' ? 'text-semantic-nominal' : 'text-ink-muted'}>
                  [ API: {apiStatus} ]
                </span>
              </div>
            </div>
            {travelers.length === 0 ? (
              <div className="text-[10px] text-ink-muted py-1">No traveler profiles in cohort</div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {travelers.map(t => {
                  const isActive = t.id === activeTraveler?.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setActiveTravelerId(t.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`px-2.5 py-1.5 border text-left text-[10px] cursor-pointer flex items-center justify-between ${
                        isActive
                          ? 'bg-[#1D1D1D] border-[#F2F0EB] text-[#F2F0EB] font-bold'
                          : 'bg-[#141414] border-[rgba(242,240,235,0.12)] text-ink-secondary'
                      }`}
                    >
                      <span className="truncate">{t.name.split(' ')[0]} ({t.age}y)</span>
                      {isActive && <Check className="w-3 h-3 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-[rgba(242,240,235,0.12)] pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                logoutUser();
              }}
              className="px-3 py-1.5 border border-semantic-hazard/50 bg-[#251313] text-semantic-hazard text-[10px] flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>[ SIGN OUT ]</span>
            </button>
            <button
              type="button"
              onClick={() => refreshApiStatus()}
              className="px-2.5 py-1.5 border border-[rgba(242,240,235,0.14)] text-[9px] text-ink-secondary cursor-pointer"
            >
              RE-CHECK API
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
