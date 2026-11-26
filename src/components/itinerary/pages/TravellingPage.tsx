import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { usePrayana } from '../../../context/PrayanaContext';
import {
  TransitPlaceItem,
  TransitPlacesResponse,
  fetchDestinationTransit,
} from '../../../services/apiClient';
import {
  buildEqualSplits,
  rebalanceSequentialCustomSplits,
} from '../../../utils/splitwiseMath';
import {
  FLUID_GESTURE_TAP,
  FLUID_ISLAND_SPRING,
} from '../../../motion/fluidTokens';
import {
  AlertTriangle,
  Bus,
  Car,
  Compass,
  ExternalLink,
  Fuel,
  Navigation,
  PhoneCall,
  Plus,
  RefreshCw,
  Train,
  Zap,
} from 'lucide-react';

const FALLBACK_TRANSIT: Record<string, TransitPlacesResponse> = {
  hampi: {
    destination_id: 'hampi',
    destination_name: 'Hampi',
    fuel_stations: [
      { id: 'fb-f1', name: 'IndianOil Fuel Station · Kamalapura', kind: 'fuel', distance_km: 3.4, lat: 15.308, lon: 76.473, address: 'Kamalapura Main Rd, Hampi', connector_hints: ['Petrol', 'Diesel'], compatible_2w_ev: true, compatible_4w_ev: true, source: 'regional_fallback' },
      { id: 'fb-f2', name: 'Bharat Petroleum · Hospet Bypass', kind: 'fuel', distance_km: 11.2, lat: 15.276, lon: 76.392, address: 'NH-50 Hospet Bypass', connector_hints: ['Petrol', 'Diesel'], compatible_2w_ev: true, compatible_4w_ev: true, source: 'regional_fallback' },
    ],
    ev_chargers: [
      { id: 'fb-e1', name: 'Ather Grid / 16A AC Point · Hospet Plaza', kind: 'ev_charger', distance_km: 10.8, lat: 15.271, lon: 76.389, address: 'Station Rd, Hosapete', connector_hints: ['16A 3-Pin / 2W Grid', 'Type-2 AC'], compatible_2w_ev: true, compatible_4w_ev: true, source: 'regional_fallback' },
      { id: 'fb-e2', name: 'Tata Power EZ Charge 30kW CCS2 · NH-50', kind: 'ev_charger', distance_km: 13.5, lat: 15.265, lon: 76.375, address: 'NH-50 Highway Hub, Hosapete', connector_hints: ['CCS2 DC Fast (4W)'], compatible_2w_ev: false, compatible_4w_ev: true, source: 'regional_fallback' },
    ],
    bus_stands: [
      { id: 'fb-b1', name: 'Hampi Bazaar KSRTC Bus Stand', kind: 'bus_station', distance_km: 0.6, lat: 15.335, lon: 76.461, address: 'Hampi Bazaar', connector_hints: [], compatible_2w_ev: true, compatible_4w_ev: true, source: 'regional_fallback' },
      { id: 'fb-b2', name: 'Hosapete Central KSRTC Terminal', kind: 'bus_station', distance_km: 12.1, lat: 15.269, lon: 76.387, address: 'Hosapete Town', connector_hints: [], compatible_2w_ev: true, compatible_4w_ev: true, source: 'regional_fallback' },
    ],
    railway_stations: [
      { id: 'fb-r1', name: 'Hosapete Junction (HPT)', kind: 'railway_station', distance_km: 12.6, lat: 15.273, lon: 76.381, address: 'Station Rd, Hosapete', connector_hints: [], compatible_2w_ev: true, compatible_4w_ev: true, source: 'regional_fallback' },
    ],
    source: 'regional_fallback',
    disclaimer: 'Regional transit fallback active while OpenStreetMap Overpass is unreachable.',
  },
  coorg: {
    destination_id: 'coorg',
    destination_name: 'Coorg',
    fuel_stations: [
      { id: 'fb-cf1', name: 'HPCL Fuel Station · Madikeri Town', kind: 'fuel', distance_km: 1.4, lat: 12.421, lon: 75.741, address: 'BM Rd, Madikeri', connector_hints: ['Petrol', 'Diesel'], compatible_2w_ev: true, compatible_4w_ev: true, source: 'regional_fallback' },
    ],
    ev_chargers: [
      { id: 'fb-ce1', name: 'BESCOM / Type-2 AC & 16A Point · Madikeri', kind: 'ev_charger', distance_km: 1.8, lat: 12.425, lon: 75.736, address: 'College Rd, Madikeri', connector_hints: ['Type-2 AC', '16A 3-Pin / 2W Grid'], compatible_2w_ev: true, compatible_4w_ev: true, source: 'regional_fallback' },
      { id: 'fb-ce2', name: 'Zeon 50kW CCS2 Fast Charger · Kushalnagar', kind: 'ev_charger', distance_km: 27.4, lat: 12.459, lon: 75.959, address: 'Mysuru-Madikeri Hwy', connector_hints: ['CCS2 DC Fast (4W)'], compatible_2w_ev: false, compatible_4w_ev: true, source: 'regional_fallback' },
    ],
    bus_stands: [
      { id: 'fb-cb1', name: 'Madikeri KSRTC Bus Stand', kind: 'bus_station', distance_km: 0.9, lat: 12.423, lon: 75.739, address: 'Madikeri Center', connector_hints: [], compatible_2w_ev: true, compatible_4w_ev: true, source: 'regional_fallback' },
    ],
    railway_stations: [
      { id: 'fb-cr1', name: 'Mysuru Junction (MYS)', kind: 'railway_station', distance_km: 118.0, lat: 12.317, lon: 76.645, address: 'Mysuru', connector_hints: [], compatible_2w_ev: true, compatible_4w_ev: true, source: 'regional_fallback' },
    ],
    source: 'regional_fallback',
    disclaimer: 'Regional transit fallback active while OpenStreetMap Overpass is unreachable.',
  },
};

export const TravellingPage: React.FC = () => {
  const {
    activeDestination,
    activeTrip,
    updateActiveTrip,
    travelers,
    addExpense,
    routeStops,
    theme,
  } = usePrayana();
  const isLight = theme === 'light';

  const [transitData, setTransitData] = useState<TransitPlacesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const isPrivate = activeTrip.transitMode === 'Self-Drive';
  const vehicleType = activeTrip.transitDetails?.vehicleType || '4W';
  const fuelType = activeTrip.transitDetails?.fuelType || 'PETROL';
  const publicMode = activeTrip.transitDetails?.publicMode || 'TRAIN';

  const loadTransit = async () => {
    setLoading(true);
    try {
      const res = await fetchDestinationTransit(activeDestination.id);
      if (res) {
        setTransitData(res);
      } else {
        setTransitData(FALLBACK_TRANSIT[activeDestination.id] || FALLBACK_TRANSIT.hampi);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTransit();
  }, [activeDestination.id]);

  // Corridor distance + estimated fuel / kWh cost
  const corridorKm = useMemo(() => {
    const sum = routeStops.reduce((acc, s) => acc + (s.distanceKm || 0), 0);
    return Math.max(12, Math.round(sum * 10) / 10);
  }, [routeStops]);

  const estimatedEnergyCostInr = useMemo(() => {
    if (fuelType === 'EV') {
      const kwhPerKm = vehicleType === '2W' ? 0.035 : 0.16;
      return Math.round(corridorKm * kwhPerKm * 12);
    }
    if (fuelType === 'DIESEL') {
      return Math.round((corridorKm / 16) * 90);
    }
    const kmPerL = vehicleType === '2W' ? 42 : 14;
    return Math.round((corridorKm / kmPerL) * 104);
  }, [corridorKm, fuelType, vehicleType]);

  // Direct Splitwise Transit Expense Logger
  const [txDesc, setTxDesc] = useState<string>('');
  const [txAmount, setTxAmount] = useState<number>(500);
  const [txPaidBy, setTxPaidBy] = useState<string>(travelers[0]?.id || '');
  const [txSplitMode, setTxSplitMode] = useState<'equal' | 'custom'>('equal');
  const [txMembers, setTxMembers] = useState<string[]>(() => travelers.map((t) => t.id));
  const [txCustomSplits, setTxCustomSplits] = useState<Record<string, number>>(() =>
    buildEqualSplits(500, travelers.map((t) => t.id))
  );
  const [txLockedIds, setTxLockedIds] = useState<Set<string>>(() => new Set());
  const [txLoggedFlash, setTxLoggedFlash] = useState<boolean>(false);

  const handleLogTransitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Math.max(0, Number(txAmount) || 0);
    if (numeric <= 0) return;

    addExpense({
      category: 'transit',
      amount: numeric,
      description: txDesc.trim() || (fuelType === 'EV' ? 'EV Charging Top-up' : 'Fuel / Transit Fare'),
      dayIndex: activeTrip.dayIndex ?? 1,
      paidBy: txPaidBy || travelers[0]?.id,
      splitMode: txSplitMode,
      splitBetween: txMembers,
      customSplits: txSplitMode === 'custom' ? txCustomSplits : undefined,
    });
    setTxDesc('');
    setTxLoggedFlash(true);
    setTimeout(() => setTxLoggedFlash(false), 2200);
  };

  const panelSurface = isLight
    ? 'bg-[#FFFFFF] border-[rgba(17,17,17,0.16)]'
    : 'bg-[#151515] border-[rgba(242,240,235,0.14)]';
  const subSurface = isLight
    ? 'bg-[#F4F3EF] border-[rgba(17,17,17,0.14)]'
    : 'bg-[#121212] border-[rgba(242,240,235,0.12)]';

  const mapsLink = (item: TransitPlaceItem) =>
    `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lon}`;

  return (
    <div className="w-full space-y-5 pb-12 font-mono text-[13px] select-none">
      {/* Top Mode & Quick Switcher Header */}
      <div className={`p-4 border flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${subSurface}`}>
        <div className="flex items-center space-x-2.5">
          <Compass className="w-4 h-4 text-[var(--ink-primary)] shrink-0" />
          <div>
            <div className="text-[12px] font-bold text-[var(--ink-primary)] uppercase tracking-widest">
              TRAVELLING &amp; CORRIDOR TRANSIT // {activeDestination.name.toUpperCase()}
            </div>
            <div className="text-[11px] text-[var(--ink-secondary)]">
              {isPrivate
                ? `PRIVATE VEHICLE (${vehicleType} · ${fuelType}) · EST. CORRIDOR ENERGY: ₹${estimatedEnergyCostInr} (${corridorKm} KM)`
                : `PUBLIC TRANSIT (${publicMode}) · ${activeTrip.transitDetails?.flightOrTrainNo || 'LOCAL HUBS'}`}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border border-[var(--hairline)] bg-[var(--bg-canvas)] p-0.5">
            {(['Self-Drive', 'Public Transport'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => updateActiveTrip({ transitMode: m })}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase cursor-pointer ${
                  activeTrip.transitMode === m
                    ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)]'
                    : 'text-[var(--ink-secondary)]'
                }`}
              >
                {m === 'Self-Drive' ? 'PRIVATE VEHICLE' : 'PUBLIC TRANSIT'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void loadTransit()}
            disabled={loading}
            className="px-2.5 py-1 border border-[var(--hairline-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)] text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>REFRESH OSM</span>
          </button>
        </div>
      </div>

      {/* PRIVATE VEHICLE VIEW */}
      {isPrivate && (
        <div className="space-y-4">
          {/* Vehicle & Powertrain Selector */}
          <div className={`p-3.5 border flex flex-wrap items-center justify-between gap-3 ${panelSurface}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-[var(--ink-muted)] uppercase">VEHICLE:</span>
              {(['2W', '4W'] as const).map((vt) => (
                <button
                  key={vt}
                  type="button"
                  onClick={() =>
                    updateActiveTrip({
                      transitDetails: {
                        ...activeTrip.transitDetails,
                        vehicleType: vt,
                        fuelType: vt === '2W' && fuelType === 'DIESEL' ? 'PETROL' : fuelType,
                      },
                    })
                  }
                  className={`px-2.5 py-1 border text-[11px] font-bold cursor-pointer ${
                    vehicleType === vt
                      ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] border-[var(--ink-primary)]'
                      : 'border-[var(--hairline)] text-[var(--ink-secondary)]'
                  }`}
                >
                  {vt === '2W' ? '2-WHEELER' : '4-WHEELER'}
                </button>
              ))}

              <span className="text-[11px] text-[var(--ink-muted)] uppercase ml-2">POWERTRAIN:</span>
              {(['PETROL', ...(vehicleType === '4W' ? (['DIESEL'] as const) : []), 'EV'] as const).map((ft) => (
                <button
                  key={ft}
                  type="button"
                  onClick={() =>
                    updateActiveTrip({
                      transitDetails: { ...activeTrip.transitDetails, fuelType: ft },
                    })
                  }
                  className={`px-2.5 py-1 border text-[11px] font-bold cursor-pointer ${
                    fuelType === ft
                      ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] border-[var(--ink-primary)]'
                      : 'border-[var(--hairline)] text-[var(--ink-secondary)]'
                  }`}
                >
                  {ft}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <PhoneCall className="w-3.5 h-3.5 text-semantic-nominal" />
              <span>HIGHWAY HELPLINE: <strong>1033</strong> · EMERGENCY: <strong>112</strong></span>
            </div>
          </div>

          {/* 2W vs 4W EV Connector Precision Notice */}
          {fuelType === 'EV' && (
            <div className={`p-3 border border-l-[3px] ${vehicleType === '2W' ? 'border-l-amber-400/80' : 'border-l-emerald-500/80'} ${subSurface} text-[12px] flex items-start gap-2`}>
              {vehicleType === '2W' ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>2-WHEELER EV CONNECTOR FILTER ACTIVE:</strong> Highlighting <strong>AC Type-2 / 16A 3-Pin / Ather Grid / Ola Hypercharger</strong> points. CCS2-only DC car fast chargers are flagged incompatible for 2W.
                  </div>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-semantic-nominal shrink-0 mt-0.5" />
                  <div>
                    <strong>4-WHEELER EV CONNECTOR FILTER ACTIVE:</strong> Prioritizing <strong>CCS2 DC Fast Chargers (30–60kW+)</strong> and <strong>Type-2 AC</strong> bays.
                  </div>
                </>
              )}
            </div>
          )}

          {/* Fuel Stations or EV Chargers List */}
          <div className={`p-4 border space-y-3 ${panelSurface}`}>
            <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-2 text-[11px] text-[var(--ink-muted)] uppercase">
              <span className="flex items-center gap-1.5">
                {fuelType === 'EV' ? <Zap className="w-3.5 h-3.5" /> : <Fuel className="w-3.5 h-3.5" />}
                <span>
                  {fuelType === 'EV'
                    ? `NEARBY EV CHARGERS (${transitData?.ev_chargers.length ?? 0})`
                    : `NEARBY FUEL STATIONS (${transitData?.fuel_stations.length ?? 0})`}
                </span>
              </span>
              <span>SOURCE: {transitData?.source || 'OSM'}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(fuelType === 'EV' ? transitData?.ev_chargers : transitData?.fuel_stations)?.map((st) => {
                const isCompatible = fuelType !== 'EV' || (vehicleType === '2W' ? st.compatible_2w_ev : st.compatible_4w_ev);
                return (
                  <motion.div
                    key={st.id}
                    whileHover={{ y: -2 }}
                    transition={FLUID_ISLAND_SPRING}
                    className={`p-3 border flex items-start justify-between gap-3 ${subSurface} ${
                      !isCompatible ? 'border-l-[3px] border-l-amber-400/80 opacity-85' : ''
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="font-bold text-[13px] text-[var(--ink-primary)] truncate">{st.name}</div>
                      <div className="text-[11px] text-[var(--ink-secondary)] truncate">{st.address}</div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="px-1.5 py-0.5 border border-[var(--hairline)]">
                          {st.distance_km} KM
                        </span>
                        {st.connector_hints.map((h) => (
                          <span key={h} className="px-1.5 py-0.5 border border-[var(--hairline)] text-[var(--ink-secondary)]">
                            {h}
                          </span>
                        ))}
                        {fuelType === 'EV' && (
                          <span className={`px-1.5 py-0.5 border font-bold ${isCompatible ? 'border-semantic-nominal/60 text-semantic-nominal' : 'border-amber-500/60 text-amber-400'}`}>
                            {isCompatible ? `${vehicleType} COMPATIBLE` : 'CCS2 CAR ONLY'}
                          </span>
                        )}
                      </div>
                    </div>

                    <a
                      href={mapsLink(st)}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 px-2.5 py-1.5 bg-[var(--ink-primary)] text-[var(--bg-canvas)] text-[10px] font-bold flex items-center gap-1"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>NAVIGATE</span>
                    </a>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PUBLIC TRANSIT VIEW */}
      {!isPrivate && (
        <div className="space-y-4">
          <div className={`p-4 border space-y-3 ${panelSurface}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--hairline)] pb-2">
              <div className="flex items-center gap-2">
                {publicMode === 'BUS' ? <Bus className="w-4 h-4" /> : <Train className="w-4 h-4" />}
                <span className="font-bold text-[12px] uppercase">
                  BOOKED {publicMode} TICKET // {activeTrip.transitDetails?.flightOrTrainNo || 'NO SERVICE SET'}
                </span>
              </div>
              {activeTrip.transitDetails?.pnrOrRef && (
                <span className="px-2 py-0.5 border border-[var(--hairline-strong)] text-[11px] font-bold">
                  PNR: {activeTrip.transitDetails.pnrOrRef}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
              <div className={`p-3 border ${subSurface}`}>
                <div className="text-[10px] text-[var(--ink-muted)]">DEPARTURE HUB</div>
                <div className="font-bold text-[var(--ink-primary)] mt-0.5">
                  {activeTrip.transitDetails?.originHub || 'Origin Hub'}
                </div>
              </div>
              <div className={`p-3 border ${subSurface}`}>
                <div className="text-[10px] text-[var(--ink-muted)]">ARRIVAL HUB</div>
                <div className="font-bold text-[var(--ink-primary)] mt-0.5">
                  {activeTrip.transitDetails?.arrivalHub || activeDestination.name}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[10px]">
              {[
                { name: 'IRCTC PNR', url: 'https://www.irctc.co.in' },
                { name: 'NTES LIVE', url: 'https://enquiry.indianrail.gov.in' },
                { name: 'REDBUS', url: 'https://www.redbus.in' },
                { name: 'KSRTC', url: 'https://ksrtc.in' },
                { name: 'FLIGHTAWARE', url: 'https://www.flightaware.com' },
                { name: 'G-FLIGHTS', url: 'https://www.google.com/travel/flights' },
              ].map((p) => (
                <a
                  key={p.name}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 border border-[var(--hairline)] bg-[var(--bg-canvas)] hover:border-[var(--ink-primary)] flex items-center justify-center gap-1"
                >
                  <span>{p.name}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 border space-y-2.5 ${panelSurface}`}>
              <div className="text-[11px] text-[var(--ink-muted)] uppercase border-b border-[var(--hairline)] pb-1.5">
                RAILWAY STATIONS ({transitData?.railway_stations.length ?? 0})
              </div>
              {(transitData?.railway_stations || []).map((st) => (
                <div key={st.id} className={`p-2.5 border flex items-center justify-between gap-2 ${subSurface}`}>
                  <div className="min-w-0">
                    <div className="font-bold truncate">{st.name}</div>
                    <div className="text-[10px] text-[var(--ink-muted)]">{st.distance_km} KM · {st.address}</div>
                  </div>
                  <a href={mapsLink(st)} target="_blank" rel="noreferrer" className="px-2 py-1 bg-[var(--ink-primary)] text-[var(--bg-canvas)] text-[10px] font-bold">
                    MAP
                  </a>
                </div>
              ))}
            </div>

            <div className={`p-4 border space-y-2.5 ${panelSurface}`}>
              <div className="text-[11px] text-[var(--ink-muted)] uppercase border-b border-[var(--hairline)] pb-1.5">
                BUS STANDS &amp; TERMINALS ({transitData?.bus_stands.length ?? 0})
              </div>
              {(transitData?.bus_stands || []).map((st) => (
                <div key={st.id} className={`p-2.5 border flex items-center justify-between gap-2 ${subSurface}`}>
                  <div className="min-w-0">
                    <div className="font-bold truncate">{st.name}</div>
                    <div className="text-[10px] text-[var(--ink-muted)]">{st.distance_km} KM · {st.address}</div>
                  </div>
                  <a href={mapsLink(st)} target="_blank" rel="noreferrer" className="px-2 py-1 bg-[var(--ink-primary)] text-[var(--bg-canvas)] text-[10px] font-bold">
                    MAP
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Direct Splitwise Transit Expense Logger */}
      <div className={`p-4 border space-y-3 ${panelSurface}`}>
        <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-2 text-[11px] text-[var(--ink-muted)] uppercase">
          <span className="flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-[var(--ink-primary)]" />
            <span>DIRECT TRANSIT EXPENSE LOGGER → LOCAL TRANSIT BUCKET</span>
          </span>
          {txLoggedFlash && <span className="text-semantic-nominal font-bold">LOGGED TO TRANSIT ✓</span>}
        </div>

        <form onSubmit={handleLogTransitExpense} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label className="block text-[10px] text-[var(--ink-muted)] uppercase mb-1">DESCRIPTION</label>
            <input
              type="text"
              value={txDesc}
              onChange={(e) => setTxDesc(e.target.value)}
              placeholder={fuelType === 'EV' ? 'e.g. Ather Grid EV Top-up' : 'e.g. Fuel refill / Auto fare'}
              className="w-full p-2 border border-[var(--hairline)] bg-[var(--bg-canvas)] text-[var(--ink-primary)]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] text-[var(--ink-muted)] uppercase mb-1">AMOUNT (₹)</label>
            <input
              type="number"
              min={0}
              value={txAmount}
              onChange={(e) => {
                const n = Math.max(0, Number(e.target.value) || 0);
                setTxAmount(n);
                if (txSplitMode === 'custom') {
                  const res = rebalanceSequentialCustomSplits(n, txMembers, txLockedIds, txCustomSplits);
                  setTxCustomSplits(res.splits);
                  setTxLockedIds(res.nextLocked);
                }
              }}
              className="w-full p-2 border border-[var(--hairline)] bg-[var(--bg-canvas)] text-[var(--ink-primary)]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] text-[var(--ink-muted)] uppercase mb-1">PAID BY</label>
            <select
              value={txPaidBy}
              onChange={(e) => setTxPaidBy(e.target.value)}
              className="w-full p-2 border border-[var(--hairline)] bg-[var(--bg-canvas)] text-[var(--ink-primary)] text-[12px]"
            >
              {travelers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name.split(' ')[0]}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] text-[var(--ink-muted)] uppercase mb-1">SPLIT</label>
            <div className="grid grid-cols-2 border border-[var(--hairline)] bg-[var(--bg-canvas)] p-0.5">
              {(['equal', 'custom'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setTxSplitMode(m);
                    if (m === 'custom') {
                      setTxLockedIds(new Set());
                      setTxCustomSplits(buildEqualSplits(txAmount, txMembers));
                    }
                  }}
                  className={`py-1.5 text-[10px] uppercase font-bold cursor-pointer ${
                    txSplitMode === m ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)]' : 'text-[var(--ink-secondary)]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <motion.button
              type="submit"
              {...FLUID_GESTURE_TAP}
              transition={FLUID_ISLAND_SPRING}
              className="w-full py-2 bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>LOG TRANSIT</span>
            </motion.button>
          </div>

          {travelers.length > 0 && txSplitMode === 'custom' && (
            <div className="md:col-span-12 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {travelers.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 border border-[var(--hairline)] px-2 py-1">
                  <span className="text-[11px] truncate">{t.name.split(' ')[0]}</span>
                  <input
                    type="number"
                    step="any"
                    value={txCustomSplits[t.id] ?? 0}
                    onChange={(e) => {
                      const res = rebalanceSequentialCustomSplits(
                        txAmount,
                        txMembers,
                        txLockedIds,
                        txCustomSplits,
                        t.id,
                        Number(e.target.value)
                      );
                      setTxCustomSplits(res.splits);
                      setTxLockedIds(res.nextLocked);
                    }}
                    className="w-20 bg-[var(--bg-canvas)] border border-[var(--hairline)] px-1.5 py-0.5 text-right text-[11px]"
                  />
                </div>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
