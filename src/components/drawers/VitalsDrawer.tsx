import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { requestBleDevicePromise } from '../../services/bleHealthService';
import { checkWebBluetoothDiagnostics, WebBluetoothDiagnostics } from '../../services/bleHealthService';
import { 
  X, 
  Activity, 
  Heart, 
  ShieldAlert, 
  CheckCircle2, 
  Sliders, 
  Thermometer, 
  Footprints,
  Watch,
  Info
} from 'lucide-react';
import { 
  computeTravelerSegmentPenalty, 
  extractHeuristicVector 
} from '../../services/googleHealthService';

export const VitalsDrawer: React.FC = () => {
  const { 
    isVitalsDrawerOpen, 
    setIsVitalsDrawerOpen, 
    travelers, 
    activeTraveler, 
    setActiveTravelerId,
    liveVitals, 
    updateLiveHr,
    updateLiveSpO2,
    updateLiveSteps,
    updateLiveWbgt,
    isFitbandSimActive,
    bleConnectedDevice,
    bleHrLocked,
    bleError,
    pairBluetoothFitband,
    disconnectBluetoothFitband,
    toggleSimulatorMode,
    weatherSummary,
    activeAdvisory 
  } = usePrayana();

  const [bleDiag, setBleDiag] = useState<WebBluetoothDiagnostics | null>(null);

  useEffect(() => {
    if (!isVitalsDrawerOpen) return;
    let active = true;
    checkWebBluetoothDiagnostics().then((diag) => {
      if (active) setBleDiag(diag);
    });
    return () => {
      active = false;
    };
  }, [isVitalsDrawerOpen]);

  if (!isVitalsDrawerOpen) return null;

  // Calculate live psi effort penalty for current active traveler on standard segment (1.5km, 15m climb, 2.0° slope)
  const currentPsi = computeTravelerSegmentPenalty(
    activeTraveler,
    {
      distanceKm: 1.5,
      elevationDeltaM: 15,
      slopeDeg: 2.0,
      ambientWbgtC: liveVitals.ambientWbgt,
    },
    liveVitals.heartRate
  );

  const heuristicVector = extractHeuristicVector(activeTraveler);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsVitalsDrawerOpen(false)}
          className="absolute inset-0 prayana-backdrop"
        />

        {/* Slide-over Drawer */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="absolute inset-y-0 right-0 max-w-full flex pl-10"
        >
          <div data-lenis-prevent className="w-screen max-w-lg prayana-glass border-l border-[rgba(242,240,235,0.14)] p-6 flex flex-col justify-between overflow-y-auto overscroll-contain text-ink-primary font-mono text-[13px]">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between border-b border-[rgba(242,240,235,0.12)] pb-4 mb-4">
                <div>
                  <div className="flex items-center space-x-2 text-ink-primary font-medium tracking-wide">
                    <Activity className="w-4 h-4 text-semantic-nominal" />
                    <span>GOOGLE HEALTH TELEMETRY & ADAPTER</span>
                  </div>
                  <div className="text-[11px] text-ink-secondary tracking-widest mt-0.5">
                    HEALTH CONNECT / WEARABLE FITBAND ENGINE
                  </div>
                </div>
                <button
                  onClick={() => setIsVitalsDrawerOpen(false)}
                  className="p-1 hover:bg-[#202020] transition-colors border border-[rgba(242,240,235,0.12)] cursor-pointer"
                >
                  <X className="w-4 h-4 text-ink-secondary" />
                </button>
              </div>

              {/* Active Traveler Card */}
              <div className="bg-[#181818] border border-[rgba(242,240,235,0.12)] p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-ink-secondary text-[11px] tracking-widest">
                    MONITORED SUBJECT
                  </span>
                  {bleConnectedDevice && !bleHrLocked && (activeTraveler.wearableStatus === 'BLE_CONNECTED' || activeTraveler.fitbandConnected) ? (
                    <span className="text-semantic-nominal text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> BLE: {bleConnectedDevice || activeTraveler.bleDeviceName || 'PAIRED'}
                    </span>
                  ) : bleHrLocked || activeTraveler.wearableStatus === 'BLE_LOCKED' ? (
                    <span className="text-amber-300 text-[11px]">
                      [ CONNECTED: {bleConnectedDevice || activeTraveler.bleDeviceName} · PROPRIETARY HR LOCKED ]
                    </span>
                  ) : isFitbandSimActive || activeTraveler.wearableStatus === 'SIMULATED' ? (
                    <span className="text-amber-300 text-[11px]">
                      [ MANUAL / DEMO SIMULATOR ]
                    </span>
                  ) : (
                    <span className="text-ink-muted text-[11px]">
                      [ NO FITBAND CONNECTED ]
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-serif text-2xl text-ink-primary">
                    {activeTraveler.name}
                  </h3>
                  <span className="font-mono text-[13px] text-ink-secondary">
                    {activeTraveler.age} YRS · {activeTraveler.mobility.toUpperCase()}
                  </span>
                </div>

                {/* Heuristic Vector Readout */}
                <div className="mt-2.5 pt-2 border-t border-[rgba(242,240,235,0.06)] grid grid-cols-4 gap-1 text-[11px] text-ink-muted font-mono">
                  <div>α_k: <span className="text-ink-primary">{heuristicVector.alpha.toFixed(2)}</span></div>
                  <div>β_k: <span className="text-ink-primary">{heuristicVector.beta.toFixed(2)}</span></div>
                  <div>c_mob: <span className="text-ink-primary">{heuristicVector.c_mob.toFixed(2)}</span></div>
                  <div>c_card: <span className="text-ink-primary">{heuristicVector.c_card.toFixed(2)}</span></div>
                </div>
              </div>

              {/* Real-time Biometric Readout Grid */}
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <div className="bg-[#181818] border border-[rgba(242,240,235,0.1)] p-3">
                  <div className="flex items-center justify-between text-ink-muted text-[11px]">
                    <span>HEART RATE</span>
                    <Heart className="w-3.5 h-3.5 text-semantic-hazard" />
                  </div>
                  <div className="font-mono text-2xl font-bold text-ink-primary mt-1">
                    {liveVitals.heartRate} <span className="text-[13px] font-normal text-ink-secondary">BPM</span>
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5">RESTING BASELINE: 68 BPM</div>
                </div>

                <div className="bg-[#181818] border border-[rgba(242,240,235,0.1)] p-3">
                  <div className="flex items-center justify-between text-ink-muted text-[11px]">
                    <span>WALKING EFFORT</span>
                    <Activity className="w-3.5 h-3.5 text-semantic-nominal" />
                  </div>
                  <div className="font-mono text-2xl font-bold mt-1">
                    <span className={
                      liveVitals.strainLevel === 'ELEVATED' ? 'text-semantic-hazard' :
                      liveVitals.strainLevel === 'MODERATE' ? 'text-semantic-caution' :
                      'text-semantic-nominal'
                    }>
                      {liveVitals.strainLevel}
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    ψ SCORE: {currentPsi}
                  </div>
                </div>

                <div className="bg-[#181818] border border-[rgba(242,240,235,0.1)] p-3">
                  <div className="flex items-center justify-between text-ink-muted text-[11px]">
                    <span>BLOOD OXYGEN (SpO2)</span>
                    <span className="text-ink-primary">{liveVitals.spO2}%</span>
                  </div>
                  <div className="font-mono text-xl font-bold text-ink-primary mt-1">
                    {liveVitals.spO2}%
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    {liveVitals.spO2 >= 95 ? 'NOMINAL SATURATION' : 'REDUCED OXYGENATION'}
                    {liveVitals.batteryLevel !== undefined ? ` · BAT ${liveVitals.batteryLevel}%` : ''}
                  </div>
                </div>

                <div className="bg-[#181818] border border-[rgba(242,240,235,0.1)] p-3">
                  <div className="flex items-center justify-between text-ink-muted text-[11px]">
                    <span>FEELS LIKE</span>
                    <Thermometer className="w-3.5 h-3.5 text-ink-secondary" />
                  </div>
                  <div className="font-mono text-xl font-bold text-ink-primary mt-1">
                    {liveVitals.ambientWbgt}°C
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    {weatherSummary ? weatherSummary : 'THERMAL COMFORT THRESHOLD: 26°C'}
                  </div>
                </div>
              </div>

              {/* Web Bluetooth Pairing Controls */}
              <div className="mb-4 p-3 bg-[#151515] border border-[rgba(242,240,235,0.14)] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {bleConnectedDevice ? (
                    <button
                      onClick={() => disconnectBluetoothFitband(activeTraveler.id)}
                      className="mono-hud-btn px-3 py-1.5 bg-[#261515] border border-semantic-hazard text-semantic-hazard hover:bg-semantic-hazard hover:text-canvas text-[13px] cursor-pointer"
                    >
                      [ DISCONNECT BLE FITBAND ]
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          const devicePromise = requestBleDevicePromise(false);
                          void pairBluetoothFitband(activeTraveler.id, devicePromise, false);
                        }}
                        className="mono-hud-btn px-3 py-1.5 bg-ink-primary text-canvas font-bold hover:bg-white text-[13px] cursor-pointer"
                      >
                        [ PAIR HEALTH DEVICE ]
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const devicePromise = requestBleDevicePromise(true);
                          void pairBluetoothFitband(activeTraveler.id, devicePromise, true);
                        }}
                        className="text-[11px] font-mono underline text-ink-secondary hover:text-ink-primary cursor-pointer"
                      >
                        [ SCAN ALL NEARBY BLE ]
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => toggleSimulatorMode(!isFitbandSimActive, activeTraveler.id)}
                    className={`mono-hud-btn px-3 py-1.5 border text-[13px] cursor-pointer ${
                      isFitbandSimActive
                        ? 'bg-amber-950/60 border-amber-400 text-amber-200'
                        : 'bg-[#1C1C1C] border-[rgba(242,240,235,0.2)] text-ink-secondary hover:text-ink-primary'
                    }`}
                  >
                    {isFitbandSimActive ? '[ DISABLE DEMO SIMULATOR ]' : '[ USE MANUAL / DEMO SIMULATOR ]'}
                  </button>
                </div>

                {bleDiag?.reason && (
                  <div className="text-[13px] text-amber-400 border border-amber-500/40 bg-amber-500/10 p-2.5 leading-relaxed">
                    [ WEB BLUETOOTH DIAGNOSTIC: {bleDiag.reason} ]
                  </div>
                )}

                {bleError && (
                  <div className="text-[13px] text-semantic-hazard border border-semantic-hazard/40 bg-[#251313] p-2.5 leading-relaxed">
                    [ BLUETOOTH NOTICE: {bleError} ]
                  </div>
                )}

                {(bleHrLocked || activeTraveler.wearableStatus === 'BLE_LOCKED') && (
                  <div className="p-2.5 bg-[#1B1810] border border-amber-500/40 space-y-2 text-[11px]">
                    <div className="text-amber-300 font-bold">
                      [ CONNECTED: {bleConnectedDevice || activeTraveler.bleDeviceName} · PROPRIETARY HR LOCKED ]
                    </div>
                    <p className="text-ink-secondary font-sans text-[12px]">
                      This wearable paired via BLE, but locks Heart Rate notifications behind its companion app. Enter your live watch reading directly or toggle Simulator mode below.
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[11px] text-ink-muted mb-1">WATCH BPM</label>
                        <input
                          type="number"
                          min={40}
                          max={220}
                          value={liveVitals.heartRate}
                          onChange={(e) => updateLiveHr(Math.max(40, Math.min(220, Number(e.target.value) || 72)))}
                          className="w-full bg-[#121212] border border-[rgba(242,240,235,0.2)] p-1.5 text-ink-primary font-mono text-[13px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-ink-muted mb-1">WATCH SpO2 (%)</label>
                        <input
                          type="number"
                          min={80}
                          max={100}
                          value={liveVitals.spO2}
                          onChange={(e) => updateLiveSpO2(Math.max(80, Math.min(100, Number(e.target.value) || 98)))}
                          className="w-full bg-[#121212] border border-[rgba(242,240,235,0.2)] p-1.5 text-ink-primary font-mono text-[13px]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Contextual Advisory Banner */}
              {activeAdvisory && (
                <div className="mb-4 p-3 bg-[#261515] border border-semantic-hazard text-semantic-hazard text-[11px] flex items-start space-x-2.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">PHYSIOLOGICAL SAFETY ADVISORY:</span> {activeAdvisory}
                  </div>
                </div>
              )}

              {/* Interactive Multi-Param Fitband Telemetry Simulator */}
              <div className="bg-[#151515] border border-ink-primary/30 p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Sliders className="w-3.5 h-3.5 text-ink-primary" />
                    <span className="font-semibold text-ink-primary">
                      MANUAL / DEMO TELEMETRY CONTROLS
                    </span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 text-[11px] font-bold ${
                      isFitbandSimActive
                        ? 'bg-amber-400 text-canvas'
                        : bleConnectedDevice
                        ? 'bg-semantic-nominal text-canvas'
                        : 'bg-[#222222] text-ink-muted border border-[rgba(242,240,235,0.16)]'
                    }`}
                  >
                    {isFitbandSimActive ? 'SIMULATOR ACTIVE' : bleHrLocked ? 'BLE LOCKED (MANUAL)' : bleConnectedDevice ? 'BLE STREAMING' : 'UNPAIRED'}
                  </span>
                </div>

                {/* 1. Heart Rate Slider */}
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-ink-muted">1. HEART RATE (BPM)</span>
                    <span className="font-bold text-ink-primary">{liveVitals.heartRate} BPM</span>
                  </div>
                  <input
                    type="range"
                    min="55"
                    max="165"
                    value={liveVitals.heartRate}
                    onChange={(e) => updateLiveHr(Number(e.target.value))}
                    className="w-full accent-ink-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-ink-muted">
                    <span>55 (REST)</span>
                    <span>95 (MODERATE)</span>
                    <span>130+ (HAZARD)</span>
                  </div>
                </div>

                {/* 2. SpO2 Slider */}
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-ink-muted">2. BLOOD OXYGEN (SpO2 %)</span>
                    <span className="font-bold text-ink-primary">{liveVitals.spO2}%</span>
                  </div>
                  <input
                    type="range"
                    min="85"
                    max="100"
                    value={liveVitals.spO2}
                    onChange={(e) => updateLiveSpO2(Number(e.target.value))}
                    className="w-full accent-ink-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-ink-muted">
                    <span>85% (HYPOXIC)</span>
                    <span>95% (THRESHOLD)</span>
                    <span>100% (OPTIMAL)</span>
                  </div>
                </div>

                {/* 3. Ambient WBGT Temperature Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-ink-muted">3. AMBIENT WET-BULB TEMP (°C)</span>
                    <span className="font-bold text-ink-primary">{liveVitals.ambientWbgt}°C</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="40"
                    step="0.5"
                    value={liveVitals.ambientWbgt}
                    onChange={(e) => updateLiveWbgt(Number(e.target.value))}
                    className="w-full accent-ink-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-ink-muted">
                    <span>20°C (MILD)</span>
                    <span>26°C (W_SAFE)</span>
                    <span>35°C (W_CRIT)</span>
                  </div>
                </div>
              </div>

              {/* Traveler Switcher in Drawer */}
              <div>
                <div className="text-[11px] text-ink-muted uppercase tracking-widest mb-2">
                  MONITORED TRAVELER COHORT
                </div>
                <div className="space-y-1.5">
                  {travelers.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTravelerId(t.id)}
                      className={`w-full text-left p-2.5 border transition-colors flex items-center justify-between cursor-pointer ${
                        t.id === activeTraveler.id
                          ? 'border-ink-primary bg-[#1C1C1C]'
                          : 'border-[rgba(242,240,235,0.08)] bg-[#141414] hover:border-ink-secondary'
                      }`}
                    >
                      <div>
                        <div className="text-ink-primary font-medium">{t.name}</div>
                        <div className="text-[11px] text-ink-secondary">
                          {t.mobility} · {t.medicalFlags.join(', ') || 'No flags'}
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-ink-primary">{t.vitals.heartRate} BPM</div>
                        <div className="text-[11px] text-ink-muted">{t.vitals.strainLevel} STRAIN</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-[rgba(242,240,235,0.1)] text-center text-[11px] text-ink-muted">
              PRAYANA HEURISTIC MODEL ψ_ij(u_k) · GOOGLE HEALTH API INTEGRATION ADAPTER
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
