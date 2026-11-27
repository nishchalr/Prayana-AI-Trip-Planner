import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { CompassLoader } from '../common/CompassLoader';
import { PrayanaDatePicker, getTodayIso } from '../common/PrayanaDatePicker';
import { computeTotalDays, distributeStopsAcrossDays } from '../../utils/multiDayUtils';
import { MonolithStop } from '../../types';
import { FLUID_BACKDROP_TRANSITION, FLUID_MODAL_TRANSITION } from '../../motion/fluidTokens';
import { useGsapModal } from '../../motion/gsapAnimations';
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
  ShieldAlert,
  AtSign,
  ChevronDown,
  CloudRain,
  ArrowUp,
  ArrowDown,
  Trash2,
} from 'lucide-react';

export const TripWizardModal: React.FC = () => {
  const { 
    isWizardOpen, 
    setIsWizardOpen, 
    destinations, 
    travelers, 
    connectedFriends,
    addConnectedFriendToCohort,
    activeDestinationId, 
    setActiveDestinationId,
    applyWizardRouteStops,
    updateActiveTrip,
    setIsItineraryOpen,
    setIsIntakeModalOpen,
    setEditingTravelerId,
    setIntakeMode,
    setActiveView,
    destinationAdvisories,
    advisoriesLoading,
    refreshDestinationAdvisories,
    hasPlannedTrip,
    activeTrip,
    routeStops,
    publishSharedTripAndInvites,
    theme
  } = usePrayana();

  const [step, setStep] = useState<number>(1);
  const [selectedDestId, setSelectedDestId] = useState<string>(activeDestinationId);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [selectedFriendUid, setSelectedFriendUid] = useState<string>('');

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
  const [vehicleType, setVehicleType] = useState<'2W' | '4W'>('4W');
  const [fuelType, setFuelType] = useState<'PETROL' | 'DIESEL' | 'EV'>('PETROL');
  const [publicMode, setPublicMode] = useState<'FLIGHT' | 'TRAIN' | 'BUS'>('TRAIN');
  const [originHub, setOriginHub] = useState<string>('Bengaluru Kempegowda (BLR)');
  const [arrivalHub, setArrivalHub] = useState<string>('Hospet Junction (HPT)');
  const [flightOrTrain, setFlightOrTrain] = useState<string>('Hampi Express 16592');
  const [pnrOrRef, setPnrOrRef] = useState<string>('');

  const [selectedTravelers, setSelectedTravelers] = useState<string[]>(travelers.map(t => t.id));
  const [isFriendMenuOpen, setIsFriendMenuOpen] = useState(false);
  const [draftStops, setDraftStops] = useState<MonolithStop[]>([]);
  const [showExistingChoice, setShowExistingChoice] = useState(false);
  const prevTravelerIdsRef = useRef<string[]>(travelers.map(t => t.id));

  // Auto-select newly added travelers while Wizard stays open
  useEffect(() => {
    const currentIds = travelers.map(t => t.id);
    const addedIds = currentIds.filter(id => !prevTravelerIdsRef.current.includes(id));
    if (isWizardOpen && addedIds.length > 0) {
      setSelectedTravelers(prev => Array.from(new Set([...prev, ...addedIds])));
    }
    prevTravelerIdsRef.current = currentIds;
  }, [travelers, isWizardOpen]);

  // Sync selectedDestId when Wizard opens from 3D Monument Tap-to-Plan
  useEffect(() => {
    if (isWizardOpen) {
      setSelectedDestId(activeDestinationId);
      setStep(1);
      if (connectedFriends.length > 0 && !connectedFriends.some(f => f.uid === selectedFriendUid)) {
        setSelectedFriendUid(connectedFriends[0].uid);
      }
      setSelectedTravelers(prev => {
        if (prev.length === 0) return travelers.map(t => t.id);
        return prev;
      });
    }
  }, [isWizardOpen, activeDestinationId, connectedFriends]);

  // Ensure Diesel is never selected for 2-Wheeler
  useEffect(() => {
    if (vehicleType === '2W' && fuelType === 'DIESEL') {
      setFuelType('PETROL');
    }
  }, [vehicleType, fuelType]);

  // Current chosen destination object
  const currentDest = destinations.find(d => d.id === selectedDestId) || destinations[0];
  
  // Selected POIs from the destination
  const [selectedPoiIds, setSelectedPoiIds] = useState<string[]>(
    currentDest.stops.map(s => s.id)
  );

  useEffect(() => {
    setSelectedPoiIds(currentDest.stops.map(s => s.id));
  }, [selectedDestId]);

  // Fetch live weather, festival & closure advisories whenever wizard opens or destination/dates change
  useEffect(() => {
    if (!isWizardOpen) return;
    const dest = destinations.find(d => d.id === selectedDestId) || destinations[0];
    if (!dest) return;
    void refreshDestinationAdvisories(selectedDestId, dest.name, checkIn, checkOut, dest.stops);
  }, [isWizardOpen, selectedDestId, checkIn, checkOut]);

  // Seed customizable Stage 03 Day-Wise Schedule Preview when entering Step 3
  useEffect(() => {
    if (!isWizardOpen || step !== 3) return;
    const dest = destinations.find(d => d.id === selectedDestId) || destinations[0];
    if (!dest) return;
    const chosen = dest.stops.filter(s => selectedPoiIds.includes(s.id));
    setDraftStops(
      distributeStopsAcrossDays(chosen.length > 0 ? chosen : dest.stops, days, dest.stops)
    );
  }, [isWizardOpen, step, selectedDestId, days, selectedPoiIds]);

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
    setIntakeMode('MANUAL');
    setIsIntakeModalOpen(true);
  };

  const finalizeTripCreation = (mode: 'NEW' | 'APPEND') => {
    if (isSynthesizing) return;
    setIsSynthesizing(true);
    setShowExistingChoice(false);
    const totalDays = computeTotalDays(checkIn, checkOut, days);
    const chosenStops = currentDest.stops.filter(s => selectedPoiIds.includes(s.id));
    const distributedStops =
      draftStops.length > 0
        ? draftStops
        : distributeStopsAcrossDays(
            chosenStops.length > 0 ? chosenStops : currentDest.stops,
            totalDays,
            currentDest.stops
          );

    const finalStops =
      mode === 'APPEND'
        ? [
            ...routeStops,
            ...distributedStops.map((s) => ({
              ...s,
              id: routeStops.some((r) => r.id === s.id) ? `${s.id}-${Date.now()}` : s.id,
              day: (s.day ?? 1) + (activeTrip.totalDays || 1),
            })),
          ]
        : distributedStops;

    const finalTotalDays =
      mode === 'APPEND' ? (activeTrip.totalDays || 1) + totalDays : totalDays;
    const finalGroupIds =
      mode === 'APPEND'
        ? Array.from(new Set([...(activeTrip.groupTravelerIds || []), ...selectedTravelers]))
        : selectedTravelers;

    const tripId = mode === 'APPEND' ? activeTrip.id : `trip-${selectedDestId}-${Date.now()}`;
    const nextTripPayload = {
      id: tripId,
      destinationId: mode === 'APPEND' ? activeTrip.destinationId : selectedDestId,
      routeTitle: mode === 'APPEND' ? activeTrip.routeTitle : currentDest.routeTitle,
      totalDays: finalTotalDays,
      dayIndex: 1,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      totalBudget: mode === 'APPEND' ? activeTrip.totalBudget + budget : budget,
      groupTravelerIds: finalGroupIds,
      transitMode,
      transitDetails: {
        originHub,
        arrivalHub,
        flightOrTrainNo: flightOrTrain,
        pnrOrRef,
        vehicleType,
        fuelType,
        publicMode,
      },
    };

    applyWizardRouteStops(finalStops);
    if (mode === 'NEW') {
      setActiveDestinationId(selectedDestId);
    }
    updateActiveTrip(nextTripPayload);

    const invitedFriends = connectedFriends.filter((f) =>
      travelers.some((t) => finalGroupIds.includes(t.id) && t.ownerUid === f.uid)
    );
    void publishSharedTripAndInvites({
      trip: { ...activeTrip, ...nextTripPayload },
      stops: finalStops,
      invitedFriends,
    });

    window.setTimeout(() => {
      setIsSynthesizing(false);
      setIsWizardOpen(false);
      setIsItineraryOpen(true);
    }, 650);
  };

  const handleGenerate = () => {
    if (isSynthesizing) return;
    if (hasPlannedTrip) {
      setShowExistingChoice(true);
      return;
    }
    finalizeTripCreation('NEW');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 select-none">
        {/* Backdrop */}
        <motion.div
          {...FLUID_BACKDROP_TRANSITION}
          onClick={() => setIsWizardOpen(false)}
          className="absolute inset-0 prayana-backdrop"
        />

        {/* Modal Window */}
        <motion.div
          {...FLUID_MODAL_TRANSITION}
          className="relative z-10 w-full max-w-3xl max-h-[86vh] prayana-glass border border-[rgba(242,240,235,0.18)] shadow-2xl flex flex-col overflow-hidden text-ink-primary font-mono text-[13px] transform-gpu"
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
              <div className="text-[11px] text-ink-secondary tracking-widest uppercase">
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
          <div className="grid grid-cols-3 border-b border-[rgba(242,240,235,0.08)] bg-[#141414] text-[11px] text-center">
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

          <AnimatePresence initial={false}>
            {/* STEP 1: Destination, Dates, Budget & Segmented 4-Tier Bar */}
            {step === 1 && (
              <motion.div
                key="wizard-step-1"
                data-lenis-prevent
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="p-6 space-y-5 overflow-y-auto max-h-[62vh]"
              >
              {/* Selected Destination Hero Banner */}
              <div className="p-4 border border-[rgba(242,240,235,0.22)] bg-[#181818] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] text-ink-muted uppercase tracking-widest">
                    ACTIVE EXPEDITION CORRIDOR // {currentDest.country.toUpperCase()}
                  </div>
                  <div className="flex items-baseline gap-2.5 flex-wrap mt-0.5">
                    <h3 className="font-serif text-3xl sm:text-4xl text-ink-primary leading-none">
                      {currentDest.name}
                    </h3>
                    <span className="text-[11px] text-ink-secondary uppercase tracking-wide">
                      — {currentDest.region}
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-muted mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="text-ink-secondary">{currentDest.monumentName}</span>
                    <span>·</span>
                    <span>{currentDest.stops.length} CURATED POIs</span>
                    <span>·</span>
                    <span>MAX +{Math.max(...currentDest.stops.map(s => s.elevationDeltaM), 0)}M ELEV</span>
                  </div>
                </div>
                <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-1 border-t sm:border-t-0 sm:border-l border-[rgba(242,240,235,0.1)] pt-2 sm:pt-0 sm:pl-4">
                  <span className="text-[11px] font-bold text-semantic-nominal tracking-wider">
                    {currentDest.vibeMatchScore}% VIBE MATCH
                  </span>
                  <span className="text-[10px] text-ink-muted uppercase">
                    {currentDest.historicalPeriod}
                  </span>
                </div>
              </div>

              {/* Check-In / Check-Out Dates (Custom Frosted Calendar Popover) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-ink-muted uppercase tracking-widest mb-1">
                    CHECK-IN DATE
                  </label>
                  <PrayanaDatePicker
                    ariaLabel="Wizard Check-In Date"
                    value={checkIn}
                    minDate={getTodayIso()}
                    onChange={(nextIn) => {
                      setCheckIn(nextIn);
                      if (checkOut < nextIn) setCheckOut(nextIn);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-ink-muted uppercase tracking-widest mb-1">
                    CHECK-OUT DATE
                  </label>
                  <PrayanaDatePicker
                    ariaLabel="Wizard Check-Out Date"
                    value={checkOut}
                    minDate={checkIn || getTodayIso()}
                    onChange={(nextOut) => setCheckOut(nextOut)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-ink-muted uppercase tracking-widest mb-1">
                    CALCULATED DURATION
                  </label>
                  <div className="w-full bg-[#181818] border border-[rgba(242,240,235,0.15)] p-2 text-ink-primary font-mono font-bold flex items-center justify-between">
                    <span>{days} DAYS</span>
                    <span className="text-[11px] text-ink-muted">({days - 1} NIGHTS)</span>
                  </div>
                </div>
              </div>

              {/* Live Weather, Festival & Monument Closure Advisories */}
              <div className="p-3 bg-[#161616] border border-[rgba(242,240,235,0.16)] space-y-1.5">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
                  <span className="flex items-center gap-1.5 text-ink-primary font-bold">
                    <CloudRain className="w-3.5 h-3.5" />
                    <span>LIVE WEATHER &amp; FESTIVAL / CLOSURE ADVISORIES</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      void refreshDestinationAdvisories(
                        selectedDestId,
                        currentDest.name,
                        checkIn,
                        checkOut,
                        currentDest.stops
                      )
                    }
                    className="text-[10px] underline text-ink-secondary hover:text-ink-primary cursor-pointer"
                  >
                    {advisoriesLoading ? 'CHECKING...' : 'REFRESH CHECK'}
                  </button>
                </div>
                {destinationAdvisories?.weather_summary && (
                  <div className="text-[11px] text-semantic-nominal">
                    FORECAST: {destinationAdvisories.weather_summary}
                  </div>
                )}
                {destinationAdvisories?.advisory_alerts && destinationAdvisories.advisory_alerts.length > 0 ? (
                  <div className="space-y-1">
                    {destinationAdvisories.advisory_alerts.slice(0, 3).map((al, i) => (
                      <div
                        key={`adv-${i}`}
                        className={`text-[11px] px-2 py-1 border ${
                          al.severity === 'HIGH'
                            ? 'border-semantic-hazard/50 bg-semantic-hazard/10 text-semantic-hazard'
                            : 'border-semantic-caution/40 bg-semantic-caution/10 text-semantic-caution'
                        }`}
                      >
                        <span className="font-bold">[{al.type.toUpperCase()}] {al.title}:</span> {al.detail}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-ink-muted">
                    {advisoriesLoading ? 'Scanning OpenWeatherMap & regional calendar...' : 'No major closures or storm disruptions flagged for these dates.'}
                  </div>
                )}
              </div>

              {/* Group Budget & Per-Person Readout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-[11px] text-ink-muted uppercase tracking-widest mb-1">
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
                    <div className="text-[11px] text-ink-muted uppercase">DAILY PER-PERSON CAP</div>
                    <div className="font-serif text-2xl text-ink-primary">
                      ₹{perPersonPerDay.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-ink-secondary">
                    FOR {groupCount} TRAVELERS<br />OVER {days} DAYS
                  </div>
                </div>
              </div>

              {/* Segmented 4-Tier Budget Bar */}
              <div className="p-3 bg-[#181818] border border-[rgba(242,240,235,0.1)]">
                <div className="flex justify-between text-[11px] text-ink-muted mb-2">
                  <span>SEGMENTED 4-TIER BUDGET SPLIT</span>
                  <span>TOTAL: ₹{budget.toLocaleString()}</span>
                </div>
                <div className="h-2.5 w-full flex bg-[#252525] overflow-hidden mb-2">
                  <motion.div className="bg-[#B8B5AE] h-full origin-left transform-gpu" style={{ width: '35%' }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.35 }} title="Stays 35%" />
                  <motion.div className="bg-[#8E8C86] h-full origin-left transform-gpu" style={{ width: '25%' }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.35 }} title="Food & Dining 25%" />
                  <motion.div className="bg-[#6A6863] h-full origin-left transform-gpu" style={{ width: '20%' }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.35 }} title="Local Transit 20%" />
                  <motion.div className="bg-[#4A4945] h-full origin-left transform-gpu" style={{ width: '20%' }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.35 }} title="Activities & Buffer 20%" />
                </div>
                <div className="grid grid-cols-4 gap-2 text-[11px] text-ink-secondary font-mono">
                  <div>STAYS 35%<br /><span className="text-ink-primary font-bold">₹{Math.round(budget * 0.35).toLocaleString()}</span></div>
                  <div>FOOD 25%<br /><span className="text-ink-primary font-bold">₹{Math.round(budget * 0.25).toLocaleString()}</span></div>
                  <div>TRANSIT 20%<br /><span className="text-ink-primary font-bold">₹{Math.round(budget * 0.20).toLocaleString()}</span></div>
                  <div>BUFFER 20%<br /><span className="text-ink-primary font-bold">₹{Math.round(budget * 0.20).toLocaleString()}</span></div>
                </div>
              </div>

              {/* Selectable Nearby POIs */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-ink-muted uppercase tracking-widest mb-2">
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
                            <div className="text-[12px] text-ink-primary font-medium">{s.title}</div>
                            <div className="text-[11px] text-ink-secondary">+{s.elevationDeltaM}m · {s.dwellMinutes}m dwell</div>
                          </div>
                        </div>
                        <span className="text-[11px] px-1 bg-[#222222] text-ink-secondary border border-[rgba(242,240,235,0.1)]">
                          {s.effortRating}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Switch Corridor / Other 17 Destination Suggestions */}
              <div className="pt-3 border-t border-[rgba(242,240,235,0.1)]">
                <div className="flex items-center justify-between text-[11px] text-ink-muted uppercase tracking-widest mb-2">
                  <span>SWITCH CORRIDOR // OTHER DESTINATIONS</span>
                  <span>{destinations.length - 1} SUGGESTIONS</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {destinations
                    .filter(d => d.id !== selectedDestId)
                    .map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          setSelectedDestId(d.id);
                          setActiveDestinationId(d.id);
                          setSelectedPoiIds(d.stops.map(s => s.id));
                        }}
                        className="p-2 text-left border border-[rgba(242,240,235,0.1)] bg-[#161616] hover:border-ink-primary hover:bg-[#1E1E1E] transition-colors cursor-pointer"
                      >
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="font-serif text-base text-ink-primary truncate">{d.name}</span>
                          <span className="text-[10px] text-semantic-nominal shrink-0">{d.vibeMatchScore}%</span>
                        </div>
                        <div className="text-[10px] text-ink-muted truncate">{d.region}</div>
                      </button>
                    ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Multi-select Traveler Assignment & Group Risk Warnings */}
          {step === 2 && (
            <motion.div
              key="wizard-step-2"
              data-lenis-prevent
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="p-6 space-y-4 overflow-y-auto max-h-[62vh]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-ink-muted uppercase tracking-widest">
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

              {/* Host Connected Friends Dropdown Selector */}
              <div className="p-3.5 bg-[#161616] border border-[rgba(242,240,235,0.16)] space-y-2.5">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-widest">
                  <span className="flex items-center gap-1.5 text-ink-primary font-bold">
                    <AtSign className="w-3.5 h-3.5" />
                    <span>CONNECTED FRIENDS (APP)</span>
                  </span>
                  <span className="text-ink-muted">{connectedFriends.length} SAVED FRIEND(S)</span>
                </div>

                {connectedFriends.length > 0 ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsFriendMenuOpen(prev => !prev)}
                      aria-expanded={isFriendMenuOpen}
                      aria-label="Connected Friends & Family Profiles Dropdown"
                      className="w-full bg-[#121212] border border-[rgba(242,240,235,0.22)] hover:border-ink-primary px-3 py-2 text-ink-primary font-mono text-[12px] flex items-center justify-between gap-2 cursor-pointer transition-colors"
                    >
                      <span className="truncate">
                        SELECT FRIEND OR FAMILY PROFILE TO ADD ({connectedFriends.reduce((sum, f) => sum + (f.sharedProfiles?.length || 1), 0)} AVAILABLE)
                      </span>
                      <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isFriendMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isFriendMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.14 }}
                          data-lenis-prevent
                          className="absolute left-0 right-0 top-full mt-1 z-30 prayana-glass border border-[rgba(242,240,235,0.24)] shadow-2xl max-h-60 overflow-y-auto divide-y divide-[rgba(242,240,235,0.08)]"
                        >
                          {connectedFriends.map((friend) => {
                            const profilesToList = friend.sharedProfiles && friend.sharedProfiles.length > 0
                              ? friend.sharedProfiles
                              : [friend.profile];
                            return (
                              <div key={friend.uid} className="p-2 space-y-1">
                                <div className="px-2 py-0.5 text-[10px] text-ink-muted uppercase tracking-widest flex items-center justify-between">
                                  <span>@{friend.username} · {friend.name}</span>
                                  <span>{profilesToList.length} PROFILE{profilesToList.length === 1 ? '' : 'S'}</span>
                                </div>
                                {profilesToList.map((prof) => {
                                  const candidateId = `friend-${friend.uid}-${prof.id}`;
                                  const existing = travelers.find(
                                    t =>
                                      t.id === candidateId ||
                                      (prof.isPrimarySelf && (t.ownerUid === friend.uid || t.id === `friend-${friend.uid}`))
                                  );
                                  const inCohort = existing ? selectedTravelers.includes(existing.id) : false;
                                  return (
                                    <button
                                      key={candidateId}
                                      type="button"
                                      onClick={() => {
                                        const added = addConnectedFriendToCohort(friend, prof);
                                        setSelectedTravelers(prev =>
                                          prev.includes(added.id) ? prev : [...prev, added.id]
                                        );
                                        setSelectedFriendUid(friend.uid);
                                        setIsFriendMenuOpen(false);
                                      }}
                                      className="w-full px-2.5 py-2 text-left hover:bg-[rgba(242,240,235,0.08)] flex items-center justify-between gap-2 transition-colors cursor-pointer"
                                    >
                                      <div className="min-w-0">
                                        <div className="text-[12px] font-bold text-ink-primary truncate">
                                          {prof.name}
                                        </div>
                                        <div className="text-[10px] text-ink-secondary truncate">
                                          {prof.age}y · {prof.mobility}
                                          {prof.dietaryTags.length > 0 ? ` · ${prof.dietaryTags.slice(0, 2).join(', ')}` : ''}
                                        </div>
                                      </div>
                                      <span
                                        className={`px-2 py-0.5 border text-[10px] font-bold shrink-0 ${
                                          inCohort
                                            ? 'border-semantic-nominal/60 text-semantic-nominal bg-semantic-nominal/10'
                                            : 'border-ink-primary bg-ink-primary text-canvas'
                                        }`}
                                      >
                                        {inCohort ? 'IN TRIP ✓' : '+ ADD'}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-ink-secondary">
                    <span>No accepted app friends yet. Connect with friends by @username in PROFILES first.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsWizardOpen(false);
                        setActiveView('PROFILES');
                        setEditingTravelerId(null);
                        setIntakeMode('CONNECT');
                        setIsIntakeModalOpen(true);
                      }}
                      className="px-2.5 py-1 border border-[rgba(242,240,235,0.2)] hover:border-ink-primary text-ink-primary cursor-pointer shrink-0"
                    >
                      [ + CONNECT BY @USERNAME ]
                    </button>
                  </div>
                )}
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
                            {t.name} <span className="font-mono text-[12px] text-ink-muted font-normal">({t.age} yrs)</span>
                          </div>
                          <div className="text-[11px] text-ink-secondary mt-0.5">
                            {t.mobility} · {t.vitals.heartRate} BPM (Baseline)
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {t.medicalFlags.map(m => (
                          <span key={m} className="px-1.5 py-0.2 bg-[#261515] border border-semantic-hazard/40 text-semantic-hazard text-[11px]">
                            {m.toUpperCase()}
                          </span>
                        ))}
                        {t.dietaryTags.map(d => (
                          <span key={d} className="px-1.5 py-0.2 bg-[#1C1C1C] border border-[rgba(242,240,235,0.1)] text-ink-secondary text-[11px]">
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
                <div className="text-[11px] text-ink-muted uppercase tracking-widest">
                  AUTOMATED SOLVER CONSTRAINT WARNINGS
                </div>

                {hasAssistedMobility && (
                  <div className="p-2.5 bg-[#201A15] border border-semantic-caution/60 text-semantic-caution text-[11px] flex items-start space-x-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">ASSISTED MOBILITY BOUND:</span> Cohort includes assisted mobility members. High-slope trails (θ &gt; 3.0°) and boulder step-routes will be pruned from the primary timeline.
                    </div>
                  </div>
                )}

                {hasAsthma && (
                  <div className="p-2.5 bg-[#201A15] border border-semantic-caution/60 text-semantic-caution text-[11px] flex items-start space-x-2">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">ASTHMA & CARDIOPULMONARY SAFETY:</span> Uphill legs scaled by c_resp (0.7). Midday outdoor segments during high thermal stress (WBGT &gt; 28°C) are capped at 45 min dwell.
                    </div>
                  </div>
                )}

                {hasMotionSickness && (
                  <div className="p-2.5 bg-[#201A15] border border-semantic-caution/60 text-semantic-caution text-[11px] flex items-start space-x-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">MOTION SICKNESS WARNING:</span> Winding mountain hairpin passes in Coorg / Western Ghats flagged. Route prioritizes national highways with 15-min rest pauses.
                    </div>
                  </div>
                )}

                {groupAllergies.length > 0 && (
                  <div className="p-2.5 bg-[#241515] border border-semantic-hazard/60 text-semantic-hazard text-[11px] flex items-start space-x-2">
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
              data-lenis-prevent
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="p-6 space-y-4 overflow-y-auto max-h-[62vh]"
            >
              <div>
                <label className="block text-[11px] text-ink-muted uppercase tracking-widest mb-2">
                  CHOOSE PRIMARY INTER-STOP TRANSIT
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    type="button"
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
                      <span className="font-serif text-xl text-ink-primary">PRIVATE VEHICLE</span>
                    </div>
                    <div className="text-[11px] text-ink-secondary mt-1">2-Wheeler / 4-Wheeler · Petrol, Diesel &amp; EV Chargers</div>
                  </motion.button>

                  <motion.button
                    type="button"
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
                      <span className="font-serif text-xl text-ink-primary">PUBLIC TRANSIT</span>
                    </div>
                    <div className="text-[11px] text-ink-secondary mt-1">Flight, Train, Bus · PNR &amp; Hub Tracking</div>
                  </motion.button>
                </div>
              </div>

              {transitMode === 'Self-Drive' ? (
                <div className="space-y-3 p-3.5 border border-[rgba(242,240,235,0.12)] bg-[#161616]">
                  <div>
                    <label className="block text-[10px] text-ink-muted uppercase tracking-widest mb-1.5">
                      VEHICLE TYPE
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['2W', '4W'] as const).map((vt) => (
                        <button
                          key={vt}
                          type="button"
                          onClick={() => setVehicleType(vt)}
                          className={`py-2 px-3 border text-[11px] font-bold uppercase cursor-pointer ${
                            vehicleType === vt
                              ? 'bg-ink-primary text-[#0E0E0E] border-ink-primary'
                              : 'bg-[#121212] text-ink-secondary border-[rgba(242,240,235,0.15)]'
                          }`}
                        >
                          {vt === '2W' ? '2-WHEELER (SCOOTER / MOTO)' : '4-WHEELER (CAR / SUV)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-ink-muted uppercase tracking-widest mb-1.5">
                      POWERTRAIN
                    </label>
                    <div className={`grid gap-2 ${vehicleType === '4W' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      {(['PETROL', ...(vehicleType === '4W' ? (['DIESEL'] as const) : []), 'EV'] as const).map((ft) => (
                        <button
                          key={ft}
                          type="button"
                          onClick={() => setFuelType(ft)}
                          className={`py-2 px-3 border text-[11px] font-bold uppercase cursor-pointer ${
                            fuelType === ft
                              ? 'bg-ink-primary text-[#0E0E0E] border-ink-primary'
                              : 'bg-[#121212] text-ink-secondary border-[rgba(242,240,235,0.15)]'
                          }`}
                        >
                          {ft === 'EV' ? 'ELECTRIC (EV)' : ft}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-3.5 border border-[rgba(242,240,235,0.12)] bg-[#161616]">
                  <div className="grid grid-cols-3 gap-2">
                    {(['FLIGHT', 'TRAIN', 'BUS'] as const).map((pm) => (
                      <button
                        key={pm}
                        type="button"
                        onClick={() => setPublicMode(pm)}
                        className={`py-2 px-2 border text-[11px] font-bold uppercase cursor-pointer ${
                          publicMode === pm
                            ? 'bg-ink-primary text-[#0E0E0E] border-ink-primary'
                            : 'bg-[#121212] text-ink-secondary border-[rgba(242,240,235,0.15)]'
                        }`}
                      >
                        {pm}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-ink-muted uppercase mb-1">
                        DEPARTURE HUB
                      </label>
                      <input
                        type="text"
                        value={originHub}
                        onChange={(e) => setOriginHub(e.target.value)}
                        placeholder="e.g. Bengaluru (SBC / BLR)"
                        className="w-full bg-[#181818] border border-[rgba(242,240,235,0.15)] p-2 text-ink-primary focus:border-ink-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-ink-muted uppercase mb-1">
                        ARRIVAL HUB
                      </label>
                      <input
                        type="text"
                        value={arrivalHub}
                        onChange={(e) => setArrivalHub(e.target.value)}
                        placeholder="e.g. Hospet Junction (HPT)"
                        className="w-full bg-[#181818] border border-[rgba(242,240,235,0.15)] p-2 text-ink-primary focus:border-ink-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-ink-muted uppercase mb-1">
                        SERVICE / CARRIER NO.
                      </label>
                      <input
                        type="text"
                        value={flightOrTrain}
                        onChange={(e) => setFlightOrTrain(e.target.value)}
                        placeholder="e.g. Hampi Express 16592"
                        className="w-full bg-[#181818] border border-[rgba(242,240,235,0.15)] p-2 text-ink-primary font-mono focus:border-ink-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-ink-muted uppercase mb-1">
                        PNR / BOOKING REF
                      </label>
                      <input
                        type="text"
                        value={pnrOrRef}
                        onChange={(e) => setPnrOrRef(e.target.value)}
                        placeholder="e.g. 421-8890123"
                        className="w-full bg-[#181818] border border-[rgba(242,240,235,0.15)] p-2 text-ink-primary font-mono focus:border-ink-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Customizable Day-Wise Schedule Preview */}
              <div className="p-3.5 border border-[rgba(242,240,235,0.14)] bg-[#161616] space-y-2.5">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-widest border-b border-[rgba(242,240,235,0.08)] pb-2">
                  <span className="text-ink-primary font-bold">
                    CUSTOMIZABLE DAY-WISE SCHEDULE PREVIEW ({draftStops.length} STOPS · {days} DAYS)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const chosenStops = currentDest.stops.filter(s => selectedPoiIds.includes(s.id));
                      setDraftStops(
                        distributeStopsAcrossDays(
                          chosenStops.length > 0 ? chosenStops : currentDest.stops,
                          days,
                          currentDest.stops
                        )
                      );
                    }}
                    className="text-[10px] underline text-ink-secondary hover:text-ink-primary cursor-pointer"
                  >
                    AUTO-BALANCE
                  </button>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {Array.from({ length: days }, (_, i) => i + 1).map((dayNum) => {
                    const stopsForDay = draftStops.filter(s => (s.day ?? 1) === dayNum);
                    return (
                      <div key={`preview-day-${dayNum}`} className="p-2 bg-[#121212] border border-[rgba(242,240,235,0.1)] space-y-1.5">
                        <div className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">
                          DAY {String(dayNum).padStart(2, '0')} ({stopsForDay.length} STOPS)
                        </div>
                        {stopsForDay.length === 0 ? (
                          <div className="text-[10px] text-ink-muted italic">Rest / buffer day — assign any stop below.</div>
                        ) : (
                          stopsForDay.map((stop) => {
                            const globalIdx = draftStops.findIndex(s => s.id === stop.id);
                            return (
                              <div
                                key={stop.id}
                                className="flex items-center justify-between gap-2 text-[11px] py-1 px-2 bg-[#181818] border border-[rgba(242,240,235,0.08)]"
                              >
                                <span className="truncate text-ink-primary font-semibold flex-1">{stop.title}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <select
                                    aria-label={`Assign ${stop.title} to day`}
                                    value={dayNum}
                                    onChange={(e) => {
                                      const nextDay = Number(e.target.value);
                                      setDraftStops(prev =>
                                        prev.map(s => (s.id === stop.id ? { ...s, day: nextDay } : s))
                                      );
                                    }}
                                    className="bg-[#121212] border border-[rgba(242,240,235,0.2)] px-1 py-0.5 text-[10px] text-ink-primary"
                                  >
                                    {Array.from({ length: days }, (_, k) => k + 1).map(d => (
                                      <option key={d} value={d}>DAY {String(d).padStart(2, '0')}</option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    disabled={globalIdx <= 0}
                                    onClick={() => {
                                      if (globalIdx <= 0) return;
                                      setDraftStops(prev => {
                                        const copy = [...prev];
                                        [copy[globalIdx - 1], copy[globalIdx]] = [copy[globalIdx], copy[globalIdx - 1]];
                                        return copy;
                                      });
                                    }}
                                    className="p-0.5 text-ink-secondary hover:text-ink-primary disabled:opacity-30 cursor-pointer"
                                    title="Move up"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={globalIdx >= draftStops.length - 1}
                                    onClick={() => {
                                      if (globalIdx >= draftStops.length - 1) return;
                                      setDraftStops(prev => {
                                        const copy = [...prev];
                                        [copy[globalIdx], copy[globalIdx + 1]] = [copy[globalIdx + 1], copy[globalIdx]];
                                        return copy;
                                      });
                                    }}
                                    className="p-0.5 text-ink-secondary hover:text-ink-primary disabled:opacity-30 cursor-pointer"
                                    title="Move down"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDraftStops(prev => prev.filter(s => s.id !== stop.id))}
                                    className="p-0.5 text-ink-muted hover:text-semantic-hazard cursor-pointer"
                                    title="Remove stop"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* External Indian & Global Booking Portals */}
              <div>
                <div className="text-[11px] text-ink-muted uppercase tracking-widest mb-2">
                  BOOKING &amp; LIVE TRACKING PORTALS
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[10px]">
                  {[
                    { name: 'IRCTC', url: 'https://www.irctc.co.in' },
                    { name: 'NTES', url: 'https://enquiry.indianrail.gov.in' },
                    { name: 'REDBUS', url: 'https://www.redbus.in' },
                    { name: 'KSRTC', url: 'https://ksrtc.in' },
                    { name: 'FLIGHTAWARE', url: 'https://www.flightaware.com' },
                    { name: 'G-FLIGHTS', url: 'https://www.google.com/travel/flights' },
                  ].map((portal) => (
                    <a
                      key={portal.name}
                      href={portal.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-[#181818] border border-[rgba(242,240,235,0.1)] hover:border-ink-primary text-ink-secondary hover:text-ink-primary transition-colors flex items-center justify-center gap-1"
                    >
                      <span>{portal.name}</span>
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </a>
                  ))}
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
              ) : showExistingChoice ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => finalizeTripCreation('APPEND')}
                    className="mono-hud-btn px-3.5 py-1.5 bg-emerald-500 text-canvas font-bold text-[11px] cursor-pointer"
                  >
                    [ ADD TO EXISTING ITINERARY ]
                  </button>
                  <button
                    type="button"
                    onClick={() => finalizeTripCreation('NEW')}
                    className="mono-hud-btn px-3.5 py-1.5 bg-ink-primary text-canvas font-bold text-[11px] cursor-pointer"
                  >
                    [ CLEAR OLD &amp; START NEW TRIP ]
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="mono-hud-btn px-5 py-1.5 bg-ink-primary text-canvas font-bold hover:bg-white flex items-center gap-2 cursor-pointer"
                >
                  <span>[ CONFIRM &amp; CREATE ITINERARY ]</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
