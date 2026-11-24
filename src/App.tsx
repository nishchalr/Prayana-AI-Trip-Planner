import React, { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
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
import { AuthScreen } from './components/auth/AuthScreen';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export const AppContent: React.FC = () => {
  const { activeView, isPreloaderActive, setIsPreloaderActive } = usePrayana();

  // Guarantee window scroll reset on any top-level view transition
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeView]);

  return (
    <div className="relative h-screen w-screen bg-[#0E0E0E] text-[#F2F0EB] flex flex-col justify-between overflow-hidden selection:bg-[#F2F0EB] selection:text-[#0E0E0E]">
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
      <main className={`flex-1 flex flex-col w-full ${activeView === 'AUTH' ? 'h-screen' : 'h-[calc(100vh-96px)]'} overflow-hidden relative`}>
        <ErrorBoundary fallbackTitle="Main Application View">
          {activeView === 'AUTH' && <AuthScreen />}
          {activeView === 'GALLERY_HOME' && <GalleryHome />}
          {activeView === 'PROFILES' && <ProfileHub />}
          {activeView === 'ITINERARY_OUTPUT' && <ItineraryWorkspace />}
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
