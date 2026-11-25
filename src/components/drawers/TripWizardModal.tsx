import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { CompassLoader } from '../common/CompassLoader';
import { 
  X, 
  Calendar, 
  Users, 
  MapPin, 
  IndianRupee, 
  ArrowRight, 
  Check, 
  AlertTriangle, 
  UserPlus, 
  Car, 
  Train, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

export const TripWizardModal: React.FC = () => {
  const { 
    isWizardOpen, 
    setIsWizardOpen, 
    destinations, 
    travelers, 
    activeDestinationId, 
    setActiveDestinationId,
    updateActiveTrip,
    setIsItineraryOpen,
    setIsIntakeModalOpen,
    setEditingTravelerId,
    theme
  } = usePrayana();

  const [step, setStep] = useState<number>(1);
  const [selectedDestId, setSelectedDestId] = useState<string>(activeDestinationId);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);

  // Dates state
  const [checkIn, setCheckIn] = useState<string>('2026-12-10');
  const [checkOut, setCheckOut] = useState<string>('2026-12-14');

  // Auto-calculated duration
  const calculateDays = () => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return isNaN(diffDays) || diffDays < 1 ? 4 : diffDays;
  };

  const days = calculateDays();
  const [budget, setBudget] = useState<number>(48000);
  const [transitMode, setTransitMode] = useState<'Self-Drive' | 'Public Transport'>('Self-Drive');
  const [originHub, setOriginHub] = useState<string>('Bengaluru Kempegowda (BLR)');
  const [flightOrTrain, setFlightOrTrain] = useState<string>('Hampi Express 16592');

  const [selectedTravelers, setSelectedTravelers] = useState<string[]>(travelers.map(t => t.id));

  // Current chosen destination object
  const currentDest = destinations.find(d => d.id === selectedDestId) || destinations[0];
  
  // Selected POIs from the destination
  const [selectedPoiIds, setSelectedPoiIds] = useState<string[]>(
    currentDest.stops.map(s => s.id)
  );

  if (!isWizardOpen) return null;

  const toggleTraveler = (id: string) => {
    setSelectedTravelers(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const togglePoi = (id: string) => {
    setSelectedPoiIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  // Group size
  const groupCount = Math.max(1, selectedTravelers.length);
  const perPersonPerDay = Math.round(budget / groupCount / days);

  // Group risk warnings derived from selected travelers
  const selectedProfiles = travelers.filter(t => selectedTravelers.includes(t.id));
  const hasAsthma = selectedProfiles.some(t => t.medicalFlags.includes('Asthma'));
  const hasMotionSickness = selectedProfiles.some(t => t.medicalFlags.includes('Motion Sickness'));
  const hasAssistedMobility = selectedProfiles.some(t => t.mobility === 'Assisted' || t.mobility === 'Wheelchair-Accessible');
  const groupAllergies = Array.from(new Set(selectedProfiles.flatMap(t => t.dietaryTags.filter(d => d.includes('Allergy')))));

  const handleOpenIntake = () => {
    setEditingTravelerId(null);
    setIsIntakeModalOpen(true);
  };

  const handleGenerate = () => {
    if (isSynthesizing) return;
    setIsSynthesizing(true);
    setActiveDestinationId(selectedDestId);
    updateActiveTrip({
      destinationId: selectedDestId,
      totalDays: days,
      dayIndex: 1,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      totalBudget: budget,
      groupTravelerIds: selectedTravelers,
      transitMode: transitMode,
      transitDetails: {
        originHub,
        flightOrTrainNo: flightOrTrain,
      },
    });
    window.setTimeout(() => {
      setIsSynthesizing(false);
      setIsWizardOpen(false);
      setIsItineraryOpen(true);
    }, 650);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsWizardOpen(false)}
          className="absolute inset-0 bg-black/85 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-[#121212] border border-[rgba(242,240,235,0.18)] shadow-2xl flex flex-col overflow-hidden text-ink-primary font-mono text-[11px]"
        >
          {isSynthesizing && (
            <CompassLoader
              variant="overlay"
              theme={theme}
              statusText="SYNTHESIZING 3-STEP EXPEDITION CORRIDOR..."
            />
          )}
          {/* Header */}
          <div className="p-5 border-b border-[rgba(242,240,235,0.12)] flex items-center justify-between bg-[#161616]">
            <div>
              <div className="text-[9px] text-ink-secondary tracking-widest uppercase">
                PRAYANA TRIP PLANNER WIZARD // STAGE 0{step} OF 03
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl text-ink-primary tracking-tight mt-0.5">
                {step === 1 && 'Destination, Schedule & 4-Tier Budget'}
                {step === 2 && 'Traveler Cohort & Biological Risk Checks'}
                {step === 3 && 'Transit Mode & Solver Route Generation'}
              </h2>
            </div>
            <button
              onClick={() => setIsWizardOpen(false)}
              className="p-1.5 hover:bg-[#222222] transition-colors border border-[rgba(242,240,235,0.14)] cursor-pointer"
            >
              <X className="w-4 h-4 text-ink-secondary hover:text-ink-primary" />
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-3 border-b border-[rgba(242,240,235,0.08)] bg-[#141414] text-[9px] text-center">
            <div className={`py-2 border-r border-[rgba(242,240,235,0.08)] ${step >= 1 ? 'text-ink-primary font-bold bg-[#1C1C1C]' : 'text-ink-muted'}`}>
              01 // DESTINATION & BUDGET
            </div>
            <div className={`py-2 border-r border-[rgba(242,240,235,0.08)] ${step >= 2 ? 'text-ink-primary font-bold bg-[#1C1C1C]' : 'text-ink-muted'}`}>
              02 // TRAVELER COHORT
            </div>
            <div className={`py-2 ${step >= 3 ? 'text-ink-primary font-bold bg-[#1C1C1C]' : 'text-ink-muted'}`}>
              03 // TRANSIT & SYNTHESIS
            </div>
          </div>

          <AnimatePresence mode="popLayout" initial={false}>
            {/* STEP 1: Destination, Dates, Budget & Segmented 4-Tier Bar */}
            {step === 1 && (
              <motion.div
                key="wizard-step-1"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="p-6 space-y-5 overflow-y-auto max-h-[62vh]"
              >
              {/* Destination Selector */}
              <div>
                <label className="block text-[9px] text-ink-muted uppercase tracking-widest mb-2">
                  1. CHOOSE EXPEDITION CORRIDOR
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {destinations.map(d => (
                    <motion.button
                      key={d.id}
                      onClick={() => {
                        setSelectedDestId(d.id);
                        setSelectedPoiIds(d.stops.map(s => s.id));
                      }}
                      whileHover={{ y: -3, scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                      className={`metallic-sheen p-3 text-left border transition-colors cursor-pointer ${
                        selectedDestId === d.id
                          ? 'border-ink-primary bg-[#222222] ring-1 ring-[#F2F0EB]/20'
                          : 'border-[rgba(242,240,235,0.1)] bg-[#161616] hover:border-ink-secondary'
                      }`}
                    >
                      <div className="font-serif text-xl text-ink-primary">{d.name}</div>
                      <div className="text-[8px] text-ink-secondary truncate">{d.region}</div>
                      <div className="text-[8px] text-semantic-nominal mt-1 font-mono">
                        {d.vibeMatchScore}% MATCH
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Check-In / Check-Out Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[8px] text-ink-muted uppercase tracking-widest mb-1">
                    CHECK-IN DATE
                  </label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full bg-[#181818] border border-[rgba(242,240,235,0.15)] p-2 text-ink-primary font-mono focus:border-ink-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[8px] text-ink-muted uppercase tracking-widest mb-1">
                    CHECK-OUT DATE
                  </label>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full bg-[#181818] border border-[rgba(242,240,235,0.15)] p-2 text-ink-primary font-mono focus:border-ink-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[8px] text-ink-muted uppercase tracking-widest mb-1">
                    CALCULATED DURATION
                  </label>
                  <div className="w-full bg-[#181818] border border-[rgba(242,240,235,0.15)] p-2 text-ink-primary font-mono font-bold flex items-center justify-between">
                    <span>{days} DAYS</span>
                    <span className="text-[9px] text-ink-muted">({days - 1} NIGHTS)</span>
                  </div>
                </div>
              </div>

              {/* Group Budget & Per-Person Readout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-[8px] text-ink-muted uppercase tracking-widest mb-1">
                    <span>TOTAL GROUP BUDGET (₹ INR)</span>
                    <span className="text-ink-primary font-bold">₹{budget.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="15000"
                    max="150000"
                    step="2500"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full accent-ink-primary cursor-pointer"
                  />
                </div>
                <div className="p-2.5 bg-[#181818] border border-[rgba(242,240,235,0.1)] flex items-center justify-between">
                  <div>
                    <div className="text-[8px] text-ink-muted uppercase">DAILY PER-PERSON CAP</div>
                    <div className="font-serif text-2xl text-ink-primary">
                      ₹{perPersonPerDay.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right text-[8px] text-ink-secondary">
                    FOR {groupCount} TRAVELERS<br />OVER {days} DAYS
                  </div>
                </div>
              </div>

              {/* Segmented 4-Tier Budget Bar */}
              <div className="p-3 bg-[#181818] border border-[rgba(242,240,235,0.1)]">
                <div className="flex justify-between text-[9px] text-ink-muted mb-2">
                  <span>SEGMENTED 4-TIER BUDGET SPLIT</span>
                  <span>TOTAL: ₹{budget.toLocaleString()}</span>
                </div>
                <div className="h-2.5 w-full flex bg-[#252525] overflow-hidden mb-2">
                  <motion.div className="bg-[#B8B5AE] h-full" animate={{ width: '35%' }} transition={{ duration: 0.35 }} title="Stays 35%" />
                  <motion.div className="bg-[#8E8C86] h-full" animate={{ width: '25%' }} transition={{ duration: 0.35 }} title="Food & Dining 25%" />
                  <motion.div className="bg-[#6A6863] h-full" animate={{ width: '20%' }} transition={{ duration: 0.35 }} title="Local Transit 20%" />
                  <motion.div className="bg-[#4A4945] h-full" animate={{ width: '20%' }} transition={{ duration: 0.35 }} title="Activities & Buffer 20%" />
                </div>
                <div className="grid grid-cols-4 gap-2 text-[8px] text-ink-secondary font-mono">
                  <div>STAYS 35%<br /><span className="text-ink-primary font-bold">₹{Math.round(budget * 0.35).toLocaleString()}</span></div>
                  <div>FOOD 25%<br /><span className="text-ink-primary font-bold">₹{Math.round(budget * 0.25).toLocaleString()}</span></div>
                  <div>TRANSIT 20%<br /><span className="text-ink-primary font-bold">₹{Math.round(budget * 0.20).toLocaleString()}</span></div>
                  <div>BUFFER 20%<br /><span className="text-ink-primary font-bold">₹{Math.round(budget * 0.20).toLocaleString()}</span></div>
                </div>
              </div>

              {/* Selectable Nearby POIs */}
              <div>
                <div className="flex items-center justify-between text-[9px] text-ink-muted uppercase tracking-widest mb-2">
                  <span>CURATED POI CANDIDATES ({currentDest.name})</span>
                  <span>{selectedPoiIds.length} SELECTED</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentDest.stops.map(s => {
                    const isChecked = selectedPoiIds.includes(s.id);
                    return (
                      <motion.div
                        key={s.id}
                        onClick={() => togglePoi(s.id)}
                        whileHover={{ y: -2, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                        className={`metallic-sheen p-2.5 border cursor-pointer transition-colors flex items-center justify-between ${
                          isChecked
                            ? 'border-ink-primary bg-[#1C1C1C] ring-1 ring-[#F2F0EB]/20'
                            : 'border-[rgba(242,240,235,0.08)] bg-[#141414] opacity-60 hover:opacity-100 hover:border-ink-secondary'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`w-3.5 h-3.5 border flex items-center justify-center ${isChecked ? 'bg-ink-primary border-ink-primary text-canvas' : 'border-ink-muted'}`}>
                            {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <div>
                            <div className="text-[10px] text-ink-primary font-medium">{s.title}</div>
                            <div className="text-[8px] text-ink-secondary">+{s.elevationDeltaM}m · {s.dwellMinutes}m dwell</div>
                          </div>
                        </div>
                        <span className="text-[8px] px-1 bg-[#222222] text-ink-secondary border border-[rgba(242,240,235,0.1)]">
                          {s.effortRating}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Multi-select Traveler Assignment & Group Risk Warnings */}
          {step === 2 && (
            <motion.div
              key="wizard-step-2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="p-6 space-y-4 overflow-y-auto max-h-[62vh]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-ink-muted uppercase tracking-widest">
                  ASSIGN TRAVELERS TO THIS EXPEDITION
                </span>
                <button
                  type="button"
                  onClick={handleOpenIntake}
                  className="mono-hud-btn px-2.5 py-1 border border-ink-primary text-ink-primary hover:bg-ink-primary hover:text-canvas transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>+ ADD PROFILE</span>
                </button>
              </div>

              {/* Traveler List */}
              <div className="space-y-2">
                {travelers.map(t => {
                  const isChecked = selectedTravelers.includes(t.id);
                  return (
                    <div
                      key={t.id}
                      onClick={() => toggleTraveler(t.id)}
                      className={`p-3.5 border cursor-pointer transition-colors flex items-center justify-between ${
                        isChecked
                          ? 'border-ink-primary bg-[#1E1E1E]'
                          : 'border-[rgba(242,240,235,0.08)] bg-[#141414] opacity-40'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 border flex items-center justify-center ${isChecked ? 'bg-ink-primary border-ink-primary text-canvas' : 'border-ink-muted'}`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="font-serif text-xl text-ink-primary leading-tight">
                            {t.name} <span className="font-mono text-[10px] text-ink-muted font-normal">({t.age} yrs)</span>
                          </div>
                          <div className="text-[9px] text-ink-secondary mt-0.5">
                            {t.mobility} · {t.vitals.heartRate} BPM (Baseline)
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {t.medicalFlags.map(m => (
                          <span key={m} className="px-1.5 py-0.2 bg-[#261515] border border-semantic-hazard/40 text-semantic-hazard text-[8px]">
                            {m.toUpperCase()}
                          </span>
                        ))}
                        {t.dietaryTags.map(d => (
                          <span key={d} className="px-1.5 py-0.2 bg-[#1C1C1C] border border-[rgba(242,240,235,0.1)] text-ink-secondary text-[8px]">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Group Risk Warnings Banner */}
              <div className="space-y-2 mt-4">
                <div className="text-[9px] text-ink-muted uppercase tracking-widest">
                  AUTOMATED SOLVER CONSTRAINT WARNINGS
                </div>

                {hasAssistedMobility && (
                  <div className="p-2.5 bg-[#201A15] border border-semantic-caution/60 text-semantic-caution text-[9px] flex items-start space-x-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">ASSISTED MOBILITY BOUND:</span> Cohort includes assisted mobility members. High-slope trails (θ &gt; 3.0°) and boulder step-routes will be pruned from the primary timeline.
                    </div>
                  </div>
                )}

                {hasAsthma && (
                  <div className="p-2.5 bg-[#201A15] border border-semantic-caution/60 text-semantic-caution text-[9px] flex items-start space-x-2">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">ASTHMA & CARDIOPULMONARY SAFETY:</span> Uphill legs scaled by c_resp (0.7). Midday outdoor segments during high thermal stress (WBGT &gt; 28°C) are capped at 45 min dwell.
                    </div>
                  </div>
                )}

                {hasMotionSickness && (
                  <div className="p-2.5 bg-[#201A15] border border-semantic-caution/60 text-semantic-caution text-[9px] flex items-start space-x-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">MOTION SICKNESS WARNING:</span> Winding mountain hairpin passes in Coorg / Western Ghats flagged. Route prioritizes national highways with 15-min rest pauses.
                    </div>
                  </div>
                )}

                {groupAllergies.length > 0 && (
                  <div className="p-2.5 bg-[#241515] border border-semantic-hazard/60 text-semantic-hazard text-[9px] flex items-start space-x-2">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">ALLERGY PROTOCOL:</span> Strictly excluding restaurants serving {groupAllergies.join(', ')} without dedicated allergen separation.
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 3: Transit Mode & External Booking Links */}
          {step === 3 && (
            <motion.div
              key="wizard-step-3"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="p-6 space-y-4 overflow-y-auto max-h-[62vh]"
            >
              <div>
                <label className="block text-[9px] text-ink-muted uppercase tracking-widest mb-2">
                  CHOOSE PRIMARY INTER-STOP TRANSIT
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    onClick={() => setTransitMode('Self-Drive')}
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                    className={`metallic-sheen p-3 text-left border transition-colors cursor-pointer ${
                      transitMode === 'Self-Drive'
                        ? 'border-ink-primary bg-[#202020] ring-1 ring-[#F2F0EB]/20'
                        : 'border-[rgba(242,240,235,0.1)] bg-[#161616] hover:border-ink-secondary'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Car className="w-4 h-4 text-ink-primary" />
                      <span className="font-serif text-xl text-ink-primary">Self-Drive / Cab</span>
                    </div>
                    <div className="text-[9px] text-ink-secondary mt-1">Flexible pacing, door-to-door luggage, emergency stops</div>
                  </motion.button>

                  <motion.button
                    onClick={() => setTransitMode('Public Transport')}
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                    className={`metallic-sheen p-3 text-left border transition-colors cursor-pointer ${
                      transitMode === 'Public Transport'
                        ? 'border-ink-primary bg-[#202020] ring-1 ring-[#F2F0EB]/20'
                        : 'border-[rgba(242,240,235,0.1)] bg-[#161616] hover:border-ink-secondary'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Train className="w-4 h-4 text-ink-primary" />
                      <span className="font-serif text-xl text-ink-primary">Public & Heritage Walk</span>
                    </div>
                    <div className="text-[9px] text-ink-secondary mt-1">Authentic trains, autos, river coracles, eco-trails</div>
                  </motion.button>
                </div>
              </div>

              {/* Transit Hub & Booking Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] text-ink-muted uppercase tracking-widest mb-1">
                    ORIGIN CITY / TRANSIT HUB
                  </label>
                  <input
                    type="text"
                    value={originHub}
                    onChange={(e) => setOriginHub(e.target.value)}
                    placeholder="e.g. Bengaluru Kempegowda (BLR)"
                    className="w-full bg-[#181818] border border-[rgba(242,240,235,0.15)] p-2 text-ink-primary focus:border-ink-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[8px] text-ink-muted uppercase tracking-widest mb-1">
                    FLIGHT / TRAIN NUMBER
                  </label>
                  <input
                    type="text"
                    value={flightOrTrain}
                    onChange={(e) => setFlightOrTrain(e.target.value)}
                    placeholder="e.g. Hampi Express 16592"
                    className="w-full bg-[#181818] border border-[rgba(242,240,235,0.15)] p-2 text-ink-primary font-mono focus:border-ink-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* External Indian & Global Booking Portals */}
              <div>
                <div className="text-[9px] text-ink-muted uppercase tracking-widest mb-2">
                  EXTERNAL CONNECTIVITY PORTALS
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[9px]">
                  <a
                    href="https://www.irctc.co.in"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-[#181818] border border-[rgba(242,240,235,0.1)] hover:border-ink-primary text-ink-secondary hover:text-ink-primary transition-colors flex items-center justify-center gap-1"
                  >
                    <span>IRCTC</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <a
                    href="https://www.google.com/travel/flights"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-[#181818] border border-[rgba(242,240,235,0.1)] hover:border-ink-primary text-ink-secondary hover:text-ink-primary transition-colors flex items-center justify-center gap-1"
                  >
                    <span>GOOGLE FLIGHTS</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <a
                    href="https://www.skyscanner.co.in"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-[#181818] border border-[rgba(242,240,235,0.1)] hover:border-ink-primary text-ink-secondary hover:text-ink-primary transition-colors flex items-center justify-center gap-1"
                  >
                    <span>SKYSCANNER</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <a
                    href="https://www.makemytrip.com"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-[#181818] border border-[rgba(242,240,235,0.1)] hover:border-ink-primary text-ink-secondary hover:text-ink-primary transition-colors flex items-center justify-center gap-1"
                  >
                    <span>MAKEMYTRIP</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          {/* Footer Navigation */}
          <div className="p-4 border-t border-[rgba(242,240,235,0.12)] bg-[#151515] flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(prev => prev - 1)}
                className="mono-hud-btn px-3 py-1.5 bg-[#202020] border border-[rgba(242,240,235,0.2)] text-ink-secondary hover:text-ink-primary cursor-pointer"
              >
                [← BACK]
              </button>
            ) : <div />}

            <div className="flex items-center space-x-3">
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep(prev => prev + 1)}
                  className="mono-hud-btn px-4 py-1.5 bg-ink-primary text-canvas font-bold hover:bg-white flex items-center gap-1.5 cursor-pointer"
                >
                  <span>CONTINUE</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="mono-hud-btn px-5 py-1.5 bg-ink-primary text-canvas font-bold hover:bg-white flex items-center gap-2 cursor-pointer"
                >
                  <span>GENERATE ITINERARY [→]</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
