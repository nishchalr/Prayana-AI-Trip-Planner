import React from 'react';
import { motion } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { TravelerProfile } from '../../types';
import { 
  Users, 
  UserPlus, 
  Activity, 
  Heart, 
  ShieldAlert, 
  ShieldCheck, 
  Edit3, 
  Trash2, 
  Sliders, 
  CheckCircle2, 
  ArrowLeft 
} from 'lucide-react';

export const ProfileHub: React.FC = () => {
  const { 
    travelers, 
    activeTravelerId, 
    setActiveTravelerId,
    setActiveView, 
    setIsIntakeModalOpen, 
    setEditingTravelerId,
    setIsVitalsDrawerOpen,
    deleteTraveler 
  } = usePrayana();

  const handleEdit = (id: string) => {
    setEditingTravelerId(id);
    setIsIntakeModalOpen(true);
  };

  const handleOpenVitals = (id: string) => {
    setActiveTravelerId(id);
    setIsVitalsDrawerOpen(true);
  };

  // Cohort summary statistics
  const totalAllergies = Array.from(
    new Set(travelers.flatMap(t => t.dietaryTags.filter(d => d.includes('Allergy') || d === 'Gluten-Free')))
  );

  const constrainedMobilityCount = travelers.filter(
    t => t.mobility !== 'Full Mobility' || t.medicalFlags.includes('Arthritis')
  ).length;

  return (
    <div className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 select-none overflow-y-auto">
      {/* View Header with Hairline Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[rgba(242,240,235,0.12)] gap-4">
        <div>
          <div className="text-[9px] font-mono text-ink-secondary tracking-widest uppercase mb-1">
            PROFILES // PASSENGER & MEDICAL DOSSIER
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl text-ink-primary tracking-tight">
            Traveler Cohort & Vitals
          </h1>
          <p className="font-sans text-xs text-ink-secondary mt-0.5">
            Individual physiological profiles, mobility constraints, dietary safety rules, and Google Health wearable bindings.
          </p>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setEditingTravelerId(null);
              setIsIntakeModalOpen(true);
            }}
            className="mono-hud-btn px-4 py-2 bg-ink-primary text-canvas font-bold hover:bg-white transition-all flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>NEW TRAVELER INTAKE</span>
          </button>
        </div>
      </div>

      {/* Cohort Safety & Medical Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-6">
        <div className="p-3 bg-[#151515] border border-[rgba(242,240,235,0.1)]">
          <div className="text-[9px] font-mono text-ink-muted uppercase">ACTIVE EXPEDITION COHORT</div>
          <div className="text-xl font-mono font-bold text-ink-primary mt-1">
            {travelers.length} REGISTERED PASSENGERS
          </div>
          <div className="text-[9px] font-mono text-ink-secondary mt-0.5">
            ALL FITBANDS SYNCED TO HEALTH CONNECT
          </div>
        </div>

        <div className="p-3 bg-[#151515] border border-[rgba(242,240,235,0.1)]">
          <div className="text-[9px] font-mono text-ink-muted uppercase">GROUP ALLERGY PROTOCOL</div>
          <div className="text-xl font-mono font-bold text-ink-primary mt-1 flex items-center gap-1.5">
            {totalAllergies.length > 0 ? (
              <span className="text-semantic-hazard">{totalAllergies.length} ACTIVE RESTRICTIONS</span>
            ) : (
              <span className="text-semantic-nominal">ZERO ALLERGIES</span>
            )}
          </div>
          <div className="text-[9px] font-mono text-ink-secondary truncate mt-0.5">
            {totalAllergies.join(', ') || 'No dietary alerts'}
          </div>
        </div>

        <div className="p-3 bg-[#151515] border border-[rgba(242,240,235,0.1)]">
          <div className="text-[9px] font-mono text-ink-muted uppercase">TERRAIN ACCESSIBILITY BOUND</div>
          <div className="text-xl font-mono font-bold text-ink-primary mt-1 flex items-center gap-1.5">
            {constrainedMobilityCount > 0 ? (
              <span className="text-semantic-caution">MAX SLOPE θ ≤ 3.0°</span>
            ) : (
              <span className="text-semantic-nominal">STANDARD BOUNDS (8.0°)</span>
            )}
          </div>
          <div className="text-[9px] font-mono text-ink-secondary mt-0.5">
            {constrainedMobilityCount} traveler(s) require assisted/gentle pathways
          </div>
        </div>
      </div>

      {/* Hairline Architectural Grid of Traveler Cards */}
      <motion.div 
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.06,
            },
          },
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12"
      >
        {travelers.map(t => {
          const isActive = t.id === activeTravelerId;
          return (
            <motion.div
              key={t.id}
              variants={{
                hidden: { opacity: 0, y: 14 },
                show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
              }}
              whileHover={{ y: -5, scale: 1.022 }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              className={`metallic-sheen p-5 bg-[#141414] border transition-colors flex flex-col justify-between ${
                isActive
                  ? 'border-ink-primary shadow-[0_8px_30px_rgba(242,240,235,0.12)] ring-1 ring-[#F2F0EB]/20'
                  : 'border-[rgba(242,240,235,0.12)] hover:border-[#F2F0EB]'
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[9px] text-ink-muted uppercase tracking-widest">
                        TRAVELER #{t.id.slice(-4).toUpperCase()}
                      </span>
                      {isActive && (
                        <span className="px-1.5 py-0.2 bg-ink-primary text-canvas font-mono text-[8px] font-bold">
                          ACTIVE CONTEXT
                        </span>
                      )}
                    </div>
                    <h2 className="font-serif text-3xl text-ink-primary mt-0.5">
                      {t.name}
                    </h2>
                    <div className="font-mono text-[10px] text-ink-secondary mt-0.5">
                      {t.age} YEARS OLD · {t.mobility.toUpperCase()}
                    </div>
                  </div>

                  {/* Wearable Status Pill */}
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1C1C1C] border border-[rgba(242,240,235,0.14)] text-[9px] font-mono text-semantic-nominal">
                      <span className="w-1.5 h-1.5 rounded-full bg-semantic-nominal animate-pulse-subtle" />
                      HEALTH CONNECT SYNCED
                    </span>
                    <div className="font-mono text-[8px] text-ink-muted mt-1">
                      INS: {t.travelInsuranceId}
                    </div>
                  </div>
                </div>

                {/* Vitals Mini-Grid with Live ECG Waveform */}
                <div className="my-4 p-3 bg-[#181818] border border-[rgba(242,240,235,0.08)] font-mono">
                  <div className="grid grid-cols-3 gap-2 text-center pb-2.5 border-b border-[rgba(242,240,235,0.06)]">
                    <div>
                      <div className="text-[8px] text-ink-muted">HEART RATE</div>
                      <div className="text-sm font-bold text-ink-primary mt-0.5">
                        {t.vitals.heartRate} <span className="text-[9px] font-normal text-ink-secondary">BPM</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[8px] text-ink-muted">SpO2</div>
                      <div className="text-sm font-bold text-ink-primary mt-0.5">
                        {t.vitals.spO2}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[8px] text-ink-muted">EFFORT STRAIN</div>
                      <div className="text-sm font-bold mt-0.5">
                        <span className={
                          t.vitals.strainLevel === 'ELEVATED' ? 'text-semantic-hazard' :
                          t.vitals.strainLevel === 'MODERATE' ? 'text-semantic-caution' :
                          'text-semantic-nominal'
                        }>
                          {t.vitals.strainLevel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Realtime Animated ECG Pulse Waveform Line */}
                  <div className="relative w-full h-6 pt-1.5 overflow-hidden flex items-center justify-center">
                    <svg viewBox="0 0 120 20" className="w-full h-full text-semantic-nominal/80 overflow-visible" preserveAspectRatio="none">
                      <path
                        d="M0 10 L25 10 L28 10 L31 3 L35 17 L39 7 L43 13 L46 10 L70 10 L73 10 L76 3 L80 17 L84 7 L88 13 L91 10 L120 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-ecg-trace"
                      />
                    </svg>
                  </div>
                </div>

                {/* Medical & Allergy Chips */}
                <div className="space-y-2 mb-4 font-mono text-[9px]">
                  {/* Medical flags */}
                  <div>
                    <span className="text-ink-muted block text-[8px] uppercase tracking-widest mb-1">
                      MEDICAL FLAGS:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {t.medicalFlags.length > 0 ? (
                        t.medicalFlags.map(m => (
                          <span key={m} className="px-2 py-0.5 bg-[#251515] border border-semantic-hazard/40 text-semantic-hazard">
                            {m.toUpperCase()}
                          </span>
                        ))
                      ) : (
                        <span className="text-ink-muted">No high-risk medical alerts</span>
                      )}
                    </div>
                  </div>

                  {/* Dietary & Allergy */}
                  <div>
                    <span className="text-ink-muted block text-[8px] uppercase tracking-widest mb-1">
                      DIETARY & ALLERGIES:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {t.dietaryTags.map(d => {
                        const isAllergy = d.includes('Allergy') || d === 'Gluten-Free';
                        return (
                          <span
                            key={d}
                            className={`px-2 py-0.5 border ${
                              isAllergy
                                ? 'bg-[#251815] border-semantic-caution/50 text-semantic-caution'
                                : 'bg-[#1C1C1C] border-[rgba(242,240,235,0.1)] text-ink-secondary'
                            }`}
                          >
                            {d.toUpperCase()}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Vibe & Pacing */}
                  <div className="pt-2 border-t border-[rgba(242,240,235,0.06)] flex justify-between text-ink-secondary text-[9px]">
                    <span>Vibe: <span className="text-ink-primary font-serif italic text-xs">{t.vibeProfile}</span></span>
                    <span>Pacing: <span className="text-ink-primary">{t.pacingPreference || 'Balanced'}</span></span>
                  </div>
                </div>
              </div>

              {/* Card Action Controls */}
              <div className="pt-3 border-t border-[rgba(242,240,235,0.1)] flex items-center justify-between font-mono text-[9px]">
                <div className="flex items-center space-x-2">
                  <motion.button
                    onClick={() => setActiveTravelerId(t.id)}
                    whileHover={{ y: -2, scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                    className={`px-2.5 py-1 border transition-colors cursor-pointer ${
                      isActive
                        ? 'border-ink-primary bg-ink-primary text-canvas font-bold'
                        : 'border-[rgba(242,240,235,0.14)] text-ink-secondary hover:text-ink-primary hover:border-ink-secondary'
                    }`}
                  >
                    {isActive ? 'ACTIVE CONTEXT' : 'SET ACTIVE'}
                  </motion.button>

                  <motion.button
                    onClick={() => handleOpenVitals(t.id)}
                    whileHover={{ y: -2, scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                    className="px-2.5 py-1 border border-[rgba(242,240,235,0.14)] hover:border-ink-primary text-ink-secondary hover:text-ink-primary transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Activity className="w-3 h-3 text-semantic-nominal" />
                    <span>SIMULATE VITALS</span>
                  </motion.button>
                </div>

                <div className="flex items-center space-x-1.5">
                  <motion.button
                    onClick={() => handleEdit(t.id)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-1.5 border border-[rgba(242,240,235,0.1)] hover:border-ink-primary text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer"
                    title="Edit Traveler Profile"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </motion.button>
                  {travelers.length > 1 && (
                    <motion.button
                      onClick={() => deleteTraveler(t.id)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-1.5 border border-[rgba(242,240,235,0.1)] hover:border-semantic-hazard hover:text-semantic-hazard text-ink-muted transition-colors cursor-pointer"
                      title="Remove Traveler"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};
