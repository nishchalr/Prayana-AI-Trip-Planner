import React from 'react';
import { motion } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import {
  User,
  AtSign,
  Calendar,
  Activity,
  Heart,
  ShieldAlert,
  Edit3,
  LogOut,
  Bookmark,
  Compass,
  Sliders,
} from 'lucide-react';

export const MyProfilePage: React.FC = () => {
  const {
    primarySelfProfile,
    travelers,
    currentUser,
    logoutUser,
    setEditingTravelerId,
    setIntakeMode,
    setIsIntakeModalOpen,
    setIsPrimaryOnboarding,
    bleConnectedDevice,
    liveVitals,
    wishlistIds,
    hasPlannedTrip,
    setIsVitalsDrawerOpen,
    setActiveView,
  } = usePrayana();

  const self = primarySelfProfile ?? travelers[0] ?? null;

  const handleEditSelf = () => {
    if (self) {
      setEditingTravelerId(self.id);
      setIsPrimaryOnboarding(Boolean(self.isPrimarySelf));
    } else {
      setEditingTravelerId(null);
      setIsPrimaryOnboarding(true);
    }
    setIntakeMode('MANUAL');
    setIsIntakeModalOpen(true);
  };

  return (
    <div
      data-lenis-prevent
      className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 py-8 select-none overflow-y-auto font-mono"
    >
      {/* Subtle Continuous Looping Architectural Background Motion (60fps GPU) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0 opacity-25"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 64, repeat: Infinity, ease: 'linear' }}
          style={{ willChange: 'transform' }}
          className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full border border-dashed border-[var(--hairline-strong)]"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 92, repeat: Infinity, ease: 'linear' }}
          style={{ willChange: 'transform' }}
          className="absolute -bottom-48 -left-36 w-[460px] h-[460px] rounded-full border border-[var(--hairline)]"
        />
      </div>

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--hairline)]">
          <div>
            <div className="text-[11px] text-[var(--ink-muted)] tracking-widest uppercase">
              PERSONAL IDENTITY // SELF DOSSIER
            </div>
            <h1 className="font-serif text-4xl text-[var(--ink-primary)] tracking-tight mt-0.5">
              {self?.name || currentUser?.displayName || 'Traveler Profile'}
            </h1>
            <div className="text-[12px] text-[var(--ink-secondary)] mt-1 flex flex-wrap items-center gap-3">
              {self?.username && (
                <span className="flex items-center gap-1 text-semantic-nominal font-bold">
                  <AtSign className="w-3.5 h-3.5" />
                  <span>{self.username}</span>
                </span>
              )}
              {self?.dob && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>DOB: {self.dob} ({self.age}y)</span>
                </span>
              )}
              {self?.gender && (
                <span className="px-2 py-0.5 border border-[var(--hairline-strong)] text-[10px] uppercase tracking-wider font-mono text-[var(--ink-primary)]">
                  {self.gender}
                </span>
              )}
              {currentUser?.email && <span>{currentUser.email}</span>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleEditSelf}
              className="mono-hud-btn px-3.5 py-2 border border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold flex items-center gap-1.5 cursor-pointer text-[11px]"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>EDIT MY PROFILE</span>
            </button>

            <button
              type="button"
              onClick={() => void logoutUser()}
              className="mono-hud-btn px-3.5 py-2 border border-semantic-hazard/50 text-semantic-hazard hover:bg-semantic-hazard hover:text-canvas font-bold flex items-center gap-1.5 cursor-pointer text-[11px] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>[ SIGN OUT ]</span>
            </button>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 prayana-glass">
            <div className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-semantic-nominal" />
              <span>BLE WEARABLE STATUS</span>
            </div>
            <div className="text-lg font-bold text-[var(--ink-primary)] mt-1">
              {bleConnectedDevice ? `${bleConnectedDevice} (${liveVitals.heartRate} BPM)` : `${liveVitals.heartRate} BPM · STANDBY`}
            </div>
            <button
              type="button"
              onClick={() => setIsVitalsDrawerOpen(true)}
              className="text-[11px] underline text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] mt-1 cursor-pointer"
            >
              OPEN WEARABLE &amp; VITALS DRAWER
            </button>
          </div>

          <div className="p-4 prayana-glass">
            <div className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5" />
              <span>SAVED STOPS &amp; TRIPS</span>
            </div>
            <div className="text-lg font-bold text-[var(--ink-primary)] mt-1">
              {wishlistIds.length} SAVED · {hasPlannedTrip ? '1 ACTIVE TRIP' : '0 PLANNED'}
            </div>
            <button
              type="button"
              onClick={() => setActiveView('ITINERARY_OUTPUT')}
              className="text-[11px] underline text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] mt-1 cursor-pointer"
            >
              OPEN ITINERARY WORKSPACE
            </button>
          </div>

          <div className="p-4 prayana-glass">
            <div className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              <span>CO-TRAVELLERS</span>
            </div>
            <div className="text-lg font-bold text-[var(--ink-primary)] mt-1">
              {travelers.filter((t) => !t.isPrimarySelf).length} IN COHORT
            </div>
            <button
              type="button"
              onClick={() => setActiveView('PROFILES')}
              className="text-[11px] underline text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] mt-1 cursor-pointer"
            >
              MANAGE CO-TRAVELLERS &amp; FRIENDS
            </button>
          </div>
        </div>

        {/* Editable Medical, Dietary, Mobility & Vibe Card */}
        {self && (
          <div className="p-5 prayana-glass space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-3">
              <div className="flex items-center gap-2 text-[11px] text-[var(--ink-muted)] uppercase tracking-widest">
                <User className="w-3.5 h-3.5 text-[var(--ink-primary)]" />
                <span>MOBILITY, MEDICAL &amp; VIBE PREFERENCES</span>
              </div>
              <span className="px-2 py-0.5 border border-semantic-nominal/50 text-semantic-nominal text-[10px] font-bold">
                {self.mobility.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px]">
              <div>
                <div className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  <span>MEDICAL FLAGS</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {self.medicalFlags.length > 0 ? (
                    self.medicalFlags.map((flag) => (
                      <span
                        key={flag}
                        className="px-2 py-0.5 bg-semantic-hazard/10 border border-semantic-hazard/40 text-semantic-hazard text-[11px]"
                      >
                        {flag}
                      </span>
                    ))
                  ) : (
                    <span className="text-[var(--ink-secondary)]">No medical alerts declared</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  <span>DIETARY &amp; ALLERGIES</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {self.dietaryTags.length > 0 ? (
                    self.dietaryTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-[var(--bg-surface)] border border-[var(--hairline)] text-[var(--ink-primary)] text-[11px]"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-[var(--ink-secondary)]">Standard diet</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--hairline)] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--ink-secondary)]">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span>VIBE: <strong className="text-[var(--ink-primary)] font-serif italic text-[14px]">{self.vibeProfile}</strong></span>
              </span>
              <span>PACING: <strong className="text-[var(--ink-primary)]">{self.pacingPreference || 'Balanced'}</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
