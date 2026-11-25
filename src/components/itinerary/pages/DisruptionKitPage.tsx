import React, { useState } from 'react';
import { usePrayana } from '../../../context/PrayanaContext';
import { TravelerProfile } from '../../../types';
import { PopButton } from '../../ui/InteractivePrimitives';
import { CompassLoader } from '../../common/CompassLoader';
import { CloudRain, ShieldAlert } from 'lucide-react';

export const DisruptionKitPage: React.FC = () => {
  const {
    isStormDisrupted,
    toggleStormDisruption,
    travelers,
    activeDestination,
    weatherSummary,
    routeStops,
    theme,
  } = usePrayana();
  const [isRerouting, setIsRerouting] = useState(false);

  const handleToggleDisruption = () => {
    setIsRerouting(true);
    toggleStormDisruption();
    window.setTimeout(() => setIsRerouting(false), 620);
  };

  const outdoorStopsCount = routeStops.filter(s => s.isOutdoor).length;

  const kitItems: Array<{
    id: string;
    label: string;
    recommendation: string;
    isCritical: boolean;
  }> = [];

  const mapFlagToSupply = (flag: string): { rec: string; critical: boolean } => {
    const f = flag.toLowerCase();
    if (f.includes('asthma') || f.includes('inhaler') || f.includes('copd') || f.includes('bronch')) {
      return { rec: 'Salbutamol 100mcg Rescue Inhaler + Spacer', critical: false };
    }
    if (f.includes('nut') || f.includes('peanut') || f.includes('shellfish') || f.includes('anaphy') || f.includes('severe') || f.includes('allergy')) {
      return { rec: 'Epinephrine Auto-Injector (EpiPen) + Antihistamine', critical: true };
    }
    if (f.includes('motion') || f.includes('vertigo')) {
      return { rec: 'Dimenhydrinate 50mg / Meclizine', critical: false };
    }
    if (f.includes('hypertension') || f.includes('blood pressure') || f.includes('cardiac') || f.includes('heart')) {
      return { rec: 'Prescribed Antihypertensive + Portable BP Monitor', critical: false };
    }
    if (f.includes('arthritis') || f.includes('knee') || f.includes('joint') || f.includes('assisted') || f.includes('wheelchair')) {
      return { rec: 'Joint Support Brace + Topical Analgesic', critical: false };
    }
    if (f.includes('diabet') || f.includes('insulin') || f.includes('glyc')) {
      return { rec: 'Glucometer + Fast-Acting Glucose Gel + Rx Kit', critical: true };
    }
    if (f.includes('gluten') || f.includes('celiac')) {
      return { rec: 'Gluten-Free Dining Translation Card + Digestive Aid', critical: false };
    }
    return { rec: `Prescribed Rx & Medical Alert Card (${flag})`, critical: false };
  };

  (travelers || []).forEach((t: TravelerProfile) => {
    const combinedFlags = [
      ...(t.medicalFlags || []),
      ...(t.dietaryTags || []).filter(d => d.includes('Allergy') || d === 'Gluten-Free' || d === 'Diabetic-Friendly'),
      ...(t.mobility !== 'Full Mobility' ? [t.mobility] : []),
    ].filter(Boolean);

    if (combinedFlags.length > 0) {
      const recs = combinedFlags.map(f => mapFlagToSupply(f));
      const uniqueRecs = Array.from(new Set(recs.map(r => r.rec)));
      const isCritical = recs.some(r => r.critical);
      kitItems.push({
        id: t.id,
        label: `${t.name.split(' ')[0].toUpperCase()} (${combinedFlags.join(' & ').toUpperCase()})`,
        recommendation: uniqueRecs.join(' + '),
        isCritical,
      });
    }
  });

  return (
    <div className="relative w-full space-y-5 pb-12 font-mono text-[13px] select-none">
      {isRerouting && (
        <CompassLoader
          variant="overlay"
          theme={theme}
          statusText={
            isStormDisrupted
              ? 'REROUTING OUTDOOR NODES INDOORS...'
              : 'RESTORING CLEAR SKY CORRIDOR...'
          }
        />
      )}
      {/* Weather / Traffic Disruption Simulator Banner */}
      <div className="p-4 bg-[#121212] border border-ink-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <CloudRain className="w-4 h-4 text-ink-primary shrink-0" />
            <span className="font-bold text-ink-primary text-[13px]">
              SCRIPTED WEATHER / TRAFFIC DISRUPTION SIMULATOR
            </span>
          </div>
          <p className="text-[12px] text-ink-secondary mt-1 font-sans">
            Simulates heavy monsoon rain in {activeDestination.name}. Toggling instantaneously swaps exposed outdoor boulder trails ({outdoorStopsCount} outdoor nodes active) for indoor heritage palaces and shifts visit windows.
          </p>
          {weatherSummary && (
            <div className="text-[11px] text-semantic-nominal mt-1.5 uppercase">
              LIVE OPENWEATHERMAP TELEMETRY: {weatherSummary}
            </div>
          )}
        </div>

        <PopButton
          onClick={handleToggleDisruption}
          size="md"
          variant={isStormDisrupted ? 'danger' : 'outline'}
          className="shrink-0 font-bold"
        >
          {isStormDisrupted ? 'STORM ACTIVE: INDOOR REROUTED' : 'SIMULATE STORM / DISRUPTION'}
        </PopButton>
      </div>

      {/* 12-Column Cohort Medical Aid Kit (Cols 1-6) & ASI Heritage Rules (Cols 7-12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6 p-4 bg-[#161616] border border-[rgba(242,240,235,0.12)]">
          <div className="flex items-center justify-between text-[11px] text-ink-muted uppercase tracking-widest mb-3 pb-2 border-b border-[rgba(242,240,235,0.08)]">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-ink-primary" />
              <span>COHORT MEDICAL AID KIT</span>
            </span>
            <span className="text-semantic-nominal font-bold">
              {kitItems.length} {kitItems.length === 1 ? 'CUSTOM ITEM' : 'CUSTOM ITEMS'}
            </span>
          </div>

          {!travelers || travelers.length === 0 ? (
            <div className="p-4 bg-[#1A1A1A] border border-[rgba(242,240,235,0.08)] text-[11px] text-ink-secondary font-mono text-center">
              [ NO TRAVELERS IN COHORT — ADD A PROFILE TO GENERATE COHORT MEDICAL KIT ]
            </div>
          ) : kitItems.length === 0 ? (
            <div className="p-4 bg-[#1A1A1A] border border-[rgba(242,240,235,0.08)] text-[11px] text-semantic-nominal font-mono text-center">
              [ {travelers.length} TRAVELER{travelers.length > 1 ? 'S' : ''} CLEAR — STANDARD FIRST-AID & ORS HYDRATION KIT ]
            </div>
          ) : (
            <div className="space-y-2.5 text-[12px]">
              {kitItems.map(item => (
                <div
                  key={item.id}
                  className="p-3 bg-[#1A1A1A] border border-[rgba(242,240,235,0.08)] flex flex-col sm:flex-row sm:justify-between gap-1.5"
                >
                  <span className="text-ink-secondary">{item.label}:</span>
                  <span className={item.isCritical ? 'text-semantic-hazard font-bold' : 'text-ink-primary font-bold'}>
                    {item.recommendation}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-6 p-4 bg-[#161616] border border-[rgba(242,240,235,0.12)] flex flex-col justify-between">
          <div>
            <div className="text-[11px] text-ink-muted uppercase tracking-widest mb-3 pb-2 border-b border-[rgba(242,240,235,0.08)]">
              REGIONAL HERITAGE ETIQUETTE & ASI RULES // {activeDestination.name.toUpperCase()}
            </div>
            <ul className="space-y-2 text-[12px] text-ink-secondary font-sans leading-relaxed">
              <li>• <span className="text-ink-primary font-semibold">ASI Sanctum Rule:</span> Footwear strictly prohibited inside active Virupaksha shrines & consecrated sanctums.</li>
              <li>• <span className="text-ink-primary font-semibold">Coracle / Water Crossing:</span> Mandatory certified life-vests during river crossings & monsoon currents.</li>
              <li>• <span className="text-ink-primary font-semibold">Commercial Drone Ban:</span> Drone photography restricted within 500m of protected World Heritage monuments.</li>
              <li>• <span className="text-ink-primary font-semibold">Hydration & Terrain Warning:</span> Granite boulder heat retention & forest humidity elevate midday exertion strain.</li>
            </ul>
          </div>

          <div className="pt-3 border-t border-[rgba(242,240,235,0.08)] text-[11px] text-ink-muted mt-4 flex justify-between">
            <span>SOURCE: ARCHAEOLOGICAL SURVEY OF INDIA</span>
            <span>DISPATCH EMERGENCY: {activeDestination.country === 'Japan' ? '110 / 119' : '112'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
