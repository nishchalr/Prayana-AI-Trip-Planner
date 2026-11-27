import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'framer-motion';
import { FLUID_ISLAND_SPRING } from './motion/fluidTokens';
import { useGsapEnter } from './motion/gsapAnimations';
import { PrayanaProvider, usePrayana } from './context/PrayanaContext';
import { attachCompassAudioUnlockListeners } from './utils/compassAudio';
import { ArchitecturalGrid } from './components/common/ArchitecturalGrid';
import { HeaderHud } from './components/common/HeaderHud';
import { FooterHud } from './components/common/FooterHud';
import { GalleryHome } from './components/stage/GalleryHome';
import { ProfileHub } from './components/profile/ProfileHub';
import { ItineraryWorkspace } from './components/itinerary/ItineraryWorkspace';
import { VitalsDrawer } from './components/drawers/VitalsDrawer';
import { CopilotDrawer } from './components/drawers/CopilotDrawer';
import { ItineraryModal } from './components/drawers/ItineraryModal';
import { TripWizardModal } from './components/drawers/TripWizardModal';
import { StopDetailModal } from './components/drawers/StopDetailModal';
import { TravelerIntakeModal } from './components/profile/TravelerIntakeModal';
import { BucketListDrawer } from './components/drawers/BucketListDrawer';
import { ShareHubModal } from './components/drawers/ShareHubModal';
import { Preloader } from './components/common/Preloader';
import { CompassLoader } from './components/common/CompassLoader';
import { AuthScreen } from './components/auth/AuthScreen';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export const AppContent: React.FC = () => {
  const { activeView, isPreloaderActive, setIsPreloaderActive, isHydrating, theme } = usePrayana();
  const [minSplashElapsed, setMinSplashElapsed] = useState<boolean>(false);

  // Enforce 1400ms minimum duration so the compass sweep & North lock finish smoothly on every refresh
  useEffect(() => {
    attachCompassAudioUnlockListeners();
    const timer = window.setTimeout(() => {
      setMinSplashElapsed(true);
    }, 1400);
    return () => window.clearTimeout(timer);
  }, []);

  // Guarantee window scroll reset on any top-level view transition
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeView]);

  const showStartupLoader = isHydrating || !minSplashElapsed;
  const viewContainerRef = useRef<HTMLDivElement | null>(null);
  useGsapEnter(viewContainerRef, [activeView], 6);

  return (
    <div className="relative h-screen w-screen bg-[var(--bg-canvas)] text-[var(--ink-primary)] flex flex-col justify-between overflow-hidden selection:bg-[var(--ink-primary)] selection:text-[var(--bg-canvas)]">
      {/* Full-Screen Architectural Compass Loader (min 1400ms + until Firebase Auth/Firestore resolve) */}
      <AnimatePresence mode="popLayout" initial={false}>
        {showStartupLoader && (
          <motion.div
            key="startup-compass-loader"
            initial={{ y: '0%' }}
            exit={{
              y: '-100%',
              transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
            }}
            style={{ willChange: 'transform' }}
            className="fixed inset-0 z-[120]"
          >
            <CompassLoader theme={theme} variant="fullscreen" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Branded Architectural Preloader (Explicit entry overlay at z-[100]) */}
      <AnimatePresence>
        {!showStartupLoader && isPreloaderActive && (
          <Preloader onStartExit={() => setIsPreloaderActive(false)} />
        )}
      </AnimatePresence>

      {/* Render Background Architectural Grid only for authenticated dashboard views */}
      {activeView !== 'AUTH' && <ArchitecturalGrid />}

      {/* Top Hairline Monospace Rail (48px) - Authenticated views only */}
      {activeView !== 'AUTH' && (
        <ErrorBoundary fallbackTitle="Top Navigation Rail">
          <HeaderHud />
        </ErrorBoundary>
      )}

      {/* Main Viewport Router with Immediate Clean Mounting */}
      {/* CRITICAL: key={activeView} forces fresh mount of GalleryHome (and its Three.js Canvas)
          every time the user navigates back to GALLERY_HOME, preventing stale WebGL context. */}
      <main className={`flex-1 flex flex-col w-full ${activeView === 'AUTH' ? 'h-screen' : 'h-[calc(100vh-96px)]'} overflow-hidden relative`}>
        <ErrorBoundary fallbackTitle="Main Application View">
          <div
            ref={viewContainerRef}
            key={activeView}
            className="flex-1 flex flex-col w-full h-full overflow-hidden transform-gpu"
          >
            {activeView === 'AUTH' && <AuthScreen key="view-auth" />}
            {activeView === 'GALLERY_HOME' && <GalleryHome key="view-gallery" />}
            {activeView === 'PROFILES' && <ProfileHub key="view-profiles" />}
            {activeView === 'ITINERARY_OUTPUT' && <ItineraryWorkspace key="view-itinerary" />}
          </div>
        </ErrorBoundary>
      </main>

      {/* Bottom Hairline Monospace Rail (48px) - Authenticated views only */}
      {activeView !== 'AUTH' && (
        <ErrorBoundary fallbackTitle="Bottom Footer HUD">
          <FooterHud />
        </ErrorBoundary>
      )}

      {/* Overlay Slide-over Drawers & Modals */}
      {activeView !== 'AUTH' && (
        <>
          <VitalsDrawer />
          <CopilotDrawer />
          <ItineraryModal />
          <TripWizardModal />
          <StopDetailModal />
          <TravelerIntakeModal />
          <BucketListDrawer />
          <ShareHubModal />
        </>
      )}
    </div>
  );
};

export default function App() {
  return (
    <PrayanaProvider>
      <LayoutGroup>
        <MotionConfig transition={FLUID_ISLAND_SPRING} reducedMotion="user">
          <AppContent />
        </MotionConfig>
      </LayoutGroup>
    </PrayanaProvider>
  );
}
