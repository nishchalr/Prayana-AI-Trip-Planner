import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
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
  INITIAL_EXPENSES,
  INITIAL_DINING_OPTIONS 
} from '../data/mockData';
import { 
  evaluateRealtimeStrain, 
  computeTravelerSegmentPenalty 
} from '../services/googleHealthService';
import { 
  persistProfiles, 
  persistTrip, 
  persistWishlist, 
  fetchWishlist,
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
  scanMenuOCR as apiScanMenuOCR
} from '../services/apiClient';

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

  travelers: TravelerProfile[];
  activeTravelerId: string;
  activeTraveler: TravelerProfile;
  setActiveTravelerId: (id: string) => void;
  updateTraveler: (id: string, updates: Partial<TravelerProfile>) => void;
  addTraveler: (traveler: TravelerProfile) => void;
  deleteTraveler: (id: string) => void;

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

  // Dining
  diningOptions: DiningOption[];

  // Offline Bhashini Language Pack & OCR Scanner
  isBhashiniDownloaded: boolean;
  downloadBhashiniPack: () => void;
  ocrScanResult: OcrScanResult | null;
  runOcrScan: (sampleText?: string) => OcrScanResult;

  // Personal Bucket List
  wishlistIds: string[];
  toggleWishlist: (stopId: string) => void;
  isBucketListOpen: boolean;
  setIsBucketListOpen: (open: boolean) => void;

  // Offline Archival Share Hub Modal
  isShareHubOpen: boolean;
  setIsShareHubOpen: (open: boolean) => void;

  // Live Wearable Telemetry & Simulator
  liveVitals: VitalsData;
  setLiveVitals: React.Dispatch<React.SetStateAction<VitalsData>>;
  isFitbandSimActive: boolean;
  setIsFitbandSimActive: (active: boolean) => void;
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
    const saved = localStorage.getItem('prayana_travelers');
    return saved ? JSON.parse(saved) : INITIAL_TRAVELERS;
  });

  const [activeTravelerId, setActiveTravelerId] = useState<string>('traveler-1');

  const [destinations] = useState<Destination[]>(INITIAL_DESTINATIONS);
  const [activeDestinationId, setActiveDestinationId] = useState<string>('hampi');

  // Firebase Auth Handlers
  const loginWithEmail = async (email: string, pass: string) => {
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
    const user = await signUpWithEmail(email, pass, name);
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('prayana_auth_authenticated', 'true');

    // Create personalized Traveler Profile for newly registered explorer
    const newTraveler: TravelerProfile = {
      id: `traveler-${Date.now()}`,
      name: name.trim() || 'Traveler',
      age: Number(age) || 30,
      mobility: mobility,
      medicalFlags: [],
      dietaryTags: ['Pure Vegetarian'],
      vibeProfile: 'Architectural Explorer & Cultural Heritage Aficionado',
      crowdTolerance: 'Moderate / Standard',
      pacingPreference: mobility === 'Wheelchair-Accessible' ? 'Slow & Restful' : 'Balanced',
      fitbandConnected: true,
      vitals: {
        heartRate: 72,
        spO2: 99,
        steps: 1250,
        strainLevel: 'LOW',
        ambientWbgt: 24.2,
        lastSync: 'JUST NOW',
      },
      travelInsuranceId: `PRY-POL-${Math.floor(100000 + Math.random() * 900000)}`,
      emergencyContact: {
        name: 'Primary Cohort Contact',
        relation: 'Kin',
        phone: '+91 98450 11223',
      },
    };

    setTravelers(prev => {
      const next = [newTraveler, ...prev];
      persistProfiles(next, user.uid);
      return next;
    });
    setActiveTravelerId(newTraveler.id);

    setIsPreloaderActive(true);
    setActiveView('GALLERY_HOME');
  };

  const loginWithGoogle = async () => {
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
    setIsPreloaderActive(true);
    setActiveView('GALLERY_HOME');
  };

  const logoutUser = async () => {
    await signOutUser();
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('prayana_auth_authenticated');
    localStorage.removeItem('prayana_auth_user');
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
    if (activeDestination?.stops) {
      setRouteStops(activeDestination.stops);
      setActiveStopId(null);
    }
  }, [activeDestinationId, activeDestination]);

  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [hoveredStopId, setHoveredStopId] = useState<string | null>(null);

  // URL Hash Hydration (#trip=...)
  useEffect(() => {
    try {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#trip=')) {
        const raw = hash.replace('#trip=', '');
        const decoded = JSON.parse(decodeURIComponent(atob(raw)));
        if (decoded && decoded.destinationId) {
          setActiveDestinationId(decoded.destinationId);
          if (decoded.totalDays) {
            setActiveTrip(prev => ({
              ...prev,
              destinationId: decoded.destinationId,
              totalDays: decoded.totalDays,
              totalBudget: decoded.totalBudget || prev.totalBudget,
            }));
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
  const [activeCockpitTab, setActiveCockpitTab] = useState<CockpitTab>('BUDGET');

  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
    const saved = localStorage.getItem('prayana_expenses');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [rebalanceApplied, setRebalanceApplied] = useState<boolean>(false);
  const [isStormDisrupted, setIsStormDisrupted] = useState<boolean>(false);
  const [diningOptions] = useState<DiningOption[]>(INITIAL_DINING_OPTIONS);

  const [isBhashiniDownloaded, setIsBhashiniDownloaded] = useState<boolean>(false);
  const [ocrScanResult, setOcrScanResult] = useState<OcrScanResult | null>(null);

  // Personal Bucket List Wishlist State
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('prayana_wishlist');
    return saved ? JSON.parse(saved) : ['hmp-4', 'crg-1', 'kyo-1', 'vns-1'];
  });

  const [isBucketListOpen, setIsBucketListOpen] = useState(false);
  const [isShareHubOpen, setIsShareHubOpen] = useState(false);

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
  const [isFitbandSimActive, setIsFitbandSimActive] = useState<boolean>(true);
  const [activeAdvisory, setActiveAdvisory] = useState<string | undefined>(undefined);

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
      return updated.map((s, idx) => ({ ...s, index: idx + 1 }));
    });
  };

  const updateRouteStop = (id: string, updates: Partial<MonolithStop>) => {
    setRouteStops(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeRouteStop = (id: string) => {
    setRouteStops(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter(s => s.id !== id).map((s, idx) => ({ ...s, index: idx + 1 }));
    });
    if (activeStopId === id) {
      setActiveStopId(null);
    }
  };

  const insertStopIntoRoute = (stop: MonolithStop) => {
    setRouteStops(prev => {
      if (prev.some(s => s.id === stop.id)) return prev;
      const nextIndex = prev.length + 1;
      return [...prev, { ...stop, index: nextIndex }];
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
      travelers: travelers.map(t => ({
        id: t.id,
        name: t.name,
        age: t.age,
        mobility: mapMobility(t.mobility),
        cardiac_coeff: t.medicalFlags.includes('Hypertension') ? 0.45 : 0.0,
        respiratory_coeff: t.medicalFlags.includes('Asthma') ? 0.45 : 0.0,
        mobility_coeff: t.mobility === 'Wheelchair-Accessible' ? 0.8 : t.mobility === 'Assisted' ? 0.35 : 0.0,
        alpha_k: t.vitals.strainLevel === 'ELEVATED' ? 1.6 : t.vitals.strainLevel === 'MODERATE' ? 1.3 : 1.0,
        beta_k: 0.05,
        hr_bpm: t.vitals.heartRate,
        spo2: t.vitals.spO2,
        strain_level: t.vitals.strainLevel,
      })),
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
      persistWishlist(next);
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
      localStorage.setItem('prayana_expenses', JSON.stringify(next));
      return next;
    });
  };

  const compensatoryRebalance = async () => {
    setRebalanceApplied(true);
    setRouteStops(prev => {
      return prev.map(stop => {
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
    });

    if (apiStatus === 'LIVE') {
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
            persistTrip(next);
            return next;
          });
          return;
        }
      } catch (err) {
        console.warn('[Prayana API] Budget rebalance fallback', err);
      }
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
      persistTrip(next);
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

  const runOcrScan = (sampleText?: string): OcrScanResult => {
    const textToScan = sampleText || `
HOTEL TUNGABHADRA DELUXE SPECIALS:
1. MASALA DOSA W/ COCONUT CHUTNEY
2. STEAMED IDLI & MEDU VADA
3. CASHEW NUT PULAO (KAJU RICE)
4. TIGER PRAWN SUKKA (COASTAL SPECIAL)
5. BADAM KHEER W/ CRUSHED PEANUTS
    `;

    const declaredAllergens = Array.from(
      new Set(
        travelers.flatMap(t => 
          t.dietaryTags.filter(d => d.includes('Allergy') || d === 'Gluten-Free')
        )
      )
    );

    // Call live FastAPI OCR service asynchronously if online
    if (apiStatus === 'LIVE') {
      apiScanMenuOCR(null, textToScan, declaredAllergens).then(apiRes => {
        if (apiRes) {
          setOcrScanResult({
            status: apiRes.result === 'HAZARD_ALERT' ? 'HAZARD_ALERT' : 'NO_MATCH_DETECTED',
            matchedAllergens: apiRes.matched_allergens,
            rawExtractedText: apiRes.raw_text_preview || textToScan.trim(),
            confidence: apiRes.confidence,
            disclaimer: apiRes.disclaimer,
          });
        }
      }).catch(err => {
        console.warn('[Prayana API] OCR scan fallback', err);
      });
    }

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

    const mandatoryDisclaimer = 'No configured allergen keyword was detected in the scanned text. OCR can miss hidden ingredients, regional synonyms, or kitchen cross-contact — always verify with restaurant staff before eating.';

    const result: OcrScanResult = {
      status: matchedAllergens.length > 0 ? 'HAZARD_ALERT' : 'NO_MATCH_DETECTED',
      matchedAllergens,
      rawExtractedText: textToScan.trim(),
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
      persistProfiles(next);
      return next;
    });
  };

  const addTraveler = (traveler: TravelerProfile) => {
    setTravelers(prev => {
      const next = [...prev, traveler];
      persistProfiles(next);
      return next;
    });
  };

  const deleteTraveler = (id: string) => {
    setTravelers(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.filter(t => t.id !== id);
      persistProfiles(next);
      if (activeTravelerId === id) {
        setActiveTravelerId(next[0].id);
      }
      return next;
    });
  };

  const updateActiveTrip = (tripUpdates: Partial<ActiveTrip>) => {
    setActiveTrip(prev => {
      const next = { ...prev, ...tripUpdates };
      persistTrip(next);
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

        travelers,
        activeTravelerId,
        activeTraveler,
        setActiveTravelerId,
        updateTraveler,
        addTraveler,
        deleteTraveler,

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
