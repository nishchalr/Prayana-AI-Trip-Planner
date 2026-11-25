import React, { createContext, useContext, useState, useMemo, useEffect, useRef } from 'react';
import { 
  TravelerProfile, 
  MobilityLevel,
  Destination, 
  ActiveTrip, 
  VitalsData, 
  StrainLevel, 
  MonolithStop,
  AppView,
  ExpenseItem,
  DiningOption,
  CockpitTab,
  MapMode,
  OcrScanResult 
} from '../types';
import { 
  INITIAL_TRAVELERS, 
  INITIAL_DESTINATIONS, 
  INITIAL_ACTIVE_TRIP,
  INITIAL_EXPENSES
} from '../data/mockData';
import { 
  evaluateRealtimeStrain, 
  computeTravelerSegmentPenalty,
  extractHeuristicVector
} from '../services/googleHealthService';
import { 
  persistProfiles, 
  persistTrip, 
  persistExpenses,
  persistWishlist, 
  fetchWishlist,
  fetchUserWorkspace,
  subscribeToAuth,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOutUser,
  AuthUser 
} from '../services/firebase';
import {
  checkApiHealth,
  optimizeRoute as apiOptimizeRoute,
  rebalanceBudget as apiRebalanceBudget,
  scanMenuOCR as apiScanMenuOCR,
  evaluateVitals as apiEvaluateVitals,
  fetchDestinationPlaces,
  PlacesApiResponse
} from '../services/apiClient';
import {
  connectBleHeartRateDevice,
  BleConnectionHandle
} from '../services/bleHealthService';

interface PrayanaContextType {
  activeView: AppView;
  setActiveView: (view: AppView) => void;

  // Firebase Auth State & Methods
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, age: number, email: string, pass: string, mobility: MobilityLevel) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  demoBypass: () => void;
  logoutUser: () => Promise<void>;

  // Global preloader and 3D warmup state
  isPreloaderActive: boolean;
  setIsPreloaderActive: (active: boolean) => void;

  // Swiss Paper Light ↔ Architectural Noir Dark theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  travelers: TravelerProfile[];
  hasTravelers: boolean;
  activeTravelerId: string;
  activeTraveler: TravelerProfile;
  setActiveTravelerId: (id: string) => void;
  updateTraveler: (id: string, updates: Partial<TravelerProfile>) => void;
  addTraveler: (traveler: TravelerProfile) => void;
  deleteTraveler: (id: string) => void;
  loadSampleCohort: () => void;

  destinations: Destination[];
  activeDestinationId: string;
  activeDestination: Destination;
  setActiveDestinationId: (id: string) => void;
  nextDestination: () => void;
  prevDestination: () => void;

  // Active route stops (dynamic timeline & map sync)
  routeStops: MonolithStop[];
  setRouteStops: React.Dispatch<React.SetStateAction<MonolithStop[]>>;
  reorderRouteStops: (fromIndex: number, toIndex: number) => void;
  updateRouteStop: (id: string, updates: Partial<MonolithStop>) => void;
  removeRouteStop: (id: string) => void;
  insertStopIntoRoute: (stop: MonolithStop) => void;
  activeStopId: string | null;
  setActiveStopId: (id: string | null) => void;
  activeStop: MonolithStop | null;
  hoveredStopId: string | null;
  setHoveredStopId: (id: string | null) => void;

  activeTrip: ActiveTrip;
  updateActiveTrip: (trip: Partial<ActiveTrip>) => void;

  // Dual-mode map & Operations Cockpit
  activeMapMode: MapMode;
  setActiveMapMode: (mode: MapMode) => void;
  activeCockpitTab: CockpitTab;
  setActiveCockpitTab: (tab: CockpitTab) => void;

  // Expenses & 4-Bucket Rebalancing (Chapter 5)
  expenses: ExpenseItem[];
  addExpense: (expense: Omit<ExpenseItem, 'id' | 'timestamp'>) => void;
  isOverspent: boolean;
  netOverspend: number;
  compensatoryRebalance: () => void;
  rebalanceApplied: boolean;

  // Disruption Rerouting
  isStormDisrupted: boolean;
  toggleStormDisruption: () => void;

  // Dining & Stays (Live OSM Overpass)
  diningOptions: DiningOption[];
  placesData: PlacesApiResponse | null;
  placesLoading: boolean;
  refreshDestinationPlaces: () => Promise<void>;

  // Offline Bhashini Language Pack & OCR Scanner
  isBhashiniDownloaded: boolean;
  downloadBhashiniPack: () => void;
  ocrScanResult: OcrScanResult | null;
  runOcrScan: (input?: { imageFile?: File | null; sampleText?: string } | string) => Promise<OcrScanResult>;

  // Personal Bucket List
  wishlistIds: string[];
  toggleWishlist: (stopId: string) => void;
  isBucketListOpen: boolean;
  setIsBucketListOpen: (open: boolean) => void;

  // Offline Archival Share Hub Modal
  isShareHubOpen: boolean;
  setIsShareHubOpen: (open: boolean) => void;

  // Live Wearable Telemetry, Web Bluetooth BLE & Simulator
  liveVitals: VitalsData;
  setLiveVitals: React.Dispatch<React.SetStateAction<VitalsData>>;
  isFitbandSimActive: boolean;
  setIsFitbandSimActive: (active: boolean) => void;
  bleConnectedDevice: string | null;
  bleHrLocked: boolean;
  bleError: string | null;
  pairBluetoothFitband: (travelerId?: string) => Promise<void>;
  disconnectBluetoothFitband: (travelerId?: string) => void;
  toggleSimulatorMode: (enabled: boolean, travelerId?: string) => void;
  weatherSummary: string | null;
  updateLiveHr: (bpm: number) => void;
  updateLiveSpO2: (spO2: number) => void;
  updateLiveSteps: (steps: number) => void;
  updateLiveWbgt: (wbgt: number) => void;
  activeAdvisory?: string;

  // Drawers & Modals
  isVitalsDrawerOpen: boolean;
  setIsVitalsDrawerOpen: (open: boolean) => void;
  isCopilotDrawerOpen: boolean;
  setIsCopilotDrawerOpen: (open: boolean) => void;
  isItineraryOpen: boolean;
  setIsItineraryOpen: (open: boolean) => void;
  isWizardOpen: boolean;
  setIsWizardOpen: (open: boolean) => void;
  isIntakeModalOpen: boolean;
  setIsIntakeModalOpen: (open: boolean) => void;
  isPrimaryOnboarding: boolean;
  setIsPrimaryOnboarding: (onboarding: boolean) => void;
  onboardingPrefill: { name?: string; age?: number; mobility?: MobilityLevel } | null;
  setOnboardingPrefill: (prefill: { name?: string; age?: number; mobility?: MobilityLevel } | null) => void;
  editingTravelerId: string | null;
  setEditingTravelerId: (id: string | null) => void;

  // Heuristic effort computation
  computeEffortStrain: (hr: number, slopeDeg: number, mobility: string) => StrainLevel;

  // Backend API Status & Route Optimization
  apiStatus: 'LIVE' | 'LOCAL FALLBACK' | 'CONNECTING';
  refreshApiStatus: () => Promise<void>;
  optimizeActiveRoute: () => Promise<{ solverStatus: string; solveTimeMs: number } | null>;
}

const PrayanaContext = createContext<PrayanaContextType | undefined>(undefined);

function computeLevenshtein(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix: number[][] = [];
  for (let i = 0; i <= bn; i++) matrix[i] = [i];
  for (let j = 0; j <= an; j++) matrix[0][j] = j;
  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[bn][an];
}

export const PrayanaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const cached = localStorage.getItem('prayana_auth_user');
    return cached ? JSON.parse(cached) : null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('prayana_auth_authenticated') === 'true';
  });

  const [activeView, setActiveView] = useState<AppView>(() => {
    const isAuth = localStorage.getItem('prayana_auth_authenticated') === 'true';
    return isAuth ? 'GALLERY_HOME' : 'AUTH';
  });

  const [isPreloaderActive, setIsPreloaderActive] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('prayana_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('prayana_theme', theme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'light' ? '#F4F3EF' : '#0E0E0E');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [apiStatus, setApiStatus] = useState<'LIVE' | 'LOCAL FALLBACK' | 'CONNECTING'>('CONNECTING');

  const refreshApiStatus = async () => {
    const isOnline = await checkApiHealth();
    setApiStatus(isOnline ? 'LIVE' : 'LOCAL FALLBACK');
  };

  useEffect(() => {
    refreshApiStatus();
    const interval = setInterval(refreshApiStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const [travelers, setTravelers] = useState<TravelerProfile[]>(() => {
    try {
      const cachedUserRaw = localStorage.getItem('prayana_auth_user');
      const cachedUser = cachedUserRaw ? (JSON.parse(cachedUserRaw) as AuthUser) : null;
      const saved = localStorage.getItem('prayana_travelers');
      if (saved !== null) {
        return JSON.parse(saved);
      }
      return cachedUser?.isDemo ? INITIAL_TRAVELERS : [];
    } catch {
      return [];
    }
  });

  const [activeTravelerId, setActiveTravelerId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('prayana_travelers');
      if (saved !== null) {
        const parsed = JSON.parse(saved) as TravelerProfile[];
        return parsed[0]?.id ?? '';
      }
    } catch {
      // ignore
    }
    return '';
  });

  const activeUid = currentUser && !currentUser.isDemo ? currentUser.uid : undefined;

  const [destinations] = useState<Destination[]>(INITIAL_DESTINATIONS);
  const [activeDestinationId, setActiveDestinationId] = useState<string>('hampi');

  const skipNextStopResetRef = useRef<boolean>(false);
  const [isPrimaryOnboarding, setIsPrimaryOnboarding] = useState<boolean>(false);
  const [onboardingPrefill, setOnboardingPrefill] = useState<{
    name?: string;
    age?: number;
    mobility?: MobilityLevel;
  } | null>(null);

  // Sync Firebase Auth session & hydrate Firestore state per uid
  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (user) => {
      if (!user) {
        return;
      }
      setCurrentUser(user);
      setIsAuthenticated(true);
      localStorage.setItem('prayana_auth_authenticated', 'true');
      setActiveView(prev => (prev === 'AUTH' ? 'GALLERY_HOME' : prev));

      if (!user.isDemo) {
        const snapshot = await fetchUserWorkspace(user.uid);
        if (snapshot.profiles && snapshot.profiles.profiles.length > 0) {
          setTravelers(snapshot.profiles.profiles);
          localStorage.setItem('prayana_travelers', JSON.stringify(snapshot.profiles.profiles));
          localStorage.setItem('prayana_travelers_initialized', 'true');
          if (snapshot.profiles.activeTravelerId) {
            setActiveTravelerId(snapshot.profiles.activeTravelerId);
          } else {
            setActiveTravelerId(snapshot.profiles.profiles[0]?.id ?? '');
          }
          setIsPrimaryOnboarding(false);
        } else {
          // Real account with 0 profiles in Firestore -> strictly empty cohort + Primary Traveler Onboarding
          setTravelers([]);
          localStorage.setItem('prayana_travelers', '[]');
          setActiveTravelerId('');
          setOnboardingPrefill(prev => prev ?? { name: user.displayName || user.email?.split('@')[0] || '' });
          setIsPrimaryOnboarding(true);
          setEditingTravelerId(null);
          setIsIntakeModalOpen(true);
        }
        const hasTripHash = typeof window !== 'undefined' && window.location.hash.startsWith('#trip=');
        if (!hasTripHash && snapshot.trip) {
          if (snapshot.trip.routeStops && snapshot.trip.routeStops.length > 0) {
            skipNextStopResetRef.current = true;
            setRouteStops(snapshot.trip.routeStops);
          }
          if (snapshot.trip.activeDestinationId) {
            setActiveDestinationId(snapshot.trip.activeDestinationId);
          }
          if (snapshot.trip.activeTrip) {
            setActiveTrip(snapshot.trip.activeTrip);
            localStorage.setItem('prayana_active_trip', JSON.stringify(snapshot.trip.activeTrip));
          }
          if (typeof snapshot.trip.rebalanceApplied === 'boolean') {
            setRebalanceApplied(snapshot.trip.rebalanceApplied);
          }
        }
        if (snapshot.expenses) {
          setExpenses(snapshot.expenses);
          localStorage.setItem('prayana_expenses', JSON.stringify(snapshot.expenses));
        }
        if (snapshot.wishlistIds) {
          setWishlistIds(snapshot.wishlistIds);
          localStorage.setItem('prayana_wishlist', JSON.stringify(snapshot.wishlistIds));
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Firebase Auth Handlers
  const loginWithEmail = async (email: string, pass: string) => {
    if (currentUser?.isDemo) {
      setTravelers([]);
      localStorage.removeItem('prayana_travelers');
    }
    const user = await signInWithEmail(email, pass);
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('prayana_auth_authenticated', 'true');
    setIsPreloaderActive(true);
    setActiveView('GALLERY_HOME');
  };

  const registerWithEmail = async (
    name: string,
    age: number,
    email: string,
    pass: string,
    mobility: MobilityLevel
  ) => {
    // Clear any stale demo profiles & set prefill BEFORE Firebase auth listener fires
    setTravelers([]);
    localStorage.setItem('prayana_travelers', '[]');
    setActiveTravelerId('');
    setOnboardingPrefill({
      name: name.trim(),
      age: Number(age) || 30,
      mobility,
    });
    setIsPrimaryOnboarding(true);
    setEditingTravelerId(null);

    const user = await signUpWithEmail(email, pass, name);
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('prayana_auth_authenticated', 'true');

    setIsIntakeModalOpen(true);

    setIsPreloaderActive(true);
    setActiveView('GALLERY_HOME');
  };

  const loginWithGoogle = async () => {
    if (currentUser?.isDemo) {
      setTravelers([]);
      localStorage.removeItem('prayana_travelers');
    }
    const user = await signInWithGoogle();
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('prayana_auth_authenticated', 'true');
    setIsPreloaderActive(true);
    setActiveView('GALLERY_HOME');
  };

  const demoBypass = () => {
    const bypassUser: AuthUser = {
      uid: 'demo_coorg_cohort',
      email: 'coorg.cohort@prayana.arch',
      displayName: 'Aarav Chen (Coorg Cohort)',
      isDemo: true,
    };
    setCurrentUser(bypassUser);
    setIsAuthenticated(true);
    localStorage.setItem('prayana_auth_user', JSON.stringify(bypassUser));
    localStorage.setItem('prayana_auth_authenticated', 'true');
    setTravelers(INITIAL_TRAVELERS);
    setActiveTravelerId(INITIAL_TRAVELERS[0].id);
    localStorage.setItem('prayana_travelers', JSON.stringify(INITIAL_TRAVELERS));
    setIsPrimaryOnboarding(false);
    setIsIntakeModalOpen(false);
    setIsPreloaderActive(true);
    setActiveView('GALLERY_HOME');
  };

  const logoutUser = async () => {
    bleHandleRef.current?.disconnect();
    bleHandleRef.current = null;
    setBleConnectedDevice(null);
    setBleHrLocked(false);
    setIsFitbandSimActive(false);
    await signOutUser();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setTravelers([]);
    setActiveTravelerId('');
    setIsPrimaryOnboarding(false);
    setOnboardingPrefill(null);
    localStorage.removeItem('prayana_auth_authenticated');
    localStorage.removeItem('prayana_auth_user');
    localStorage.removeItem('prayana_travelers');
    localStorage.removeItem('prayana_travelers_initialized');
    setIsPreloaderActive(false);
    setActiveView('AUTH');
  };

  // Active destination selector with rock-solid fallback
  const activeDestination = useMemo(() => {
    return (
      destinations.find(d => d.id === activeDestinationId) ??
      destinations[0] ??
      INITIAL_DESTINATIONS[0]
    );
  }, [destinations, activeDestinationId]);

  // Dynamic route stops
  const [routeStops, setRouteStops] = useState<MonolithStop[]>(() => {
    return activeDestination?.stops ?? INITIAL_DESTINATIONS[0].stops;
  });

  useEffect(() => {
    if (skipNextStopResetRef.current) {
      skipNextStopResetRef.current = false;
      return;
    }
    if (activeDestination?.stops) {
      setRouteStops(activeDestination.stops);
      setActiveStopId(null);
    }
  }, [activeDestinationId, activeDestination]);

  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [hoveredStopId, setHoveredStopId] = useState<string | null>(null);

  // URL Hash Hydration (#trip=...) — supports opening shared dispatches directly in incognito
  useEffect(() => {
    try {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#trip=')) {
        const raw = hash.replace('#trip=', '');
        let decoded: any = null;
        try {
          const base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
          const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
          const binary = atob(padded);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
          }
          decoded = JSON.parse(new TextDecoder().decode(bytes));
        } catch {
          decoded = JSON.parse(decodeURIComponent(atob(raw)));
        }

        const destId = decoded?.d || decoded?.destinationId;
        if (decoded && destId) {
          const targetDest = destinations.find(d => d.id === destId) || destinations[0];
          skipNextStopResetRef.current = true;
          setActiveDestinationId(targetDest.id);

          const stopIds: string[] | undefined = decoded.si || decoded.stopIds;
          const customStopsRaw: any[] = Array.isArray(decoded.cs) ? decoded.cs : [];
          const customById = new Map(customStopsRaw.map((cs: any) => [cs.id, cs]));

          // Reconstruct custom/ordered stops from hash payload
          if (Array.isArray(decoded.stops) && decoded.stops.length > 0 && typeof decoded.stops[0] === 'object') {
            const byId = new Map(targetDest.stops.map(s => [s.id, s]));
            const restoredStops: MonolithStop[] = decoded.stops.map((hs: any, idx: number) => {
              const base = byId.get(hs.id);
              return base
                ? { ...base, ...hs, index: idx + 1 }
                : {
                    id: hs.id || `shared-${idx + 1}`,
                    index: idx + 1,
                    title: hs.title || `Stop ${idx + 1}`,
                    subtitle: hs.subtitle || 'Shared Expedition Stop',
                    elevationDeltaM: hs.elevationDeltaM ?? 15,
                    distanceKm: hs.distanceKm ?? 1.5,
                    slopeDeg: hs.slopeDeg ?? 1.5,
                    effortRating: 'LOW',
                    vibeTag: 'Shared Stop',
                    optimalTime: '09:00 — 10:30',
                    dwellMinutes: 60,
                    description: hs.subtitle || 'Restored from Prayana Dispatch Link',
                    isOutdoor: hs.isOutdoor ?? true,
                    cost: hs.cost ?? 0,
                    isPinned: hs.isPinned ?? false,
                    coords: hs.coords || targetDest.stops[0].coords,
                  };
            });
            setRouteStops(restoredStops);
          } else if (Array.isArray(stopIds) && stopIds.length > 0) {
            const byId = new Map(targetDest.stops.map(s => [s.id, s]));
            const ordered = stopIds
              .map((id: string, idx: number): MonolithStop | undefined => {
                const known = byId.get(id);
                if (known) return { ...known, index: idx + 1 };
                const cs = customById.get(id);
                if (!cs) return undefined;
                return {
                  id: cs.id || `shared-${idx + 1}`,
                  index: idx + 1,
                  title: cs.t || `Stop ${idx + 1}`,
                  subtitle: cs.st || 'Shared Expedition Stop',
                  elevationDeltaM: 15,
                  distanceKm: 1.5,
                  slopeDeg: 1.5,
                  effortRating: 'LOW',
                  vibeTag: 'Shared Stop',
                  optimalTime: '09:00 — 10:30',
                  dwellMinutes: 60,
                  description: cs.st || 'Restored from Prayana Dispatch Link',
                  isOutdoor: cs.o ?? true,
                  cost: cs.c ?? 0,
                  isPinned: cs.p ?? false,
                  coords: cs.co || targetDest.stops[0].coords,
                };
              })
              .filter((s: MonolithStop | undefined): s is MonolithStop => Boolean(s));
            if (ordered.length > 0) {
              setRouteStops(ordered);
            }
          }

          setActiveTrip(prev => ({
            ...prev,
            destinationId: targetDest.id,
            routeTitle: decoded.rt || decoded.routeTitle || targetDest.routeTitle,
            dayIndex: decoded.dy || decoded.dayIndex || prev.dayIndex,
            totalDays: decoded.td || decoded.totalDays || prev.totalDays,
            totalBudget: decoded.tb || decoded.totalBudget || prev.totalBudget,
            budgetSplit: decoded.bs || decoded.budgetSplit || prev.budgetSplit,
          }));

          // Allow viewing shared link directly in incognito without local session
          if (localStorage.getItem('prayana_auth_authenticated') !== 'true') {
            const sharedTravelers = Array.isArray(decoded.tr || decoded.travelers)
              ? (decoded.tr || decoded.travelers).map((t: any, idx: number) => ({
                  id: `shared-tr-${idx + 1}`,
                  name: t.n || t.name || `Traveler ${idx + 1}`,
                  age: 30,
                  isPrimary: idx === 0,
                  restingHeartRate: 68,
                  currentHeartRate: 72,
                  bloodOxygen: 98,
                  fitbandConnected: false,
                  medicalFlags: [],
                  dietaryTags: Array.isArray(t.allergies) ? t.allergies : ['None'],
                  mobility: t.m || 'Moderate',
                  preferredPace: 'Balanced',
                  travelInsuranceId: t.i || t.insurance || 'SHARED-DISPATCH',
                  emergencyContact: { name: 'Cohort Lead', phone: t.ice || '112' },
                }))
              : [];
            if (sharedTravelers.length > 0) {
              setTravelers(sharedTravelers);
              setActiveTravelerId(sharedTravelers[0].id);
            }
            const sharedGuest: AuthUser = {
              uid: 'demo_shared_dispatch',
              email: 'dispatch@prayana.arch',
              displayName: 'Shared Dispatch Viewer',
              isDemo: true,
            };
            setCurrentUser(sharedGuest);
            setIsAuthenticated(true);
            setActiveView('ITINERARY_OUTPUT');
          } else {
            setActiveView('ITINERARY_OUTPUT');
          }
        }
      }
    } catch (e) {
      console.warn('Could not parse trip from hash', e);
    }
  }, []);

  const activeStop = useMemo(() => {
    if (!activeStopId) return null;
    return routeStops.find(s => s.id === activeStopId) || null;
  }, [routeStops, activeStopId]);

  const [activeTrip, setActiveTrip] = useState<ActiveTrip>(() => {
    const saved = localStorage.getItem('prayana_active_trip');
    return saved ? JSON.parse(saved) : INITIAL_ACTIVE_TRIP;
  });

  const [activeMapMode, setActiveMapMode] = useState<MapMode>('NODE_GRAPH');
  const [activeCockpitTab, setActiveCockpitTab] = useState<CockpitTab>('ROUTE_TIMELINE');

  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
    const saved = localStorage.getItem('prayana_expenses');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [rebalanceApplied, setRebalanceApplied] = useState<boolean>(false);
  const [isStormDisrupted, setIsStormDisrupted] = useState<boolean>(false);
  const [placesData, setPlacesData] = useState<PlacesApiResponse | null>(null);
  const [placesLoading, setPlacesLoading] = useState<boolean>(false);

  const diningOptions = useMemo<DiningOption[]>(() => {
    if (!placesData?.dining) return [];
    return placesData.dining.map(p => ({
      id: p.id,
      name: p.name,
      cuisine: p.cuisine,
      distanceKm: p.distance_km,
      costForTwo: p.estimated_cost_for_two,
      dietaryTags: p.osm_verified_tags as any,
      allergenFlags: p.allergen_warnings,
      isVerifiedSafe: p.is_osm_diet_verified && p.allergen_warnings.length === 0,
      rating: 4.5,
      address: p.address,
      kind: p.kind,
      categoryTag: p.category_tag,
      lat: p.lat,
      lon: p.lon,
      isOsmDietVerified: p.is_osm_diet_verified,
      osmVerifiedTags: p.osm_verified_tags,
      heuristicNotes: p.heuristic_notes,
      costSource: p.cost_source,
      source: p.source,
    }));
  }, [placesData]);

  const [isBhashiniDownloaded, setIsBhashiniDownloaded] = useState<boolean>(false);
  const [ocrScanResult, setOcrScanResult] = useState<OcrScanResult | null>(null);

  // Personal Bucket List Wishlist State
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('prayana_wishlist');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return ['hmp-4', 'crg-1', 'kyo-1', 'vns-1'];
  });

  const [isBucketListOpen, setIsBucketListOpen] = useState(false);
  const [isShareHubOpen, setIsShareHubOpen] = useState(false);

  const hasTravelers = travelers.length > 0;
  const activeTraveler = useMemo(() => {
    return (
      travelers.find(t => t.id === activeTravelerId) ??
      travelers[0] ??
      INITIAL_TRAVELERS[0]
    );
  }, [travelers, activeTravelerId]);

  const [liveVitals, setLiveVitals] = useState<VitalsData>(() => {
    return activeTraveler?.vitals ?? INITIAL_TRAVELERS[0].vitals;
  });
  const [isFitbandSimActive, setIsFitbandSimActive] = useState<boolean>(false);
  const [bleConnectedDevice, setBleConnectedDevice] = useState<string | null>(null);
  const [bleHrLocked, setBleHrLocked] = useState<boolean>(false);
  const [bleError, setBleError] = useState<string | null>(null);
  const bleHandleRef = useRef<BleConnectionHandle | null>(null);
  const [weatherSummary, setWeatherSummary] = useState<string | null>(null);
  const [activeAdvisory, setActiveAdvisory] = useState<string | undefined>(undefined);

  const refreshDestinationPlaces = async () => {
    setPlacesLoading(true);
    try {
      const groupTags = Array.from(new Set(travelers.flatMap(t => t.dietaryTags)));
      const foodBudgetPerDay = Math.round(
        (activeTrip.totalBudget * (activeTrip.budgetSplit.food / 100)) /
          Math.max(1, activeTrip.totalDays)
      );
      const res = await fetchDestinationPlaces(
        activeDestinationId,
        groupTags,
        Math.max(800, foodBudgetPerDay)
      );
      setPlacesData(res);
    } finally {
      setPlacesLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshDestinationPlaces();
    }
  }, [activeDestinationId, isAuthenticated]);

  // Fetch live OpenWeather WBGT & evaluate strain whenever destination or vitals update
  useEffect(() => {
    if (!isAuthenticated || travelers.length === 0) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const evalRes = await apiEvaluateVitals({
        travelers: travelers.map(t => ({
          id: t.id,
          name: t.name,
          age: t.age,
          mobility: t.mobility === 'Assisted' ? 'Senior / Reduced Mobility' : t.mobility === 'Wheelchair-Accessible' ? 'Wheelchair-Accessible' : 'Standard',
          cardiac_coeff: t.medicalFlags.includes('Hypertension') ? 0.45 : 0.0,
          respiratory_coeff: t.medicalFlags.includes('Asthma') ? 0.45 : 0.0,
          mobility_coeff: t.mobility === 'Wheelchair-Accessible' ? 0.85 : t.mobility === 'Assisted' ? 0.45 : 0.0,
          hr_bpm: t.id === activeTraveler.id ? liveVitals.heartRate : t.vitals.heartRate,
          spo2: t.id === activeTraveler.id ? liveVitals.spO2 : t.vitals.spO2,
        })),
        ambient_wbgt: liveVitals.ambientWbgt,
        destination_id: activeDestinationId,
      });
      if (!cancelled && evalRes) {
        if (evalRes.weather_summary) {
          setWeatherSummary(evalRes.weather_summary);
        }
        if (typeof evalRes.computed_wbgt === 'number') {
          setLiveVitals(prev =>
            Math.abs(prev.ambientWbgt - evalRes.computed_wbgt!) > 0.2
              ? { ...prev, ambientWbgt: evalRes.computed_wbgt! }
              : prev
          );
        }
        const activeResult = evalRes.results?.find(r => r.traveler_id === activeTraveler.id);
        if (activeResult?.advisory) {
          setActiveAdvisory(activeResult.advisory);
        }
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeDestinationId, isAuthenticated, liveVitals.heartRate, liveVitals.spO2, travelers.length]);

  const totalSpent = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const plannedSpendDay1 = Math.round((activeTrip.totalBudget / activeTrip.totalDays) * activeTrip.dayIndex);
  const netOverspend = totalSpent - plannedSpendDay1;
  const isOverspent = netOverspend > 0;

  useEffect(() => {
    if (activeTraveler?.vitals) {
      setLiveVitals(activeTraveler.vitals);
    }
  }, [activeTravelerId, activeTraveler]);

  useEffect(() => {
    if (activeTraveler && liveVitals) {
      const result = evaluateRealtimeStrain(
        liveVitals.heartRate,
        liveVitals.spO2,
        2.0,
        activeTraveler.mobility,
        activeTraveler.medicalFlags || []
      );
      setActiveAdvisory(result.advisory);
    }
  }, [liveVitals?.heartRate, liveVitals?.spO2, activeTraveler]);

  // Modals state
  const [isVitalsDrawerOpen, setIsVitalsDrawerOpen] = useState(false);
  const [isCopilotDrawerOpen, setIsCopilotDrawerOpen] = useState(false);
  const [isItineraryOpen, setIsItineraryOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [editingTravelerId, setEditingTravelerId] = useState<string | null>(null);

  const reorderRouteStops = (fromIndex: number, toIndex: number) => {
    setRouteStops(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      const normalized = updated.map((s, idx) => ({ ...s, index: idx + 1 }));
      persistTrip(activeTrip, activeUid, { activeDestinationId, routeStops: normalized, rebalanceApplied });
      return normalized;
    });
  };

  const updateRouteStop = (id: string, updates: Partial<MonolithStop>) => {
    setRouteStops(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...updates } : s);
      persistTrip(activeTrip, activeUid, { activeDestinationId, routeStops: next, rebalanceApplied });
      return next;
    });
  };

  const removeRouteStop = (id: string) => {
    setRouteStops(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.filter(s => s.id !== id).map((s, idx) => ({ ...s, index: idx + 1 }));
      persistTrip(activeTrip, activeUid, { activeDestinationId, routeStops: next, rebalanceApplied });
      return next;
    });
    if (activeStopId === id) {
      setActiveStopId(null);
    }
  };

  const insertStopIntoRoute = (stop: MonolithStop) => {
    setRouteStops(prev => {
      if (prev.some(s => s.id === stop.id)) return prev;
      const nextIndex = prev.length + 1;
      const next = [...prev, { ...stop, index: nextIndex }];
      persistTrip(activeTrip, activeUid, { activeDestinationId, routeStops: next, rebalanceApplied });
      return next;
    });
  };

  const optimizeActiveRoute = async (): Promise<{ solverStatus: string; solveTimeMs: number } | null> => {
    if (routeStops.length < 2) return null;

    const mapMobility = (m: MobilityLevel): string => {
      if (m === 'Wheelchair-Accessible') return 'Wheelchair-Accessible';
      if (m === 'Assisted') return 'Senior / Reduced Mobility';
      return 'Standard';
    };

    const payload = {
      travelers: travelers.map(t => {
        const vec = extractHeuristicVector(t);
        return {
          id: t.id,
          name: t.name,
          age: t.age,
          mobility: mapMobility(t.mobility),
          cardiac_coeff: vec.c_card,
          respiratory_coeff: vec.c_resp,
          mobility_coeff: vec.c_mob,
          alpha_k: t.vitals.strainLevel === 'ELEVATED' ? 1.6 : t.vitals.strainLevel === 'MODERATE' ? 1.3 : 1.0,
          beta_k: vec.beta,
          hr_bpm: t.vitals.heartRate,
          spo2: t.vitals.spO2,
          strain_level: t.vitals.strainLevel,
        };
      }),
      poi_candidates: routeStops.map(s => ({
        id: s.id,
        name: s.title,
        lat: s.coords?.lat ?? 15.335,
        lon: s.coords?.lng ?? 76.46,
        distance_km: s.distanceKm,
        elevation_gain_m: s.elevationDeltaM,
        slope_deg: s.slopeDeg,
        wbgt_celsius: liveVitals.ambientWbgt,
        is_indoor: !s.isOutdoor,
        is_pinned: Boolean(s.isPinned),
      })),
      max_daily_effort: 8.0,
      pinned_stop_ids: routeStops.filter(s => s.isPinned).map(s => s.id),
    };

    const resp = await apiOptimizeRoute(payload);
    if (resp && resp.ordered_stops?.length > 0) {
      setRouteStops(prev => {
        const byId = new Map(prev.map(s => [s.id, s]));
        const reordered = resp.ordered_stops
          .map(o => byId.get(o.id))
          .filter((s): s is MonolithStop => Boolean(s));
        // Keep any trailing stops not returned by solver just in case
        const included = new Set(reordered.map(s => s.id));
        const remainder = prev.filter(s => !included.has(s.id));
        return [...reordered, ...remainder].map((s, idx) => ({ ...s, index: idx + 1 }));
      });
      return { solverStatus: resp.solver_status, solveTimeMs: resp.solve_time_ms };
    }

    // Local deterministic fallback ordering (low slope/effort first)
    setRouteStops(prev =>
      [...prev]
        .sort((a, b) => (a.isPinned === b.isPinned ? a.slopeDeg - b.slopeDeg : a.isPinned ? -1 : 1))
        .map((s, idx) => ({ ...s, index: idx + 1 }))
    );
    return { solverStatus: 'LOCAL_FALLBACK', solveTimeMs: 1 };
  };

  const toggleWishlist = (stopId: string) => {
    setWishlistIds(prev => {
      const next = prev.includes(stopId) ? prev.filter(id => id !== stopId) : [...prev, stopId];
      persistWishlist(next, activeUid);
      return next;
    });
  };

  const addExpense = (expense: Omit<ExpenseItem, 'id' | 'timestamp'>) => {
    const newItem: ExpenseItem = {
      ...expense,
      id: `exp-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setExpenses(prev => {
      const next = [newItem, ...prev];
      persistExpenses(next, activeUid);
      return next;
    });
  };

  const compensatoryRebalance = async () => {
    setRebalanceApplied(true);
    let updatedStopsSnapshot: MonolithStop[] = routeStops;
    setRouteStops(prev => {
      const mapped = prev.map(stop => {
        if (stop.cost > 0 && !stop.isPinned) {
          return {
            ...stop,
            title: `${stop.title} (Scenic Free Vantage)`,
            subtitle: 'Compensatory Zero-Cost Vantage',
            cost: 0,
            vibeTag: 'Free Scenic Vantage',
          };
        }
        return stop;
      });
      updatedStopsSnapshot = mapped;
      return mapped;
    });

    try {
      const resp = await apiRebalanceBudget({
        total_budget: activeTrip.totalBudget,
        expenses: expenses.map(e => ({
          id: e.id,
          category: e.category === 'activitiesAndBuffer' ? 'activities' : e.category,
          amount: e.amount,
          label: e.description,
        })),
        days_remaining: Math.max(1, activeTrip.totalDays - activeTrip.dayIndex),
        days_total: activeTrip.totalDays,
      });
      if (resp && resp.updated_targets) {
        const { stays, food, transit, activities } = resp.updated_targets;
        const totalRemainingDaily = Math.max(1, stays + food + transit + activities);
        const staysPct = Math.round((stays / totalRemainingDaily) * 100);
        const foodPct = Math.round((food / totalRemainingDaily) * 100);
        const transitPct = Math.round((transit / totalRemainingDaily) * 100);
        const actPct = Math.max(0, 100 - staysPct - foodPct - transitPct);

        setActiveTrip(prev => {
          const next: ActiveTrip = {
            ...prev,
            budgetSplit: {
              stays: staysPct,
              food: foodPct,
              transit: transitPct,
              activitiesAndBuffer: actPct,
            },
            rebalanceTargets: resp.updated_targets,
            recommendedSwaps: resp.recommended_swaps,
          };
          persistTrip(next, activeUid, {
            activeDestinationId,
            routeStops: updatedStopsSnapshot,
            rebalanceApplied: true,
          });
          return next;
        });
        return;
      }
    } catch (err) {
      console.warn('[Prayana API] Budget rebalance fallback', err);
    }

    setActiveTrip(prev => {
      const next = {
        ...prev,
        budgetSplit: {
          stays: 35,
          food: 23,
          transit: 20,
          activitiesAndBuffer: 22,
        },
      };
      persistTrip(next, activeUid, {
        activeDestinationId,
        routeStops: updatedStopsSnapshot,
        rebalanceApplied: true,
      });
      return next;
    });
  };

  const toggleStormDisruption = () => {
    setIsStormDisrupted(prev => {
      const next = !prev;
      if (next) {
        setRouteStops(current => {
          return current.map(stop => {
            if (stop.isOutdoor) {
              return {
                ...stop,
                title: stop.id === 'hmp-8' ? 'Archaeological Museum Indoor Gallery' : `${stop.title} (Indoor Arcades)`,
                subtitle: 'Weather-Protected Heritage Sanctuary',
                isOutdoor: false,
                slopeDeg: Math.min(stop.slopeDeg, 1.0),
                dwellMinutes: stop.dwellMinutes + 20,
                description: `Rerouted due to severe weather. Sheltered granite vaulted pavilion protecting travelers from rain and thermal stress.`,
              };
            }
            return stop;
          });
        });
      } else {
        setRouteStops(activeDestination.stops);
      }
      return next;
    });
  };

  const downloadBhashiniPack = () => {
    setIsBhashiniDownloaded(true);
  };

  const runOcrScan = async (
    input?: { imageFile?: File | null; sampleText?: string } | string
  ): Promise<OcrScanResult> => {
    const imageFile = typeof input === 'object' && input !== null ? input.imageFile ?? null : null;
    const sampleText =
      typeof input === 'string'
        ? input
        : typeof input === 'object' && input !== null
        ? input.sampleText || ''
        : '';

    const declaredAllergens = Array.from(
      new Set(
        travelers.flatMap(t => [
          ...t.dietaryTags,
          ...(t.customDietaryKeywords || []).map(kw => `kw:${kw}`),
        ])
      )
    );

    const mandatoryDisclaimer =
      'No automated OCR check can guarantee zero allergen presence. Regional dish names, hidden sauces, or kitchen cross-contact may be missed — always verify directly with restaurant staff before eating.';

    // Always invoke FastAPI Tesseract OCR endpoint when uploading a real photo or checking live API
    try {
      const apiRes = await apiScanMenuOCR(imageFile, sampleText || undefined, declaredAllergens);
      if (apiRes) {
        const result: OcrScanResult = {
          status: apiRes.result === 'HAZARD_ALERT' ? 'HAZARD_ALERT' : 'NO_MATCH_DETECTED',
          matchedAllergens: apiRes.matched_allergens || [],
          rawExtractedText: apiRes.raw_text_preview || sampleText.trim() || '[NO TEXT EXTRACTED FROM IMAGE]',
          confidence: apiRes.confidence,
          disclaimer: apiRes.disclaimer || mandatoryDisclaimer,
        };
        setOcrScanResult(result);
        return result;
      }
    } catch (err) {
      console.warn('[Prayana API] OCR scan call failed:', err);
    }

    // If an image upload failed to reach the OCR server, surface an explicit OCR unavailability notice instead of faking extraction
    if (imageFile) {
      const errResult: OcrScanResult = {
        status: 'NO_MATCH_DETECTED',
        matchedAllergens: [],
        rawExtractedText:
          'Unable to reach FastAPI Tesseract OCR backend (/api/v1/ocr/scan-menu) for image decoding. Check API connectivity or paste menu text below.',
        confidence: 0,
        disclaimer: mandatoryDisclaimer,
      };
      setOcrScanResult(errResult);
      return errResult;
    }

    const textToScan = sampleText.trim();
    const allergenKeywords: { [key: string]: string[] } = {
      'Shellfish Allergy': ['prawn', 'shrimp', 'crab', 'lobster', 'shellfish', 'fish', 'seafood'],
      'Nut Allergy': ['peanut', 'cashew', 'kaju', 'almond', 'badam', 'walnut', 'pistachio', 'nut', 'nuts', 'peanuf'],
      'Gluten-Free': ['wheat', 'maida', 'flour', 'roti', 'paratha', 'bread', 'naan', 'semolina', 'rava'],
    };

    const words = textToScan.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    const matchedAllergens: string[] = [];

    for (const [allergenName, keywords] of Object.entries(allergenKeywords)) {
      if (declaredAllergens.includes(allergenName as any)) {
        for (const kw of keywords) {
          for (const word of words) {
            if (word.includes(kw) || kw.includes(word)) {
              if (!matchedAllergens.includes(allergenName)) {
                matchedAllergens.push(allergenName);
              }
              break;
            }
            const dist = computeLevenshtein(word, kw);
            const normDist = dist / Math.max(word.length, kw.length);
            if (normDist <= 0.20) {
              if (!matchedAllergens.includes(allergenName)) {
                matchedAllergens.push(allergenName);
              }
              break;
            }
          }
        }
      }
    }

    const result: OcrScanResult = {
      status: matchedAllergens.length > 0 ? 'HAZARD_ALERT' : 'NO_MATCH_DETECTED',
      matchedAllergens,
      rawExtractedText: textToScan,
      confidence: 0.94,
      disclaimer: mandatoryDisclaimer,
    };

    setOcrScanResult(result);
    return result;
  };

  const nextDestination = () => {
    const currentIndex = destinations.findIndex(d => d.id === activeDestinationId);
    const nextIdx = (currentIndex + 1) % destinations.length;
    setActiveDestinationId(destinations[nextIdx].id);
  };

  const prevDestination = () => {
    const currentIndex = destinations.findIndex(d => d.id === activeDestinationId);
    const prevIdx = (currentIndex - 1 + destinations.length) % destinations.length;
    setActiveDestinationId(destinations[prevIdx].id);
  };

  const computeEffortStrain = (hr: number, slopeDeg: number, mobility: string): StrainLevel => {
    const result = evaluateRealtimeStrain(hr, 98, slopeDeg, mobility, activeTraveler.medicalFlags);
    return result.strainLevel;
  };

  const updateLiveHr = (bpm: number) => {
    setLiveVitals(prev => {
      const evaluation = evaluateRealtimeStrain(
        bpm, 
        prev.spO2, 
        2.0, 
        activeTraveler.mobility, 
        activeTraveler.medicalFlags
      );
      const updated: VitalsData = {
        ...prev,
        heartRate: bpm,
        strainLevel: evaluation.strainLevel,
        lastSync: 'just now',
      };
      setTravelers(current => 
        current.map(t => t.id === activeTravelerId ? { ...t, vitals: updated } : t)
      );
      return updated;
    });
  };

  const updateLiveSpO2 = (spO2: number) => {
    setLiveVitals(prev => {
      const evaluation = evaluateRealtimeStrain(
        prev.heartRate, 
        spO2, 
        2.0, 
        activeTraveler.mobility, 
        activeTraveler.medicalFlags
      );
      const updated: VitalsData = {
        ...prev,
        spO2,
        strainLevel: evaluation.strainLevel,
        lastSync: 'just now',
      };
      setTravelers(current => 
        current.map(t => t.id === activeTravelerId ? { ...t, vitals: updated } : t)
      );
      return updated;
    });
  };

  const updateLiveSteps = (steps: number) => {
    setLiveVitals(prev => {
      const updated: VitalsData = { ...prev, steps, lastSync: 'just now' };
      setTravelers(current => 
        current.map(t => t.id === activeTravelerId ? { ...t, vitals: updated } : t)
      );
      return updated;
    });
  };

  const updateLiveWbgt = (wbgt: number) => {
    setLiveVitals(prev => {
      const updated: VitalsData = { ...prev, ambientWbgt: wbgt, lastSync: 'just now' };
      setTravelers(current => 
        current.map(t => t.id === activeTravelerId ? { ...t, vitals: updated } : t)
      );
      return updated;
    });
  };

  const updateTraveler = (id: string, updates: Partial<TravelerProfile>) => {
    setTravelers(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      persistProfiles(next, activeUid, activeTravelerId);
      return next;
    });
  };

  const addTraveler = (traveler: TravelerProfile) => {
    setTravelers(prev => {
      const next = [...prev, traveler];
      const nextActive = prev.length === 0 ? traveler.id : activeTravelerId;
      if (prev.length === 0) setActiveTravelerId(traveler.id);
      persistProfiles(next, activeUid, nextActive);
      return next;
    });
  };

  const deleteTraveler = (id: string) => {
    setTravelers(prev => {
      const next = prev.filter(t => t.id !== id);
      const nextActive = activeTravelerId === id ? (next[0]?.id ?? '') : activeTravelerId;
      if (activeTravelerId === id) {
        setActiveTravelerId(nextActive);
      }
      persistProfiles(next, activeUid, nextActive);
      return next;
    });
  };

  const loadSampleCohort = () => {
    setTravelers(INITIAL_TRAVELERS);
    const firstId = INITIAL_TRAVELERS[0]?.id ?? '';
    setActiveTravelerId(firstId);
    persistProfiles(INITIAL_TRAVELERS, activeUid, firstId);
  };

  const pairBluetoothFitband = async (travelerId?: string) => {
    const targetId = travelerId || activeTraveler.id;
    setBleError(null);
    bleHandleRef.current?.disconnect();
    try {
      const handle = await connectBleHeartRateDevice(
        (bpm, deviceName) => {
          setBleConnectedDevice(deviceName);
          setIsFitbandSimActive(false);
          setLiveVitals(prev => {
            const evaluation = evaluateRealtimeStrain(
              bpm,
              prev.spO2,
              2.0,
              activeTraveler.mobility,
              activeTraveler.medicalFlags
            );
            const updated: VitalsData = {
              ...prev,
              heartRate: bpm,
              strainLevel: evaluation.strainLevel,
              lastSync: `BLE (${deviceName})`,
            };
            setTravelers(current => {
              const next = current.map(t =>
                t.id === targetId
                  ? {
                      ...t,
                      fitbandConnected: true,
                      wearableStatus: 'BLE_CONNECTED' as const,
                      bleDeviceName: deviceName,
                      vitals: updated,
                    }
                  : t
              );
              persistProfiles(next, activeUid, activeTravelerId);
              return next;
            });
            return updated;
          });
        },
        () => {
          setBleConnectedDevice(null);
          bleHandleRef.current = null;
          setTravelers(current => {
            const next = current.map(t =>
              t.id === targetId
                ? { ...t, fitbandConnected: false, wearableStatus: 'UNPAIRED' as const, bleDeviceName: undefined }
                : t
            );
            persistProfiles(next, activeUid, activeTravelerId);
            return next;
          });
        }
      );
      bleHandleRef.current = handle;
      setBleConnectedDevice(handle.deviceName);
      setIsFitbandSimActive(false);
      if (handle.status === 'BLE_PROPRIETARY_LOCKED') {
        setBleHrLocked(true);
        updateTraveler(targetId, {
          fitbandConnected: false,
          wearableStatus: 'BLE_LOCKED',
          bleDeviceName: handle.deviceName,
        });
      } else {
        setBleHrLocked(false);
        updateTraveler(targetId, {
          fitbandConnected: true,
          wearableStatus: 'BLE_CONNECTED',
          bleDeviceName: handle.deviceName,
        });
      }
    } catch (err: any) {
      setBleError(err?.message || 'Bluetooth pairing failed');
    }
  };

  const disconnectBluetoothFitband = (travelerId?: string) => {
    const targetId = travelerId || activeTraveler.id;
    bleHandleRef.current?.disconnect();
    bleHandleRef.current = null;
    setBleConnectedDevice(null);
    setBleHrLocked(false);
    updateTraveler(targetId, {
      fitbandConnected: false,
      wearableStatus: 'UNPAIRED',
      bleDeviceName: undefined,
    });
  };

  const toggleSimulatorMode = (enabled: boolean, travelerId?: string) => {
    const targetId = travelerId || activeTraveler.id;
    if (enabled && bleHandleRef.current) {
      bleHandleRef.current.disconnect();
      bleHandleRef.current = null;
      setBleConnectedDevice(null);
    }
    setIsFitbandSimActive(enabled);
    setBleError(null);
    if (travelers.some(t => t.id === targetId)) {
      updateTraveler(targetId, {
        fitbandConnected: false,
        wearableStatus: enabled ? 'SIMULATED' : 'UNPAIRED',
        bleDeviceName: enabled ? 'MANUAL_SIMULATOR' : undefined,
      });
    }
  };

  const updateActiveTrip = (tripUpdates: Partial<ActiveTrip>) => {
    setActiveTrip(prev => {
      const next = { ...prev, ...tripUpdates };
      persistTrip(next, activeUid, {
        activeDestinationId: next.destinationId,
        routeStops,
        rebalanceApplied,
      });
      return next;
    });
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCopilotDrawerOpen(prev => !prev);
        return;
      }

      if (e.key === 'Escape') {
        setIsVitalsDrawerOpen(false);
        setIsCopilotDrawerOpen(false);
        setIsItineraryOpen(false);
        setIsWizardOpen(false);
        setIsIntakeModalOpen(false);
        setIsBucketListOpen(false);
        setIsShareHubOpen(false);
        setActiveStopId(null);
        return;
      }

      if (
        activeView === 'GALLERY_HOME' &&
        !isVitalsDrawerOpen && 
        !isCopilotDrawerOpen && 
        !isItineraryOpen && 
        !isWizardOpen &&
        !isIntakeModalOpen &&
        !isBucketListOpen &&
        !isShareHubOpen
      ) {
        if (e.key === 'ArrowRight') {
          nextDestination();
        } else if (e.key === 'ArrowLeft') {
          prevDestination();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDestinationId, activeView, isVitalsDrawerOpen, isCopilotDrawerOpen, isItineraryOpen, isWizardOpen, isIntakeModalOpen, isBucketListOpen, isShareHubOpen]);

  return (
    <PrayanaContext.Provider
      value={{
        activeView,
        setActiveView,

        currentUser,
        isAuthenticated,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        demoBypass,
        logoutUser,

        isPreloaderActive,
        setIsPreloaderActive,

        theme,
        toggleTheme,

        travelers,
        hasTravelers,
        activeTravelerId,
        activeTraveler,
        setActiveTravelerId,
        updateTraveler,
        addTraveler,
        deleteTraveler,
        loadSampleCohort,

        destinations,
        activeDestinationId,
        activeDestination,
        setActiveDestinationId,
        nextDestination,
        prevDestination,

        routeStops,
        setRouteStops,
        reorderRouteStops,
        updateRouteStop,
        removeRouteStop,
        insertStopIntoRoute,
        activeStopId,
        setActiveStopId,
        activeStop,
        hoveredStopId,
        setHoveredStopId,

        activeTrip,
        updateActiveTrip,

        activeMapMode,
        setActiveMapMode,
        activeCockpitTab,
        setActiveCockpitTab,

        expenses,
        addExpense,
        isOverspent,
        netOverspend,
        compensatoryRebalance,
        rebalanceApplied,

        isStormDisrupted,
        toggleStormDisruption,

        diningOptions,
        placesData,
        placesLoading,
        refreshDestinationPlaces,

        isBhashiniDownloaded,
        downloadBhashiniPack,
        ocrScanResult,
        runOcrScan,

        wishlistIds,
        toggleWishlist,
        isBucketListOpen,
        setIsBucketListOpen,

        isShareHubOpen,
        setIsShareHubOpen,

        liveVitals,
        setLiveVitals,
        isFitbandSimActive,
        setIsFitbandSimActive,
        bleConnectedDevice,
        bleHrLocked,
        bleError,
        pairBluetoothFitband,
        disconnectBluetoothFitband,
        toggleSimulatorMode,
        weatherSummary,
        updateLiveHr,
        updateLiveSpO2,
        updateLiveSteps,
        updateLiveWbgt,
        activeAdvisory,

        isVitalsDrawerOpen,
        setIsVitalsDrawerOpen,
        isCopilotDrawerOpen,
        setIsCopilotDrawerOpen,
        isItineraryOpen,
        setIsItineraryOpen,
        isWizardOpen,
        setIsWizardOpen,
        isIntakeModalOpen,
        setIsIntakeModalOpen,
        isPrimaryOnboarding,
        setIsPrimaryOnboarding,
        onboardingPrefill,
        setOnboardingPrefill,
        editingTravelerId,
        setEditingTravelerId,

        computeEffortStrain,

        apiStatus,
        refreshApiStatus,
        optimizeActiveRoute,
      }}
    >
      {children}
    </PrayanaContext.Provider>
  );
};

export const usePrayana = () => {
  const context = useContext(PrayanaContext);
  if (!context) {
    throw new Error('usePrayana must be used within a PrayanaProvider');
  }
  return context;
};
