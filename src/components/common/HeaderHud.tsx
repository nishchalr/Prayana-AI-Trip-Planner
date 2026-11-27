/**
 * HeaderHud
 *
 * Top bar layout (left → right):
 *   PrayanaLogo · PRAYANA  |  HOME  |  ITINERARY  |  PROFILES (n)
 *                            ☀ LIGHT / ☾ DARK  |  ● TOOLS ▾  |  PRAYANA AI [⌘K]  |  PLAN TRIP [+]
 *
 * TOOLS ▾ strictly contains:
 *   • [ OFFLINE READY ] cache / network status
 *   • [ API: LIVE ]    FastAPI engine status
 *   • Wearable HR  XX BPM   (opens VitalsDrawer)
 *   • [ SIGN OUT ]          (desktop account sign-out)
 *
 * Mobile MENU (< md) cleanly holds compact sections:
 *   • ITINERARY | SAVED | DISPATCH
 *   • API / OFFLINE STATUS + Wearable HR
 *   • [ SIGN OUT ]
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { PrayanaLogo } from './PrayanaLogo';
import {
  FLUID_BACKDROP_TRANSITION,
  FLUID_MODAL_TRANSITION,
  FLUID_SPRING,
} from '../../motion/fluidTokens';
import {
  Heart,
  ShieldAlert,
  Sparkles,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  SlidersHorizontal,
  Wifi,
  WifiOff,
  Server,
  RefreshCw,
  Bookmark,
  Share2,
  Map,
} from 'lucide-react';

const POP_SPRING = FLUID_SPRING;

export const HeaderHud: React.FC = () => {
  const {
    travelers,
    primarySelfProfile,
    currentUser,
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
    apiStatus,
    refreshApiStatus,
    theme,
    toggleTheme,
  } = usePrayana();

  const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.navigator.onLine : true
  );

  const systemMenuRef = useRef<HTMLDivElement>(null);

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

  // Close TOOLS popover on outside click
  useEffect(() => {
    const handleOutside = (e: PointerEvent) => {
      if (systemMenuRef.current && !systemMenuRef.current.contains(e.target as Node)) {
        setIsSystemMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', handleOutside);
    return () => window.removeEventListener('pointerdown', handleOutside);
  }, []);

  const getStrainColor = (strain: string) => {
    switch (strain) {
      case 'ELEVATED': return 'bg-semantic-hazard shadow-[0_0_8px_rgba(185,28,28,0.45)]';
      case 'MODERATE': return 'bg-semantic-caution shadow-[0_0_8px_rgba(180,83,9,0.4)]';
      default: return 'bg-semantic-nominal shadow-[0_0_8px_rgba(4,120,87,0.4)]';
    }
  };

  const navigateTo = (view: 'GALLERY_HOME' | 'PROFILES' | 'ITINERARY_OUTPUT') => {
    setActiveStopId(null);
    setIsMobileMenuOpen(false);
    setIsSystemMenuOpen(false);
    setActiveView(view);
  };

  return (
    <header className="relative z-40 h-12 w-full bg-[var(--bg-canvas)] arch-hairline-b px-3 lg:px-5 flex items-center justify-between font-mono text-[11px] tracking-hud uppercase select-none">
      {/* ── ZONE 1 (LEFT): Brand + Primary Views ── */}
      <div className="flex items-center space-x-2.5 lg:space-x-3 shrink-0">
        {/* Logo + wordmark */}
        <motion.button
          onClick={() => navigateTo('GALLERY_HOME')}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={POP_SPRING}
          className="font-medium tracking-[0.2em] transition-colors flex items-center gap-2 cursor-pointer text-[var(--ink-primary)] hover:text-[var(--ink-primary)]"
          title="Return to Home (3D Monument Gallery)"
        >
          <PrayanaLogo className="w-6 h-6" showRing />
          <span className="font-mono text-xs font-bold tracking-widest text-[var(--ink-primary)]">PRAYANA</span>
        </motion.button>

        <span className="hidden md:inline text-[var(--ink-muted)]">/</span>

        {/* Desktop nav: HOME · ITINERARY · PROFILES (n) */}
        <nav className="hidden md:flex items-center space-x-1" aria-label="Primary Navigation">
          {(['GALLERY_HOME', 'ITINERARY_OUTPUT', 'PROFILES'] as const).map((view) => {
            const label =
              view === 'GALLERY_HOME'
                ? 'HOME'
                : view === 'ITINERARY_OUTPUT'
                ? 'ITINERARY'
                : `PROFILES (${travelers.length})`;
            return (
              <motion.button
                key={view}
                onClick={() => navigateTo(view)}
                whileHover={{ y: -1.5, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={POP_SPRING}
                className={`px-2.5 py-1 transition-colors cursor-pointer text-[11px] whitespace-nowrap ${
                  activeView === view
                    ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold'
                    : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                }`}
              >
                {label}
              </motion.button>
            );
          })}
        </nav>

        {/* Active advisory chip — wide-only */}
        {activeAdvisory && (
          <motion.button
            type="button"
            onClick={() => setIsVitalsDrawerOpen(true)}
            whileHover={{ scale: 1.03 }}
            className="hidden xl:flex items-center space-x-1.5 text-[11px] text-semantic-hazard bg-red-950/20 border border-semantic-hazard/40 px-2 py-0.5 cursor-pointer animate-pulse-subtle ml-1"
            title={activeAdvisory}
          >
            <ShieldAlert className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[180px]">{activeAdvisory}</span>
          </motion.button>
        )}
      </div>

      {/* ── ZONE 2 (RIGHT): Tools + Copilot + Plan Trip ── */}
      <div className="flex items-center space-x-1.5 lg:space-x-2">

        {/* ① Theme toggle */}
        <motion.button
          type="button"
          onClick={toggleTheme}
          whileHover={{ y: -1.5, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={POP_SPRING}
          className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 border border-[var(--hairline)] hover:border-[var(--ink-primary)] bg-[var(--bg-surface)] text-[var(--ink-primary)] transition-colors cursor-pointer text-[11px] whitespace-nowrap shrink-0"
          title={`Switch to ${theme === 'dark' ? 'Swiss Paper Light' : 'Architectural Noir Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
          <span className="hidden lg:inline">{theme === 'dark' ? '☀ LIGHT' : '☾ DARK'}</span>
        </motion.button>

        {/* ② TOOLS ▾ popover — strictly: Offline / API / Wearable HR */}
        <div className="relative hidden md:block" ref={systemMenuRef}>
          <motion.button
            type="button"
            onClick={() => setIsSystemMenuOpen((prev) => !prev)}
            whileHover={{ y: -1.5, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={POP_SPRING}
            className={`flex items-center space-x-1.5 px-2.5 py-1 border transition-colors cursor-pointer text-[11px] whitespace-nowrap shrink-0 ${
              isSystemMenuOpen
                ? 'border-[var(--ink-primary)] bg-[var(--bg-elevated)] text-[var(--ink-primary)] font-semibold'
                : 'border-[var(--hairline)] hover:border-[var(--ink-primary)] bg-[var(--bg-surface)] text-[var(--ink-primary)]'
            }`}
            title="System Telemetry, Wearable Vitals"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                !isOnline
                  ? 'bg-amber-400 animate-pulse-subtle'
                  : apiStatus === 'LIVE'
                  ? 'bg-semantic-nominal animate-pulse-subtle'
                  : 'bg-semantic-caution'
              }`}
            />
            <SlidersHorizontal className="w-3 h-3 text-[var(--ink-secondary)]" />
            <span>TOOLS</span>
            <span className="text-[var(--ink-secondary)]">▾</span>
          </motion.button>

          <AnimatePresence>
            {isSystemMenuOpen && (
              <motion.div
                {...FLUID_MODAL_TRANSITION}
                className="absolute right-0 top-full mt-1.5 w-80 bg-[var(--bg-surface)] border border-[var(--hairline-strong)] shadow-2xl p-2.5 z-50 space-y-2 transform-gpu"
              >
                <div className="px-2 py-1 text-[11px] text-[var(--ink-muted)] border-b border-[var(--hairline)] tracking-widest flex items-center justify-between gap-2 whitespace-nowrap">
                  <span>SYSTEM TELEMETRY &amp; TOOLS</span>
                  <span className="text-semantic-nominal shrink-0">{apiStatus}</span>
                </div>

                {/* Status readouts */}
                <div className="px-2.5 py-2 bg-[var(--bg-canvas)] border border-[var(--hairline)] space-y-1.5 text-[11px]">
                  {/* Cache & Network */}
                  <div className="flex items-center justify-between gap-2 whitespace-nowrap">
                    <span className="flex items-center gap-1.5 text-[var(--ink-secondary)] shrink-0">
                      {isOnline ? (
                        <Wifi className="w-3 h-3 text-semantic-nominal" />
                      ) : (
                        <WifiOff className="w-3 h-3 text-semantic-caution" />
                      )}
                      <span>CACHE &amp; NETWORK</span>
                    </span>
                    <span className={`shrink-0 ${isOnline ? 'text-semantic-nominal font-semibold' : 'text-semantic-caution font-semibold'}`}>
                      {isOnline ? '[ OFFLINE READY ]' : '[ OFFLINE LOCAL ]'}
                    </span>
                  </div>

                  {/* FastAPI engine */}
                  <div className="flex items-center justify-between gap-2 whitespace-nowrap">
                    <span className="flex items-center gap-1.5 text-[var(--ink-secondary)] shrink-0">
                      <Server className="w-3 h-3 text-[var(--ink-muted)]" />
                      <span>FASTAPI ENGINE</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => refreshApiStatus()}
                      className="flex items-center gap-1 text-[var(--ink-primary)] hover:underline cursor-pointer font-semibold shrink-0 whitespace-nowrap"
                      title="Re-check FastAPI backend status"
                    >
                      <span className={apiStatus === 'LIVE' ? 'text-semantic-nominal' : 'text-[var(--ink-muted)]'}>
                        [ API: {apiStatus} ]
                      </span>
                      <RefreshCw className="w-2.5 h-2.5 text-[var(--ink-secondary)]" />
                    </button>
                  </div>
                </div>

                {/* Wearable HR — opens VitalsDrawer */}
                <button
                  type="button"
                  onClick={() => { setIsSystemMenuOpen(false); setIsVitalsDrawerOpen(true); }}
                  className="w-full px-2.5 py-2 border border-[var(--hairline)] hover:border-[var(--ink-primary)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-elevated)] text-[var(--ink-primary)] flex items-center justify-between text-[11px] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStrainColor(liveVitals.strainLevel)}`} />
                    <Heart className="w-3.5 h-3.5 text-semantic-nominal" />
                    <span>WEARABLE HR / VITALS</span>
                  </span>
                  <span className="font-bold">{liveVitals.heartRate} BPM · {liveVitals.strainLevel}</span>
                </button>

                {/* Desktop Session Info + [ SIGN OUT ] */}
                <div className="pt-1.5 border-t border-[var(--hairline)] flex items-center justify-between gap-2 px-1">
                  <span className="text-[10px] text-[var(--ink-muted)] truncate">
                    {primarySelfProfile?.username
                      ? `@${primarySelfProfile.username}`
                      : currentUser?.email || 'ACTIVE SESSION'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSystemMenuOpen(false);
                      void logoutUser();
                    }}
                    className="px-2.5 py-1 border border-semantic-hazard/50 bg-[#B91C1C]/10 hover:bg-[#B91C1C]/20 text-semantic-hazard text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>[ SIGN OUT ]</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ③ PRAYANA AI [⌘K] */}
        <motion.button
          type="button"
          onClick={() => setIsCopilotDrawerOpen(true)}
          whileHover={{ y: -1.5, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={POP_SPRING}
          className="hidden md:flex mono-hud-btn px-2.5 py-1 border border-[var(--hairline-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)] transition-colors items-center space-x-1.5 cursor-pointer text-[11px] whitespace-nowrap shrink-0"
          title="Open Prayana AI Assistant (⌘K / Ctrl+K)"
        >
          <Sparkles className="w-3 h-3 shrink-0" />
          <span className="hidden lg:inline">PRAYANA AI [⌘K]</span>
          <span className="lg:hidden">PRAYANA AI</span>
        </motion.button>

        {/* ④ PLAN TRIP [+] primary CTA */}
        <motion.button
          type="button"
          onClick={() => setIsWizardOpen(true)}
          whileHover={{ y: -1.5, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={POP_SPRING}
          className="mono-hud-btn px-3 py-1 bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold transition-colors flex items-center space-x-1 cursor-pointer text-[11px] whitespace-nowrap shrink-0"
          title="Launch 3-Step Expedition Architect Wizard"
        >
          <span className="hidden sm:inline">PLAN TRIP [+]</span>
          <span className="sm:hidden">PLAN [+]</span>
        </motion.button>

        {/* Mobile hamburger (<md) */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle Mobile Navigation Menu"
          className="flex md:hidden items-center space-x-1 px-2 py-1 border border-[var(--hairline-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)] text-[11px] cursor-pointer shrink-0 whitespace-nowrap"
        >
          {isMobileMenuOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
          <span>MENU</span>
        </button>
      </div>

      {/* ── Mobile full-width drawer (<md) with opaque backdrop ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              key="mobile-menu-backdrop"
              {...FLUID_BACKDROP_TRANSITION}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 top-12 z-40 bg-black/75 backdrop-blur-xs md:hidden"
            />
            <motion.div
              key="mobile-menu-panel"
              {...FLUID_MODAL_TRANSITION}
              data-lenis-prevent
              className="fixed inset-x-0 top-12 z-50 bg-[var(--bg-canvas)] border-b border-[var(--hairline-strong)] shadow-2xl p-4 space-y-3.5 md:hidden max-h-[calc(100vh-48px)] overflow-y-auto transform-gpu"
            >
              {/* Section 1: Workspace Actions */}
              <div className="space-y-1.5">
                <div className="text-[10px] text-[var(--ink-muted)] tracking-widest">
                  EXPEDITION ACTIONS
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => navigateTo('ITINERARY_OUTPUT')}
                    className={`py-2.5 px-2 border text-center text-[11px] flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      activeView === 'ITINERARY_OUTPUT'
                        ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] border-[var(--ink-primary)] font-bold'
                        : 'bg-[var(--bg-surface)] text-[var(--ink-primary)] border-[var(--hairline)]'
                    }`}
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>ITINERARY</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsBucketListOpen(true);
                    }}
                    className="py-2.5 px-2 bg-[var(--bg-surface)] border border-[var(--hairline)] text-[var(--ink-primary)] flex flex-col items-center justify-center gap-1 text-[11px] cursor-pointer"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>SAVED ({wishlistIds.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsShareHubOpen(true);
                    }}
                    className="py-2.5 px-2 bg-[var(--bg-surface)] border border-[var(--hairline)] text-[var(--ink-primary)] flex flex-col items-center justify-center gap-1 text-[11px] cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>DISPATCH</span>
                  </button>
                </div>
              </div>

              {/* Section 2: Telemetry, Offline Status & Wearable HR */}
              <div className="border-t border-[var(--hairline)] pt-3 space-y-2">
                <div className="text-[10px] text-[var(--ink-muted)] tracking-widest">
                  SYSTEM TELEMETRY &amp; WEARABLE HR
                </div>
                <div className="p-2.5 bg-[var(--bg-surface)] border border-[var(--hairline)] space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[var(--ink-secondary)]">
                      {isOnline ? (
                        <Wifi className="w-3 h-3 text-semantic-nominal" />
                      ) : (
                        <WifiOff className="w-3 h-3 text-semantic-caution" />
                      )}
                      <span>CACHE / NETWORK</span>
                    </span>
                    <span className={isOnline ? 'text-semantic-nominal font-semibold' : 'text-semantic-caution font-semibold'}>
                      {isOnline ? '[ OFFLINE READY ]' : '[ OFFLINE LOCAL ]'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[var(--ink-secondary)]">
                      <Server className="w-3 h-3 text-[var(--ink-muted)]" />
                      <span>FASTAPI ENGINE</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => refreshApiStatus()}
                      className="flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <span className={apiStatus === 'LIVE' ? 'text-semantic-nominal' : 'text-[var(--ink-muted)]'}>
                        [ API: {apiStatus} ]
                      </span>
                      <RefreshCw className="w-2.5 h-2.5 text-[var(--ink-secondary)]" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsVitalsDrawerOpen(true);
                  }}
                  className="w-full py-2.5 px-3 bg-[var(--bg-surface)] border border-[var(--hairline)] text-[var(--ink-primary)] flex items-center justify-between text-[11px] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStrainColor(liveVitals.strainLevel)}`} />
                    <Heart className="w-3.5 h-3.5 text-semantic-nominal" />
                    <span>WEARABLE HR / VITALS</span>
                  </span>
                  <span className="font-bold">
                    {liveVitals.heartRate} BPM · {liveVitals.strainLevel}
                  </span>
                </button>
              </div>

              {/* Section 3: Session Sign Out */}
              <div className="border-t border-[var(--hairline)] pt-2.5 flex items-center justify-between gap-2">
                <span className="text-[10px] text-[var(--ink-muted)] truncate">
                  {primarySelfProfile?.username
                    ? `@${primarySelfProfile.username}`
                    : currentUser?.email || 'SESSION ACTIVE'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    void logoutUser();
                  }}
                  className="px-3 py-1.5 border border-semantic-hazard/50 bg-[#B91C1C]/10 text-semantic-hazard text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <LogOut className="w-3 h-3" />
                  <span>[ SIGN OUT ]</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};
