import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { usePrayana } from '../../../context/PrayanaContext';
import { CompassLoader } from '../../common/CompassLoader';
import { DiningOption } from '../../../types';
import { PlaceItemApi } from '../../../services/apiClient';
import {
  FLUID_GESTURE_TAP,
  FLUID_ISLAND_SPRING,
  FLUID_SPRING,
} from '../../../motion/fluidTokens';
import {
  scrollToResultOnMobile,
  useGsapEnter,
  useGsapModal,
} from '../../../motion/gsapAnimations';
import {
  getCuratedRegionalDining,
  getCuratedRegionalStays,
} from '../../../data/curatedPlacesFallback';
import {
  BedDouble,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Minus,
  Navigation,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
  Utensils,
  X,
} from 'lucide-react';

const TABLES = [
  { id: 'T1', label: 'T1 · Window (2P)', capacity: 2, occupied: false },
  { id: 'T2', label: 'T2 · Courtyard (4P)', capacity: 4, occupied: false },
  { id: 'T3', label: 'T3 · Family Booth (6P)', capacity: 6, occupied: false },
  { id: 'T4', label: 'T4 · Terrace (4P)', capacity: 4, occupied: true },
];

const ROOM_OPTIONS = [
  { code: 'RM 104', name: 'Ground-Floor Accessible Suite', groundFloor: true, mult: 1.05 },
  { code: 'RM 208', name: 'Courtyard Deluxe', groundFloor: false, mult: 1.0 },
  { code: 'RM 214', name: 'Heritage Twin', groundFloor: false, mult: 0.95 },
  { code: 'RM 302', name: 'Family Loft', groundFloor: false, mult: 1.25 },
];

const SPECIAL_REQUESTS = ['Early Check-In', 'Extra Pillows', 'Allergy-Safe Bedding', 'EV Parking'];

const SAMPLE_DISHES_BY_CUISINE = [
  { id: 'd1', name: 'Signature Regional Thali / Platter', price: 280, tags: ['Pure Vegetarian'] },
  { id: 'd2', name: 'Steamed Idli & Filter Coffee Combo', price: 140, tags: ['Pure Vegetarian'] },
  { id: 'd3', name: 'Spiced Prawn / Coastal Curry', price: 390, tags: ['Shellfish Allergy'] },
  { id: 'd4', name: 'Cashew & Almond Biryani Bowl', price: 320, tags: ['Nut Allergy', 'Tree Nut Allergy'] },
];

const DEST_FALLBACK_COORDS: Record<string, { lat: number; lon: number }> = {
  hampi: { lat: 15.335, lon: 76.46 },
  coorg: { lat: 12.4244, lon: 75.7382 },
  kyoto: { lat: 35.0037, lon: 135.7704 },
  varanasi: { lat: 25.3109, lon: 83.006 },
};

function isNonDiningFalsePositive(name: string, categoryTag?: string): boolean {
  const low = `${name} ${categoryTag || ''}`.toLowerCase();
  return /(video.?game|gaming|arcade|cyber|supermarket|pharmacy|atm|bank|salon|clinic|commercial)/.test(low);
}

function isDualPurposeVenue(name: string, categoryTag?: string, stayNames?: Set<string>): boolean {
  const low = `${name} ${categoryTag || ''}`.toLowerCase();
  if (stayNames && stayNames.has(name.toLowerCase())) return true;
  return /(resort|lodge|inn|guest.?house|palace|retreat)/.test(low);
}

export const DiningStaysPage: React.FC = () => {
  const diningResultsRef = useRef<HTMLDivElement | null>(null);
  const diningModalRef = useRef<HTMLDivElement | null>(null);
  const diningBackdropRef = useRef<HTMLDivElement | null>(null);
  const stayModalRef = useRef<HTMLDivElement | null>(null);
  const stayBackdropRef = useRef<HTMLDivElement | null>(null);

  const {
    diningOptions,
    placesData,
    placesLoading,
    refreshDestinationPlaces,
    travelers,
    activeDestination,
    activeTrip,
    diningReservations,
    saveDiningReservation,
    cancelDiningReservation,
    stayReservations,
    saveStayReservation,
    cancelStayReservation,
    addExpense,
    theme,
  } = usePrayana();
  const isLight = theme === 'light';

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'RESTAURANTS' | 'STAYS'>('ALL');

  const groupAllergies = useMemo(
    () =>
      Array.from(
        new Set(travelers.flatMap((t) => t.dietaryTags.filter((d) => d && d !== 'None')))
      ),
    [travelers]
  );

  const needsGroundFloor = useMemo(
    () => travelers.some((t) => t.mobility === 'Assisted' || t.mobility === 'Wheelchair-Accessible'),
    [travelers]
  );

  const rawFilteredDining = useMemo(
    () => diningOptions.filter((d) => !isNonDiningFalsePositive(d.name, d.categoryTag)),
    [diningOptions]
  );

  const isDiningFallback = !placesLoading && rawFilteredDining.length === 0;
  const filteredDining = useMemo(
    () => (isDiningFallback ? getCuratedRegionalDining(activeDestination.id) : rawFilteredDining),
    [isDiningFallback, rawFilteredDining, activeDestination.id]
  );

  const rawStaysList = useMemo(() => placesData?.stays ?? [], [placesData]);
  const isStaysFallback = !placesLoading && rawStaysList.length === 0;
  const staysList = useMemo(
    () => (isStaysFallback ? getCuratedRegionalStays(activeDestination.id) : rawStaysList),
    [isStaysFallback, rawStaysList, activeDestination.id]
  );
  const stayNameSet = useMemo(
    () => new Set(staysList.map((s) => s.name.toLowerCase())),
    [staysList]
  );
  const diningNameSet = useMemo(
    () => new Set(filteredDining.map((d) => d.name.toLowerCase())),
    [filteredDining]
  );

  const confirmedDiningList = useMemo(
    () => Object.values(diningReservations),
    [diningReservations]
  );
  const confirmedStayList = useMemo(
    () => Object.values(stayReservations),
    [stayReservations]
  );

  // Restaurant Reservation Modal State
  const [selectedDining, setSelectedDining] = useState<DiningOption | null>(null);
  const [arrivalTime, setArrivalTime] = useState<string>('13:15');
  const [partySize, setPartySize] = useState<number>(Math.max(1, travelers.length || 2));
  const [selectedTableId, setSelectedTableId] = useState<string>('T2');
  const [preOrderCart, setPreOrderCart] = useState<Record<string, number>>({});
  const [syncDiningBudget, setSyncDiningBudget] = useState<boolean>(true);

  // Stay Reservation Modal State
  const [selectedStay, setSelectedStay] = useState<PlaceItemApi | null>(null);
  const [checkInDate, setCheckInDate] = useState<string>(activeTrip.checkInDate || '2026-12-10');
  const [checkOutDate, setCheckOutDate] = useState<string>(activeTrip.checkOutDate || '2026-12-12');
  const [stayArrivalTime, setStayArrivalTime] = useState<string>('14:00');
  const [selectedRoomCode, setSelectedRoomCode] = useState<string>(needsGroundFloor ? 'RM 104' : 'RM 208');
  const [specialRequests, setSpecialRequests] = useState<string[]>([]);
  const [syncStayBudget, setSyncStayBudget] = useState<boolean>(true);

  const openDiningModal = (din: DiningOption) => {
    setSelectedDining(din);
    const existing = diningReservations[din.id];
    setArrivalTime(existing?.arrivalTime || '13:15');
    setPartySize(existing?.partySize || Math.max(1, travelers.length || 2));
    setSelectedTableId(existing?.tableId || 'T2');
    setPreOrderCart({});
  };

  const openStayModal = (stay: PlaceItemApi) => {
    setSelectedStay(stay);
    const existing = stayReservations[stay.id];
    setCheckInDate(existing?.checkInDate || activeTrip.checkInDate || '2026-12-10');
    setCheckOutDate(existing?.checkOutDate || activeTrip.checkOutDate || '2026-12-12');
    setStayArrivalTime(existing?.arrivalTime || '14:00');
    setSelectedRoomCode(existing?.roomCode || (needsGroundFloor ? 'RM 104' : 'RM 208'));
    setSpecialRequests(existing?.specialRequests || []);
  };

  const preOrderTotal = useMemo(
    () =>
      SAMPLE_DISHES_BY_CUISINE.reduce(
        (sum, d) => sum + d.price * (preOrderCart[d.id] || 0),
        0
      ),
    [preOrderCart]
  );

  const handleConfirmDining = () => {
    if (!selectedDining) return;
    const tbl = TABLES.find((t) => t.id === selectedTableId) || TABLES[1];
    const items = SAMPLE_DISHES_BY_CUISINE.filter((d) => (preOrderCart[d.id] || 0) > 0).map((d) => ({
      name: d.name,
      price: d.price,
      qty: preOrderCart[d.id],
    }));
    const totalAmount = items.reduce((s, x) => s + x.price * x.qty, 0);
    const code = `PRY-${tbl.id}-${Math.floor(100 + Math.random() * 899)}`;
    const fallbackCoord = DEST_FALLBACK_COORDS[activeDestination.id] || DEST_FALLBACK_COORDS.hampi;

    saveDiningReservation({
      venueId: selectedDining.id,
      venueName: selectedDining.name,
      tableId: tbl.id,
      tableLabel: tbl.label,
      arrivalTime,
      partySize,
      preOrderedItems: items,
      totalAmount,
      confirmationCode: code,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      lat: selectedDining.lat ?? fallbackCoord.lat,
      lon: selectedDining.lon ?? fallbackCoord.lon,
    });

    if (syncDiningBudget && totalAmount > 0) {
      addExpense({
        category: 'food',
        amount: totalAmount,
        description: `Pre-Order · ${selectedDining.name} (${tbl.id})`,
        dayIndex: activeTrip.dayIndex ?? 1,
      });
    }
    setSelectedDining(null);
  };

  const handleConfirmStay = () => {
    if (!selectedStay) return;
    const rm = ROOM_OPTIONS.find((r) => r.code === selectedRoomCode) || ROOM_OPTIONS[0];
    const nights = Math.max(
      1,
      Math.ceil(
        (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)
      ) || 2
    );
    const totalAmount = Math.round(selectedStay.estimated_cost_for_two * rm.mult * nights);
    const code = `PRY-${rm.code.replace(/\s+/g, '')}-${Math.floor(100 + Math.random() * 899)}`;
    const fallbackCoord = DEST_FALLBACK_COORDS[activeDestination.id] || DEST_FALLBACK_COORDS.hampi;

    saveStayReservation({
      stayId: selectedStay.id,
      stayName: selectedStay.name,
      roomCode: rm.code,
      roomType: rm.name,
      checkInDate,
      checkOutDate,
      arrivalTime: stayArrivalTime,
      specialRequests,
      totalAmount,
      confirmationCode: code,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      lat: selectedStay.lat ?? fallbackCoord.lat,
      lon: selectedStay.lon ?? fallbackCoord.lon,
    });

    if (syncStayBudget && totalAmount > 0) {
      addExpense({
        category: 'stays',
        amount: totalAmount,
        description: `Stay · ${selectedStay.name} (${rm.code}, ${nights}N)`,
        dayIndex: activeTrip.dayIndex ?? 1,
      });
    }
    setSelectedStay(null);
  };

  const buildNavUrl = (lat?: number, lon?: number) => {
    const fb = DEST_FALLBACK_COORDS[activeDestination.id] || DEST_FALLBACK_COORDS.hampi;
    return `https://www.google.com/maps/dir/?api=1&destination=${lat ?? fb.lat},${lon ?? fb.lon}`;
  };

  const cardSurface = isLight
    ? 'bg-[#FFFFFF] border-[rgba(17,17,17,0.16)]'
    : 'bg-[#161616] border-[rgba(242,240,235,0.12)]';
  const subSurface = isLight
    ? 'bg-[#F4F3EF] border-[rgba(17,17,17,0.14)]'
    : 'bg-[#121212] border-[rgba(242,240,235,0.12)]';

  const hasConfirmed = confirmedDiningList.length > 0 || confirmedStayList.length > 0;

  return (
    <div className="w-full space-y-5 pb-12 font-mono text-[13px] select-none">
      {/* Top Status, Category Filter Pills & Overpass Refresh Bar */}
      <div className={`p-5 border flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${subSurface}`}>
        <div className="flex items-center space-x-2.5">
          <Utensils className="w-4 h-4 text-[var(--ink-primary)] shrink-0" />
          <div>
            <div className="text-[12px] font-bold text-[var(--ink-primary)] uppercase tracking-widest">
              LIVE OPENSTREETMAP DINING &amp; STAYS // {activeDestination.name.toUpperCase()}
            </div>
            <div className="text-[11px] text-[var(--ink-secondary)]">
              COHORT FILTER: {groupAllergies.join(', ') || 'NONE'} · CLICK ANY VENUE TO RESERVE TABLE / ROOM
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Pill Bar: ALL | RESTAURANTS | STAYS */}
          <div className="flex items-center border border-[var(--hairline)] bg-[var(--bg-canvas)] p-0.5">
            {(
              [
                { id: 'ALL', label: `ALL (${filteredDining.length + staysList.length})` },
                { id: 'RESTAURANTS', label: `RESTAURANTS (${filteredDining.length})` },
                { id: 'STAYS', label: `STAYS (${staysList.length})` },
              ] as const
            ).map((pill) => {
              const active = categoryFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(pill.id);
                    scrollToResultOnMobile(diningResultsRef);
                  }}
                  className={`relative px-2.5 py-1 text-[10px] font-bold uppercase cursor-pointer z-10 transition-colors ${
                    active ? 'text-[var(--bg-canvas)]' : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="diningCategoryPill"
                      transition={FLUID_SPRING}
                      className="absolute inset-0 bg-[var(--ink-primary)] -z-10"
                    />
                  )}
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => refreshDestinationPlaces()}
            disabled={placesLoading}
            className="px-3 py-1.5 border border-[var(--hairline-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:border-[var(--ink-primary)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-[11px]"
          >
            <RefreshCw className={`w-3 h-3 ${placesLoading ? 'animate-spin' : ''}`} />
            <span>REFRESH OSM</span>
          </button>
        </div>
      </div>

      {/* Dedicated CONFIRMED BOOKINGS & PRE-ORDERS Section at Top */}
      <div ref={diningResultsRef} className="space-y-4">
      {hasConfirmed && (
        <div className={`p-5 border border-l-[3px] border-l-emerald-500 space-y-3 ${cardSurface}`}>
          <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-2 text-[11px] uppercase">
            <span className="font-bold text-semantic-nominal flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>CONFIRMED BOOKINGS &amp; PRE-ORDERS ({confirmedDiningList.length + confirmedStayList.length})</span>
            </span>
            <span className="text-[var(--ink-muted)]">SYNCED TO ITINERARY</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {confirmedDiningList.map((res) => {
              const matchedVenue = filteredDining.find((d) => d.id === res.venueId);
              return (
                <div key={res.venueId} className={`p-4 border space-y-2 ${subSurface}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-serif text-lg text-[var(--ink-primary)] truncate">{res.venueName}</div>
                      <div className="text-[11px] text-[var(--ink-secondary)]">
                        {res.tableLabel} · {res.partySize} Guests · @ {res.arrivalTime}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 border border-semantic-nominal text-semantic-nominal text-[10px] font-bold shrink-0">
                      {res.confirmationCode}
                    </span>
                  </div>

                  {res.preOrderedItems.length > 0 && (
                    <div className="text-[11px] text-[var(--ink-secondary)] border-t border-[var(--hairline)] pt-1.5">
                      Pre-order: {res.preOrderedItems.map((i) => `${i.name} ×${i.qty}`).join(', ')} (₹{res.totalAmount})
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {matchedVenue && (
                      <button
                        type="button"
                        onClick={() => openDiningModal(matchedVenue)}
                        className="px-2.5 py-1 border border-[var(--hairline-strong)] text-[10px] font-bold hover:border-[var(--ink-primary)] cursor-pointer"
                      >
                        [ MODIFY ]
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => cancelDiningReservation(res.venueId)}
                      className="px-2.5 py-1 border border-[var(--hairline)] text-red-500 hover:border-red-500 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      <span>[ CANCEL ]</span>
                    </button>
                    <a
                      href={buildNavUrl(res.lat, res.lon)}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto px-2.5 py-1 bg-[var(--ink-primary)] text-[var(--bg-canvas)] text-[10px] font-bold flex items-center gap-1"
                    >
                      <Navigation className="w-2.5 h-2.5" />
                      <span>[ NAVIGATE ↗ ]</span>
                    </a>
                  </div>
                </div>
              );
            })}

            {confirmedStayList.map((res) => {
              const matchedStay = staysList.find((s) => s.id === res.stayId);
              return (
                <div key={res.stayId} className={`p-4 border space-y-2 ${subSurface}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-serif text-lg text-[var(--ink-primary)] truncate">{res.stayName}</div>
                      <div className="text-[11px] text-[var(--ink-secondary)]">
                        {res.roomCode} ({res.roomType}) · {res.checkInDate} → {res.checkOutDate} @ {res.arrivalTime}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 border border-semantic-nominal text-semantic-nominal text-[10px] font-bold shrink-0">
                      {res.confirmationCode}
                    </span>
                  </div>

                  {res.specialRequests.length > 0 && (
                    <div className="text-[11px] text-[var(--ink-secondary)] border-t border-[var(--hairline)] pt-1.5">
                      Requests: {res.specialRequests.join(', ')}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {matchedStay && (
                      <button
                        type="button"
                        onClick={() => openStayModal(matchedStay)}
                        className="px-2.5 py-1 border border-[var(--hairline-strong)] text-[10px] font-bold hover:border-[var(--ink-primary)] cursor-pointer"
                      >
                        [ MODIFY ]
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => cancelStayReservation(res.stayId)}
                      className="px-2.5 py-1 border border-[var(--hairline)] text-red-500 hover:border-red-500 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      <span>[ CANCEL ]</span>
                    </button>
                    <a
                      href={buildNavUrl(res.lat, res.lon)}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto px-2.5 py-1 bg-[var(--ink-primary)] text-[var(--bg-canvas)] text-[10px] font-bold flex items-center gap-1"
                    >
                      <Navigation className="w-2.5 h-2.5" />
                      <span>[ NAVIGATE ↗ ]</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Compact 1-line Note */}
      <div className={`px-4 py-2 border text-[11px] font-sans text-[var(--ink-muted)] truncate ${subSurface}`}>
        OSM Overpass venues &amp; cost tier estimates · Always verify allergens at table · Interactive reservation &amp; pre-order simulation synced to your itinerary.
      </div>

      {/* Main Dining & Stays Grid */}
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-5">
        {placesLoading && filteredDining.length > 0 && (
          <CompassLoader
            variant="overlay"
            theme={theme}
            statusText={`REFRESHING OPENSTREETMAP VENUES AROUND ${activeDestination.name.toUpperCase()}...`}
          />
        )}

        {/* RESTAURANTS SECTION */}
        {(categoryFilter === 'ALL' || categoryFilter === 'RESTAURANTS') && (
          <div className={`${categoryFilter === 'RESTAURANTS' ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-3`}>
            <div className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest pb-1.5 border-b border-[var(--hairline)] flex justify-between">
              <span>
                {isDiningFallback
                  ? 'REGIONAL DIRECTORY // RESTAURANTS & CAFES'
                  : 'ALLERGY-SCREENED RESTAURANTS & CAFES'}
              </span>
              <span className="text-[var(--ink-primary)] font-bold">{filteredDining.length} VENUES</span>
            </div>

            {placesLoading && filteredDining.length === 0 ? (
              <CompassLoader
                variant="inline"
                theme={theme}
                statusText={`QUERYING OVERPASS AROUND ${activeDestination.name.toUpperCase()}...`}
              />
            ) : filteredDining.length === 0 ? (
              <div className={`p-8 text-center text-[12px] text-[var(--ink-muted)] border space-y-3 ${cardSurface}`}>
                <div>NO LIVE OVERPASS VENUES RETURNED FOR THIS SECTOR.</div>
                <button
                  type="button"
                  onClick={() => refreshDestinationPlaces()}
                  className="px-4 py-1.5 bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold cursor-pointer"
                >
                  [ RETRY OVERPASS QUERY ]
                </button>
              </div>
            ) : (
              <div
                className={`grid grid-cols-1 ${
                  categoryFilter === 'RESTAURANTS' ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2'
                } gap-5`}
              >
                {filteredDining.slice(0, 12).map((din) => {
                  const hasAllergenConflict = din.allergenFlags.some((a) => groupAllergies.includes(a));
                  const booked = diningReservations[din.id];
                  const dual = isDualPurposeVenue(din.name, din.categoryTag, stayNameSet);

                  return (
                    <motion.div
                      key={din.id}
                      whileHover={{ y: -2 }}
                      transition={FLUID_ISLAND_SPRING}
                      onClick={() => openDiningModal(din)}
                      className={`p-5 border cursor-pointer transition-colors hover:border-[var(--ink-primary)] flex flex-col justify-between gap-3 ${cardSurface} ${
                        hasAllergenConflict ? 'border-l-[3px] border-l-red-500/75' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-serif text-lg text-[var(--ink-primary)] leading-tight truncate">
                            {din.name}
                          </h4>
                          <div className="text-[11px] text-[var(--ink-secondary)] mt-0.5">
                            {din.cuisine} · {din.distanceKm} km
                          </div>
                        </div>

                        <div className="text-right font-mono shrink-0">
                          <div className="text-sm font-bold text-[var(--ink-primary)]">~₹{din.costForTwo}</div>
                          <div className="text-[10px] text-[var(--ink-muted)]">FOR TWO</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {dual && (
                          <span className="px-1.5 py-0.5 border border-[var(--hairline-strong)] text-[var(--ink-primary)] text-[10px] font-bold">
                            DINING + STAY
                          </span>
                        )}
                        {booked && (
                          <span className="px-2 py-0.5 border border-semantic-nominal text-semantic-nominal text-[10px] font-bold">
                            BOOKED · {booked.tableId} @ {booked.arrivalTime}
                          </span>
                        )}
                        {(din.osmVerifiedTags || []).map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 border border-semantic-nominal/60 text-semantic-nominal text-[10px] font-bold"
                          >
                            [OSM] {tag}
                          </span>
                        ))}
                        {din.allergenFlags.map((af) => (
                          <span
                            key={af}
                            className="px-1.5 py-0.5 border border-red-500/60 text-red-500 text-[10px] font-bold"
                          >
                            RISK: {af.toUpperCase()}
                          </span>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-[var(--hairline)] flex items-center justify-between text-[11px]">
                        <span className="text-[var(--ink-muted)] truncate max-w-[55%]">{din.address}</span>
                        <span className="font-bold text-[var(--ink-primary)]">
                          {booked ? 'MODIFY TABLE →' : 'RESERVE TABLE →'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STAYS SECTION */}
        {(categoryFilter === 'ALL' || categoryFilter === 'STAYS') && (
          <div className={`${categoryFilter === 'STAYS' ? 'lg:col-span-12' : 'lg:col-span-5'} space-y-3`}>
            <div className="text-[11px] text-[var(--ink-muted)] uppercase tracking-widest pb-1.5 border-b border-[var(--hairline)] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BedDouble className="w-3.5 h-3.5 text-[var(--ink-primary)]" />
                <span>
                  {isStaysFallback ? 'REGIONAL DIRECTORY // STAYS' : 'LIVE OPENSTREETMAP ACCOMMODATIONS'}
                </span>
              </span>
              <span className="text-[var(--ink-primary)] font-bold">{staysList.length} STAYS</span>
            </div>

            {staysList.length > 0 ? (
              <div
                className={`grid grid-cols-1 ${
                  categoryFilter === 'STAYS' ? 'md:grid-cols-2 xl:grid-cols-3' : ''
                } gap-4`}
              >
                {staysList.slice(0, 10).map((stay) => {
                  const reserved = stayReservations[stay.id];
                  const dual = isDualPurposeVenue(stay.name, stay.category_tag, diningNameSet);
                  return (
                    <motion.div
                      key={stay.id}
                      whileHover={{ y: -2 }}
                      transition={FLUID_ISLAND_SPRING}
                      onClick={() => openStayModal(stay)}
                      className={`p-5 border cursor-pointer hover:border-[var(--ink-primary)] flex items-center justify-between gap-3 ${cardSurface} ${
                        reserved ? 'border-l-[3px] border-l-emerald-500/80' : ''
                      }`}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="font-serif text-lg text-[var(--ink-primary)] truncate">{stay.name}</div>
                        <div className="text-[11px] text-[var(--ink-muted)] truncate">
                          {stay.category_tag.replace('_', ' ').toUpperCase()} · {stay.distance_km} km · {stay.address}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {dual && (
                            <span className="px-1.5 py-0.5 border border-[var(--hairline-strong)] text-[var(--ink-primary)] text-[10px] font-bold">
                              DINING + STAY
                            </span>
                          )}
                          {reserved && (
                            <span className="px-2 py-0.5 border border-semantic-nominal text-semantic-nominal text-[10px] font-bold">
                              RESERVED · {reserved.roomCode}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-[var(--ink-primary)]">~₹{stay.estimated_cost_for_two}</div>
                        <div className="text-[10px] text-[var(--ink-muted)]">EST / NIGHT</div>
                        <div className="text-[10px] font-bold text-[var(--ink-primary)] mt-1">
                          {reserved ? 'VIEW →' : 'BOOK ROOM →'}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className={`p-6 text-center text-[12px] text-[var(--ink-muted)] border ${cardSurface}`}>
                {placesLoading ? 'LOADING ACCOMMODATIONS...' : 'NO STAYS RETURNED IN CURRENT RADIUS.'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Restaurant Reserve Table & Pre-Order Modal */}
      </div>
      {selectedDining && (
        <div
          ref={diningBackdropRef}
          onClick={() => setSelectedDining(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3"
        >
          <div
            ref={diningModalRef}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-xl max-h-[86vh] overflow-y-auto border p-5 space-y-4 shadow-2xl transform-gpu ${cardSurface}`}
          >
              <div className="flex items-start justify-between border-b border-[var(--hairline)] pb-3">
                <div>
                  <div className="text-[10px] text-[var(--ink-muted)] uppercase">RESERVE TABLE &amp; PRE-ORDER</div>
                  <h3 className="font-serif text-2xl text-[var(--ink-primary)]">{selectedDining.name}</h3>
                </div>
                <button type="button" onClick={() => setSelectedDining(null)} className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[var(--ink-muted)] uppercase mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> ARRIVAL TIME
                  </label>
                  <input
                    type="time"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    className="w-full p-2 border border-[var(--hairline)] bg-[var(--bg-canvas)] text-[var(--ink-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--ink-muted)] uppercase mb-1 flex items-center gap-1">
                    <Users className="w-3 h-3" /> PARTY SIZE
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={partySize}
                    onChange={(e) => setPartySize(Math.max(1, Number(e.target.value)))}
                    className="w-full p-2 border border-[var(--hairline)] bg-[var(--bg-canvas)] text-[var(--ink-primary)]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[10px] text-[var(--ink-muted)] uppercase">SELECT TABLE</div>
                <div className="grid grid-cols-2 gap-2">
                  {TABLES.map((tbl) => {
                    const active = selectedTableId === tbl.id;
                    return (
                      <button
                        key={tbl.id}
                        type="button"
                        disabled={tbl.occupied}
                        onClick={() => setSelectedTableId(tbl.id)}
                        className={`p-2.5 border text-left text-[11px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                          active
                            ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] border-[var(--ink-primary)] font-bold'
                            : 'border-[var(--hairline)] bg-[var(--bg-canvas)] text-[var(--ink-primary)]'
                        }`}
                      >
                        <div>{tbl.label}</div>
                        <div className="text-[9px] opacity-75">{tbl.occupied ? 'OCCUPIED' : 'AVAILABLE'}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] text-[var(--ink-muted)] uppercase">DISH PRE-ORDER (COHORT SCREENED)</div>
                <div className="space-y-1.5">
                  {SAMPLE_DISHES_BY_CUISINE.map((dish) => {
                    const qty = preOrderCart[dish.id] || 0;
                    const conflict = dish.tags.some((t) => groupAllergies.includes(t) && t !== 'Pure Vegetarian');
                    return (
                      <div
                        key={dish.id}
                        className={`p-2.5 border flex items-center justify-between gap-2 ${subSurface} ${
                          conflict ? 'border-l-[3px] border-l-amber-400/75' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-[12px] font-bold text-[var(--ink-primary)] truncate">{dish.name}</div>
                          <div className="text-[10px] text-[var(--ink-secondary)]">
                            ₹{dish.price} {conflict ? '· Cohort Allergy Match' : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreOrderCart((p) => ({ ...p, [dish.id]: Math.max(0, (p[dish.id] || 0) - 1) }))}
                            className="p-1 border border-[var(--hairline)] cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center font-bold">{qty}</span>
                          <button
                            type="button"
                            onClick={() => setPreOrderCart((p) => ({ ...p, [dish.id]: (p[dish.id] || 0) + 1 }))}
                            className="p-1 border border-[var(--hairline)] cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2 text-[11px] text-[var(--ink-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncDiningBudget}
                  onChange={(e) => setSyncDiningBudget(e.target.checked)}
                />
                <span>Log pre-order (₹{preOrderTotal}) to Food &amp; Dining in 02 // LIVE BUDGET</span>
              </label>

              <div className="text-[10px] text-[var(--ink-muted)] italic">
                Interactive venue reservation &amp; pre-order simulation synced to your itinerary
              </div>

              <motion.button
                type="button"
                {...FLUID_GESTURE_TAP}
                transition={FLUID_ISLAND_SPRING}
                onClick={handleConfirmDining}
                className="w-full py-2.5 bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold text-[12px] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>[ CONFIRM TABLE &amp; PRE-ORDER ]</span>
              </motion.button>
            </div>
          </div>
        )}

      {/* Stay Reserve Room & Check-In Modal */}
      {selectedStay && (
        <div
          ref={stayBackdropRef}
          onClick={() => setSelectedStay(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3"
        >
          <div
            ref={stayModalRef}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-xl max-h-[86vh] overflow-y-auto border p-5 space-y-4 shadow-2xl transform-gpu ${cardSurface}`}
          >
              <div className="flex items-start justify-between border-b border-[var(--hairline)] pb-3">
                <div>
                  <div className="text-[10px] text-[var(--ink-muted)] uppercase">RESERVE ROOM &amp; CHECK-IN</div>
                  <h3 className="font-serif text-2xl text-[var(--ink-primary)]">{selectedStay.name}</h3>
                </div>
                <button type="button" onClick={() => setSelectedStay(null)} className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] text-[var(--ink-muted)] uppercase mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> CHECK-IN
                  </label>
                  <input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full p-2 border border-[var(--hairline)] bg-[var(--bg-canvas)] text-[var(--ink-primary)] text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--ink-muted)] uppercase mb-1">CHECK-OUT</label>
                  <input
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full p-2 border border-[var(--hairline)] bg-[var(--bg-canvas)] text-[var(--ink-primary)] text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--ink-muted)] uppercase mb-1">ARRIVAL</label>
                  <input
                    type="time"
                    value={stayArrivalTime}
                    onChange={(e) => setStayArrivalTime(e.target.value)}
                    className="w-full p-2 border border-[var(--hairline)] bg-[var(--bg-canvas)] text-[var(--ink-primary)] text-[11px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[10px] text-[var(--ink-muted)] uppercase flex items-center justify-between">
                  <span>SELECT ROOM</span>
                  {needsGroundFloor && (
                    <span className="text-semantic-nominal flex items-center gap-1 font-bold">
                      <ShieldCheck className="w-3 h-3" /> GROUND-FLOOR RECOMMENDED
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROOM_OPTIONS.map((rm) => {
                    const active = selectedRoomCode === rm.code;
                    return (
                      <button
                        key={rm.code}
                        type="button"
                        onClick={() => setSelectedRoomCode(rm.code)}
                        className={`p-2.5 border text-left text-[11px] cursor-pointer ${
                          active
                            ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] border-[var(--ink-primary)] font-bold'
                            : rm.groundFloor && needsGroundFloor
                            ? 'border-l-[3px] border-l-emerald-500 border-[var(--hairline)] bg-[var(--bg-canvas)] text-[var(--ink-primary)]'
                            : 'border-[var(--hairline)] bg-[var(--bg-canvas)] text-[var(--ink-primary)]'
                        }`}
                      >
                        <div className="flex justify-between">
                          <span>{rm.code}</span>
                          <span>~₹{Math.round(selectedStay.estimated_cost_for_two * rm.mult)}/N</span>
                        </div>
                        <div className="text-[10px] opacity-80 mt-0.5">{rm.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[10px] text-[var(--ink-muted)] uppercase">SPECIAL REQUESTS</div>
                <div className="flex flex-wrap gap-1.5">
                  {SPECIAL_REQUESTS.map((req) => {
                    const checked = specialRequests.includes(req);
                    return (
                      <button
                        key={req}
                        type="button"
                        onClick={() =>
                          setSpecialRequests((prev) =>
                            prev.includes(req) ? prev.filter((x) => x !== req) : [...prev, req]
                          )
                        }
                        className={`px-2.5 py-1 border text-[11px] flex items-center gap-1 cursor-pointer ${
                          checked
                            ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] border-[var(--ink-primary)] font-bold'
                            : 'border-[var(--hairline)] text-[var(--ink-secondary)]'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3" />}
                        <span>{req}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2 text-[11px] text-[var(--ink-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncStayBudget}
                  onChange={(e) => setSyncStayBudget(e.target.checked)}
                />
                <span>Sync stay booking to Stays bucket in 02 // LIVE BUDGET</span>
              </label>

              <motion.button
                type="button"
                {...FLUID_GESTURE_TAP}
                transition={FLUID_ISLAND_SPRING}
                onClick={handleConfirmStay}
                className="w-full py-2.5 bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold text-[12px] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>[ CONFIRM STAY BOOKING ]</span>
              </motion.button>
            </div>
          </div>
        )}
    </div>
  );
};
