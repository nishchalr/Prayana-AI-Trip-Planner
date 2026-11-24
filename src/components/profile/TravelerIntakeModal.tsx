import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { connectBleHeartRateDevice, isWebBluetoothSupported } from '../../services/bleHealthService';
import { 
  TravelerProfile, 
  MobilityLevel, 
  MedicalFlag, 
  DietaryTag 
} from '../../types';
import { 
  X, 
  Check, 
  ArrowRight, 
  AlertTriangle, 
  Activity, 
  ShieldCheck, 
  Watch, 
  Sliders, 
  Compass,
  Heart
} from 'lucide-react';

const MOBILITY_OPTIONS: MobilityLevel[] = [
  'Full Mobility',
  'Assisted',
  'Wheelchair-Accessible',
];

const MEDICAL_FLAG_OPTIONS: MedicalFlag[] = [
  'Asthma',
  'Hypertension',
  'Arthritis',
  'Motion Sickness',
  'Altitude Sensitivity',
];

const DIETARY_ALLERGY_OPTIONS: DietaryTag[] = [
  'Pure Vegetarian',
  'Vegan',
  'Halal',
  'Gluten-Free',
  'Nut Allergy',
  'Shellfish Allergy',
];

const LANDSCAPE_OPTIONS = [
  'Highland Trails & Mist',
  'Heritage Ruins & Stone Temples',
  'Riverfront Ghats & Waterways',
  'Artisan Quarters & Markets',
  'Tranquil Forests & Estates',
];

export const TravelerIntakeModal: React.FC = () => {
  const { 
    isIntakeModalOpen, 
    setIsIntakeModalOpen, 
    editingTravelerId, 
    setEditingTravelerId,
    travelers, 
    addTraveler, 
    updateTraveler 
  } = usePrayana();

  const [step, setStep] = useState<number>(1);

  // Form State
  const [name, setName] = useState('');
  const [age, setAge] = useState<number>(30);
  const [mobility, setMobility] = useState<MobilityLevel>('Full Mobility');
  const [medicalFlags, setMedicalFlags] = useState<MedicalFlag[]>([]);
  const [dietaryTags, setDietaryTags] = useState<DietaryTag[]>([]);
  const [vibeProfile, setVibeProfile] = useState('Architectural Heritage & Photography');
  const [landscapePreferences, setLandscapePreferences] = useState<string[]>([
    'Heritage Ruins & Stone Temples',
  ]);
  const [crowdTolerance, setCrowdTolerance] = useState<'Low / Solitary' | 'Moderate / Standard' | 'High / Festive'>('Moderate / Standard');
  const [pacingPreference, setPacingPreference] = useState<'Slow & Restful' | 'Balanced' | 'High Exertion'>('Balanced');

  // Contact & Insurance
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [insuranceId, setInsuranceId] = useState('');

  // Wearable Pairing State (honest default: UNPAIRED until live BLE or explicit simulator)
  const [fitbandConnected, setFitbandConnected] = useState<boolean>(false);
  const [wearableStatus, setWearableStatus] = useState<'UNPAIRED' | 'BLE_CONNECTED' | 'SIMULATED'>('UNPAIRED');
  const [bleDeviceName, setBleDeviceName] = useState<string | undefined>(undefined);
  const [isPairingSim, setIsPairingSim] = useState<boolean>(false);
  const [pairingError, setPairingError] = useState<string | null>(null);

  // Load existing traveler data if editing
  useEffect(() => {
    if (editingTravelerId) {
      const existing = travelers.find(t => t.id === editingTravelerId);
      if (existing) {
        setName(existing.name);
        setAge(existing.age);
        setMobility(existing.mobility);
        setMedicalFlags(existing.medicalFlags);
        setDietaryTags(existing.dietaryTags);
        setVibeProfile(existing.vibeProfile);
        setLandscapePreferences(existing.landscapePreferences || ['Heritage Ruins & Stone Temples']);
        setCrowdTolerance(existing.crowdTolerance || 'Moderate / Standard');
        setPacingPreference(existing.pacingPreference || 'Balanced');
        setEmergencyName(existing.emergencyContact.name);
        setEmergencyPhone(existing.emergencyContact.phone);
        setEmergencyRelation(existing.emergencyContact.relation);
        setGuardianName(existing.localGuardian?.name || '');
        setGuardianPhone(existing.localGuardian?.phone || '');
        setInsuranceId(existing.travelInsuranceId);
        setFitbandConnected(existing.fitbandConnected);
        setWearableStatus(
          existing.wearableStatus ?? (existing.fitbandConnected ? 'BLE_CONNECTED' : 'UNPAIRED')
        );
        setBleDeviceName(existing.bleDeviceName);
        setPairingError(null);
      }
    } else {
      // Defaults for new traveler
      setName('');
      setAge(28);
      setMobility('Full Mobility');
      setMedicalFlags([]);
      setDietaryTags([]);
      setVibeProfile('Cultural Explorer');
      setLandscapePreferences(['Heritage Ruins & Stone Temples']);
      setCrowdTolerance('Moderate / Standard');
      setPacingPreference('Balanced');
      setEmergencyName('');
      setEmergencyPhone('');
      setEmergencyRelation('');
      setGuardianName('');
      setGuardianPhone('');
      setInsuranceId(`POL-PRYN-${Math.floor(1000 + Math.random() * 9000)}`);
      setFitbandConnected(false);
      setWearableStatus('UNPAIRED');
      setBleDeviceName(undefined);
      setPairingError(null);
    }
    setStep(1);
  }, [editingTravelerId, isIntakeModalOpen]);

  if (!isIntakeModalOpen) return null;

  const toggleMedicalFlag = (flag: MedicalFlag) => {
    setMedicalFlags(prev =>
      prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]
    );
  };

  const toggleDietaryTag = (tag: DietaryTag) => {
    setDietaryTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleLandscape = (opt: string) => {
    setLandscapePreferences(prev =>
      prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
    );
  };

  const handlePairFitband = async () => {
    setIsPairingSim(true);
    setPairingError(null);
    try {
      const handle = await connectBleHeartRateDevice(
        () => {},
        () => {}
      );
      setFitbandConnected(true);
      setWearableStatus('BLE_CONNECTED');
      setBleDeviceName(handle.deviceName);
    } catch (err: any) {
      setPairingError(err?.message || 'Unable to pair Web Bluetooth Heart Rate sensor.');
    } finally {
      setIsPairingSim(false);
    }
  };

  const handleToggleSimulator = () => {
    setPairingError(null);
    if (wearableStatus === 'SIMULATED') {
      setWearableStatus('UNPAIRED');
      setFitbandConnected(false);
      setBleDeviceName(undefined);
    } else {
      setWearableStatus('SIMULATED');
      setFitbandConnected(false);
      setBleDeviceName('MANUAL_SIMULATOR');
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;

    if (editingTravelerId) {
      updateTraveler(editingTravelerId, {
        name,
        age,
        mobility,
        medicalFlags,
        dietaryTags,
        vibeProfile,
        landscapePreferences,
        crowdTolerance,
        pacingPreference,
        fitbandConnected,
        wearableStatus,
        bleDeviceName,
        travelInsuranceId: insuranceId,
        emergencyContact: {
          name: emergencyName || 'Emergency Primary',
          phone: emergencyPhone || '+91 98000 00000',
          relation: emergencyRelation || 'Family',
        },
        localGuardian: guardianName ? { name: guardianName, phone: guardianPhone } : undefined,
      });
    } else {
      const newId = `traveler-${Date.now()}`;
      const newTraveler: TravelerProfile = {
        id: newId,
        name,
        age,
        mobility,
        medicalFlags,
        dietaryTags,
        vibeProfile,
        landscapePreferences,
        crowdTolerance,
        pacingPreference,
        fitbandConnected,
        wearableStatus,
        bleDeviceName,
        travelInsuranceId: insuranceId || `POL-PRYN-${Math.floor(1000 + Math.random() * 9000)}`,
        emergencyContact: {
          name: emergencyName || 'Primary Contact',
          phone: emergencyPhone || '+91 98450 00000',
          relation: emergencyRelation || 'Family',
        },
        localGuardian: guardianName ? { name: guardianName, phone: guardianPhone } : undefined,
        vitals: {
          heartRate: 72,
          spO2: 99,
          steps: 4500,
          strainLevel: 'LOW',
          ambientWbgt: 26.5,
          lastSync: 'just now',
        },
      };
      addTraveler(newTraveler);
    }

    setIsIntakeModalOpen(false);
    setEditingTravelerId(null);
  };

  const hasAllergiesSelected = dietaryTags.some(t => 
    t === 'Nut Allergy' || t === 'Shellfish Allergy' || t === 'Gluten-Free'
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            setIsIntakeModalOpen(false);
            setEditingTravelerId(null);
          }}
          className="absolute inset-0 bg-black/85 backdrop-blur-xs"
        />

        {/* Modal Frame */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative z-10 w-full max-w-2xl bg-[#121212] border border-[rgba(242,240,235,0.18)] shadow-2xl flex flex-col overflow-hidden text-ink-primary font-mono text-[11px]"
        >
          {/* Header */}
          <div className="p-5 border-b border-[rgba(242,240,235,0.12)] flex items-center justify-between bg-[#161616]">
            <div>
              <div className="text-[9px] text-ink-secondary tracking-widest uppercase">
                TRAVELER PROFILE INTAKE // 4-STEP MEDICAL SPECIFICATION
              </div>
              <h2 className="font-serif text-3xl text-ink-primary tracking-tight mt-0.5">
                {editingTravelerId ? `Edit ${name || 'Traveler'}` : 'New Traveler Intake'}
              </h2>
            </div>
            <button
              onClick={() => {
                setIsIntakeModalOpen(false);
                setEditingTravelerId(null);
              }}
              className="p-1.5 hover:bg-[#222222] transition-colors border border-[rgba(242,240,235,0.14)]"
            >
              <X className="w-4 h-4 text-ink-secondary hover:text-ink-primary" />
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-4 border-b border-[rgba(242,240,235,0.08)] bg-[#141414] text-[9px] text-center">
            <div className={`py-2 border-r border-[rgba(242,240,235,0.08)] ${step >= 1 ? 'text-ink-primary font-bold bg-[#1C1C1C]' : 'text-ink-muted'}`}>
              01 // BIOMETRICS
            </div>
            <div className={`py-2 border-r border-[rgba(242,240,235,0.08)] ${step >= 2 ? 'text-ink-primary font-bold bg-[#1C1C1C]' : 'text-ink-muted'}`}>
              02 // DIETARY
            </div>
            <div className={`py-2 border-r border-[rgba(242,240,235,0.08)] ${step >= 3 ? 'text-ink-primary font-bold bg-[#1C1C1C]' : 'text-ink-muted'}`}>
              03 // VIBE & PACING
            </div>
            <div className={`py-2 ${step >= 4 ? 'text-ink-primary font-bold bg-[#1C1C1C]' : 'text-ink-muted'}`}>
              04 // WEARABLE
            </div>
          </div>

          {/* Step 1: Biometrics, Mobility & Medical Flags */}
          {step === 1 && (
            <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[9px] text-ink-muted uppercase tracking-widest mb-1.5">
                    FULL LEGAL NAME
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aarav Rao"
                    className="w-full bg-[#181818] border border-[rgba(242,240,235,0.15)] p-2 text-ink-primary font-sans text-sm focus:border-ink-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] text-ink-muted uppercase tracking-widest mb-1.5">
                    AGE (YEARS)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="110"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full bg-[#181818] border border-[rgba(242,240,235,0.15)] p-2 text-ink-primary font-mono focus:border-ink-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Mobility Radio Chips */}
              <div>
                <label className="block text-[9px] text-ink-muted uppercase tracking-widest mb-2">
                  MOBILITY CLASSIFICATION (AFFECTS MAX SLOPE θ THRESHOLD)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {MOBILITY_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setMobility(opt)}
                      className={`p-2.5 text-center border transition-all ${
                        mobility === opt
                          ? 'border-ink-primary bg-[#222222] text-ink-primary font-bold'
                          : 'border-[rgba(242,240,235,0.1)] bg-[#161616] text-ink-secondary hover:border-ink-secondary'
                      }`}
                    >
                      <div className="text-[10px]">{opt}</div>
                      <div className="text-[8px] text-ink-muted mt-0.5">
                        {opt === 'Full Mobility' && 'Max Slope 8.0°'}
                        {opt === 'Assisted' && 'Max Slope 3.0°'}
                        {opt === 'Wheelchair-Accessible' && 'Zero Stairs / Ramps'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* High-Risk Medical Flags */}
              <div>
                <label className="block text-[9px] text-ink-muted uppercase tracking-widest mb-2">
                  HIGH-RISK MEDICAL FLAGS (DERIVES HEURISTIC VECTOR c_card & c_resp)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MEDICAL_FLAG_OPTIONS.map(flag => {
                    const isChecked = medicalFlags.includes(flag);
                    return (
                      <button
                        key={flag}
                        type="button"
                        onClick={() => toggleMedicalFlag(flag)}
                        className={`p-2 border text-left transition-colors flex items-center justify-between ${
                          isChecked
                            ? 'border-semantic-hazard bg-[#261515] text-semantic-hazard font-bold'
                            : 'border-[rgba(242,240,235,0.1)] bg-[#161616] text-ink-secondary hover:border-ink-secondary'
                        }`}
                      >
                        <span className="text-[10px]">{flag}</span>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Dietary & Allergies */}
          {step === 2 && (
            <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
              <div>
                <label className="block text-[9px] text-ink-muted uppercase tracking-widest mb-2">
                  DIETARY CONSTRAINTS & ALLERGIES
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DIETARY_ALLERGY_OPTIONS.map(tag => {
                    const isSelected = dietaryTags.includes(tag);
                    const isAllergy = tag.includes('Allergy') || tag === 'Gluten-Free';
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleDietaryTag(tag)}
                        className={`p-2.5 border text-left transition-colors flex items-center justify-between ${
                          isSelected
                            ? isAllergy
                              ? 'border-semantic-hazard bg-[#261515] text-semantic-hazard font-bold'
                              : 'border-ink-primary bg-[#202020] text-ink-primary font-bold'
                            : 'border-[rgba(242,240,235,0.1)] bg-[#161616] text-ink-secondary hover:border-ink-secondary'
                        }`}
                      >
                        <span className="text-[10px]">{tag}</span>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Restrained Amber/Crimson Advisory Notice */}
              {hasAllergiesSelected && (
                <div className="p-3 bg-[#241616] border border-semantic-hazard/50 text-semantic-hazard text-[9px] flex items-start space-x-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">RESTRAINED ALLERGEN PROTOCOL ACTIVE:</span> Selected allergens will strictly constrain group restaurant recommendations. Prayana’s offline OCR menu scanner will highlight cross-contact risks using fuzzy keyword matching (ϵ = 0.20).
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Landscape, Crowd Tolerance & Pacing */}
          {step === 3 && (
            <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
              <div>
                <label className="block text-[9px] text-ink-muted uppercase tracking-widest mb-2">
                  PREFERRED LANDSCAPE & HERITAGE TERRAIN
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {LANDSCAPE_OPTIONS.map(opt => {
                    const isSelected = landscapePreferences.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleLandscape(opt)}
                        className={`p-2 border text-left transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'border-ink-primary bg-[#202020] text-ink-primary font-bold'
                            : 'border-[rgba(242,240,235,0.1)] bg-[#161616] text-ink-secondary hover:border-ink-secondary'
                        }`}
                      >
                        <span className="text-[10px]">{opt}</span>
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Crowd Tolerance Slider */}
              <div className="space-y-1.5 p-3 bg-[#161616] border border-[rgba(242,240,235,0.1)]">
                <div className="flex justify-between text-[9px]">
                  <span className="text-ink-muted uppercase">CROWD TOLERANCE</span>
                  <span className="text-ink-primary font-bold">{crowdTolerance}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['Low / Solitary', 'Moderate / Standard', 'High / Festive'] as const).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCrowdTolerance(c)}
                      className={`py-1.5 text-center border text-[9px] ${
                        crowdTolerance === c
                          ? 'border-ink-primary bg-[#222222] text-ink-primary font-bold'
                          : 'border-[rgba(242,240,235,0.08)] bg-[#121212] text-ink-secondary'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pacing Preference Slider */}
              <div className="space-y-1.5 p-3 bg-[#161616] border border-[rgba(242,240,235,0.1)]">
                <div className="flex justify-between text-[9px]">
                  <span className="text-ink-muted uppercase">PACING & EXERTION PREFERENCE</span>
                  <span className="text-ink-primary font-bold">{pacingPreference}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['Slow & Restful', 'Balanced', 'High Exertion'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPacingPreference(p)}
                      className={`py-1.5 text-center border text-[9px] ${
                        pacingPreference === p
                          ? 'border-ink-primary bg-[#222222] text-ink-primary font-bold'
                          : 'border-[rgba(242,240,235,0.08)] bg-[#121212] text-ink-secondary'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Emergency Contacts, Insurance & Google Health Pairing */}
          {step === 4 && (
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Emergency Contact */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[8px] text-ink-muted uppercase tracking-widest mb-1">
                    EMERGENCY CONTACT NAME
                  </label>
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="e.g. Ramesh Rao"
                    className="w-full bg-[#181818] border border-[rgba(242,240,235,0.15)] p-1.5 text-ink-primary focus:border-ink-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[8px] text-ink-muted uppercase tracking-widest mb-1">
                    RELATION
                  </label>
                  <input
                    type="text"
                    value={emergencyRelation}
                    onChange={(e) => setEmergencyRelation(e.target.value)}
                    placeholder="e.g. Father"
                    className="w-full bg-[#181818] border border-[rgba(242,240,235,0.15)] p-1.5 text-ink-primary focus:border-ink-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] text-ink-muted uppercase tracking-widest mb-1">
                    EMERGENCY CONTACT PHONE
                  </label>
                  <input
                    type="text"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="+91 98450 11234"
                    className="w-full bg-[#181818] border border-[rgba(242,240,235,0.15)] p-1.5 text-ink-primary font-mono focus:border-ink-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[8px] text-ink-muted uppercase tracking-widest mb-1">
                    TRAVEL INSURANCE POLICY ID
                  </label>
                  <input
                    type="text"
                    value={insuranceId}
                    onChange={(e) => setInsuranceId(e.target.value)}
                    placeholder="POL-ICICI-2026-8891A"
                    className="w-full bg-[#181818] border border-[rgba(242,240,235,0.15)] p-1.5 text-ink-primary font-mono focus:border-ink-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Web Bluetooth Wearable Fitband Pairing Section */}
              <div className="p-4 bg-[#161616] border border-ink-primary/30 mt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Watch className="w-4 h-4 text-ink-primary" />
                    <span className="font-semibold text-ink-primary">
                      WEB BLUETOOTH FITBAND / HEART RATE TELEMETRY
                    </span>
                  </div>
                  {wearableStatus === 'BLE_CONNECTED' ? (
                    <span className="px-2 py-0.5 bg-semantic-nominal/20 border border-semantic-nominal text-semantic-nominal text-[9px] font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> BLE CONNECTED
                    </span>
                  ) : wearableStatus === 'SIMULATED' ? (
                    <span className="px-2 py-0.5 bg-amber-950/60 border border-amber-500/60 text-amber-300 text-[9px] font-bold">
                      MANUAL / DEMO SIMULATOR
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-[#252525] border border-[rgba(242,240,235,0.2)] text-ink-muted text-[9px]">
                      [ NO FITBAND CONNECTED ]
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-ink-secondary mb-3 leading-relaxed">
                  Connect a real BLE Heart Rate monitor (GATT 0x180D) via browser Web Bluetooth, or leave unpaired / opt into Manual Demo Simulator when no sensor is available.
                </p>

                {pairingError && (
                  <div className="mb-3 p-2 border border-semantic-hazard/50 bg-[#261414] text-semantic-hazard text-[9px]">
                    [ BLE NOTICE: {pairingError} ]
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePairFitband}
                      disabled={isPairingSim || !isWebBluetoothSupported()}
                      className="mono-hud-btn px-3 py-1.5 bg-[#222222] border border-ink-primary text-ink-primary hover:bg-ink-primary hover:text-canvas transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Activity className={`w-3.5 h-3.5 ${isPairingSim ? 'animate-spin' : ''}`} />
                      <span>
                        {isPairingSim
                          ? 'PAIRING BLE DEVICE...'
                          : '[ PAIR BLUETOOTH FITBAND ]'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleSimulator}
                      className={`mono-hud-btn px-3 py-1.5 border text-[9px] transition-all cursor-pointer ${
                        wearableStatus === 'SIMULATED'
                          ? 'bg-amber-950/60 border-amber-400 text-amber-200'
                          : 'bg-[#1a1a1a] border-[rgba(242,240,235,0.2)] text-ink-secondary hover:text-ink-primary'
                      }`}
                    >
                      {wearableStatus === 'SIMULATED'
                        ? '[ DISABLE SIMULATOR ]'
                        : '[ USE MANUAL / DEMO SIMULATOR ]'}
                    </button>
                  </div>

                  {bleDeviceName && wearableStatus === 'BLE_CONNECTED' && (
                    <span className="font-mono text-[9px] text-semantic-nominal">
                      DEVICE: {bleDeviceName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="p-4 border-t border-[rgba(242,240,235,0.12)] bg-[#151515] flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(prev => prev - 1)}
                className="mono-hud-btn px-3 py-1.5 bg-[#202020] border border-[rgba(242,240,235,0.2)] text-ink-secondary hover:text-ink-primary"
              >
                [← BACK]
              </button>
            ) : <div />}

            <div className="flex items-center space-x-3">
              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep(prev => prev + 1)}
                  className="mono-hud-btn px-4 py-1.5 bg-ink-primary text-canvas font-bold hover:bg-white flex items-center gap-1.5"
                >
                  <span>CONTINUE</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  className="mono-hud-btn px-5 py-1.5 bg-ink-primary text-canvas font-bold hover:bg-white flex items-center gap-2"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>COMMIT TRAVELER PROFILE [+]</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
