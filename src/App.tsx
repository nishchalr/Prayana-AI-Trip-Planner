import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FLUID_GLIDE } from './motion/fluidTokens';
import { PrayanaProvider, usePrayana } from './context/PrayanaContext';
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
import { PrayanaLogo } from './components/common/PrayanaLogo';
import { AuthScreen } from './components/auth/AuthScreen';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export const AppContent: React.FC = () => {
  const { activeView, isPreloaderActive, setIsPreloaderActive, isHydrating } = usePrayana();

  // Guarantee window scroll reset on any top-level view transition
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeView]);

  // Full-screen Startup Loading Page on every load/restart until Firebase Auth + Firestore resolve
  if (isHydrating) {
    return (
      <div className="relative h-screen w-screen bg-[var(--bg-canvas)] text-[var(--ink-primary)] flex flex-col items-center justify-center p-6 overflow-hidden select-none">
        <div className="relative flex flex-col items-center space-y-6">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border border-[var(--hairline-strong)] border-t-[var(--ink-primary)]"
            />
            <PrayanaLogo className="w-14 h-14" showRing />
          </div>

          <div className="text-center space-y-2">
            <div className="font-mono text-xs font-bold tracking-[0.28em] uppercase text-[var(--ink-primary)]">
              PRAYANA
            </div>
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--ink-secondary)] animate-pulse">
              [ INITIALIZING CORRIDOR ENGINE... ]
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen bg-[var(--bg-canvas)] text-[var(--ink-primary)] flex flex-col justify-between overflow-hidden selection:bg-[var(--ink-primary)] selection:text-[var(--bg-canvas)]">
      {/* Branded Architectural Preloader (Full-Screen Opaque Overlay at z-[100]) */}
      <AnimatePresence>
        {isPreloaderActive && (
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
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={FLUID_GLIDE}
              className="flex-1 flex flex-col w-full h-full overflow-hidden gpu-fluid"
            >
              {activeView === 'AUTH' && <AuthScreen key="view-auth" />}
              {activeView === 'GALLERY_HOME' && <GalleryHome key="view-gallery" />}
              {activeView === 'PROFILES' && <ProfileHub key="view-profiles" />}
              {activeView === 'ITINERARY_OUTPUT' && <ItineraryWorkspace key="view-itinerary" />}
            </motion.div>
          </AnimatePresence>
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
      <AppContent />
    </PrayanaProvider>
  );
}
