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
import { CompassLoader } from './components/common/CompassLoader';
import { AuthScreen } from './components/auth/AuthScreen';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export const AppContent: React.FC = () => {
  const { activeView, isPreloaderActive, setIsPreloaderActive, isHydrating, theme } = usePrayana();

  // Guarantee window scroll reset on any top-level view transition
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeView]);

  // Full-screen Startup Loading Page on every load/restart until Firebase Auth + Firestore resolve
  if (isHydrating) {
    return <CompassLoader theme={theme} />;
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
