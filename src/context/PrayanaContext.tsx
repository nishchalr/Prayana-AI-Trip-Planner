import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  TravelerProfile, 
  ConnectedFriend,
  FriendInvite,
  MobilityLevel,
  Destination, 
  ActiveTrip, 
  VitalsData, 
  StrainLevel, 
  MonolithStop,
  AppView,
  ExpenseItem,
  DiningOption,
  DiningReservation,
  StayReservation,
  CockpitTab,
  MapMode,
  OcrScanResult,
  TripInvite,
  SharedTrip,
  CommunityAlert,
} from '../types';
import {
  distributeStopsAcrossDays,
  recalculateDayTimings,
} from '../utils/multiDayUtils';
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
  clearLegacyGlobalCache,
  clearDemoCache,
  readUserCache,
  AuthUser,
  computeAgeFromDob,
  sanitizeUsername,
  claimUsernameAndUpdateRoot,
  lookupUserByUsername,
  sendFriendInvite,
  respondToFriendInvite,
  cancelFriendInvite,
  saveConnectedFriend,
  subscribeToFriendNetwork,
  normalizeFriendProfileSnapshot,
  unfriendConnection as firebaseUnfriendConnection,
  fetchFriendProfilesList,
  subscribeToFriendships,
  ensureFriendshipDoc,
  sendTripInvite,
  respondToTripInvite,
  subscribeToTripInvites,
  saveSharedTrip,
  subscribeToSharedTrips,
  requestTripEditAccess,
  grantTripEditAccess,
  publishCommunityAlert,
  subscribeToCommunityAlerts,
} from '../services/firebase';
import {
  checkApiHealth,
  optimizeRoute as apiOptimizeRoute,
  rebalanceBudget as apiRebalanceBudget,
  scanMenuOCR as apiScanMenuOCR,
  evaluateVitals as apiEvaluateVitals,
  fetchDestinationPlaces,
  PlacesApiResponse,
  fetchDestinationAdvisories,
  DestinationAdvisoriesResponse,
} from '../services/apiClient';
import {
  connectBleHeartRateDevice,
  tryReconnectPermittedBleDevice,
  BleConnectionHandle
} from '../services/bleHealthService';

interface PrayanaContextType {
  activeView: AppView;
  setActiveView: (view: AppView) => void;

  // Firebase Auth State & Methods
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
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
  primarySelfProfile: TravelerProfile | null;
  hasTravelers: boolean;
  activeTravelerId: string;
  activeTraveler: TravelerProfile;
  setActiveTravelerId: (id: string) => void;
  updateTraveler: (id: string, updates: Partial<TravelerProfile>) => void;
  addTraveler: (traveler: TravelerProfile) => void;
  deleteTraveler: (id: string) => void;
  loadSampleCohort: () => void;

  // Friend Network (@username Invites & Connected Friends)
  connectedFriends: ConnectedFriend[];
  incomingInvites: FriendInvite[];
  outgoingInvites: FriendInvite[];
  intakeMode: 'MANUAL' | 'CONNECT';
  setIntakeMode: (mode: 'MANUAL' | 'CONNECT') => void;
  registerPrimarySelfProfile: (
    profile: Omit<TravelerProfile, 'id'> & { username: string; dob: string },
    editingId?: string | null
  ) => Promise<void>;
  lookupUsernameHandle: (
    username: string
  ) => Promise<{ uid: string; username: string; displayName: string } | null>;
  sendInviteByUsername: (username: string) => Promise<FriendInvite>;
  acceptFriendInvite: (invite: FriendInvite) => Promise<void>;
  declineFriendInvite: (invite: FriendInvite) => Promise<void>;
  cancelOutgoingInvite: (inviteId: string) => Promise<void>;
  unfriendConnection: (friendUid: string) => Promise<void>;
  addConnectedFriendToCohort: (friend: ConnectedFriend, specificProfile?: TravelerProfile) => TravelerProfile;

  // Mobile Curled Action Rail State
  isMobileRailOpen: boolean;
  setIsMobileRailOpen: (open: boolean) => void;
  toggleMobileRail: () => void;

  destinations: Destination[];
  activeDestinationId: string;
  activeDestination: Destination;
  setActiveDestinationId: (id: string) => void;
  nextDestination: () => void;
  prevDestination: () => void;

  // Active route stops (dynamic timeline & map sync)
  routeStops: MonolithStop[];
  dayRouteStops: MonolithStop[];
  activeDay: number;
  setActiveDay: (day: number) => void;
  setRouteStops: React.Dispatch<React.SetStateAction<MonolithStop[]>>;
  reorderRouteStops: (fromIndex: number, toIndex: number) => void;
  reorderDayRouteStops: (newDayOrder: MonolithStop[]) => void;
  moveStopToDay: (stopId: string, targetDay: number) => void;
  updateRouteStop: (id: string, updates: Partial<MonolithStop>) => void;
  removeRouteStop: (id: string) => void;
  insertStopIntoRoute: (stop: MonolithStop) => void;
  applyWizardRouteStops: (stops: MonolithStop[]) => void;
  activeStopId: string | null;
  setActiveStopId: (id: string | null) => void;
  activeStop: MonolithStop | null;
  hoveredStopId: string | null;
  setHoveredStopId: (id: string | null) => void;

  activeTrip: ActiveTrip;
  updateActiveTrip: (trip: Partial<ActiveTrip>) => void;
  hasPlannedTrip: boolean;
  setHasPlannedTrip: (planned: boolean) => void;
  incomingTripInvites: TripInvite[];
  outgoingTripInvites: TripInvite[];
  sharedTrips: SharedTrip[];
  activeSharedTrip: SharedTrip | null;
  canEditSchedule: boolean;
  communityAlerts: CommunityAlert[];
  publishSharedTripAndInvites: (params: {
    trip: ActiveTrip;
    stops: MonolithStop[];
    invitedFriends: ConnectedFriend[];
  }) => Promise<void>;
  acceptTripInvite: (invite: TripInvite, participantTravelers: TravelerProfile[]) => Promise<void>;
  declineTripInvite: (invite: TripInvite) => Promise<void>;
  requestEditAccess: () => Promise<void>;
  grantEditAccess: (targetUid: string) => Promise<void>;
  reportCommunityIncident: (
    category: import('../types').IncidentCategory,
    description: string
  ) => Promise<{ alert: CommunityAlert; aiProposal: string }>;
  destinationAdvisories: DestinationAdvisoriesResponse | null;
  advisoriesLoading: boolean;
  refreshDestinationAdvisories: (
    destId?: string,
    destName?: string,
    startDate?: string,
    endDate?: string,
    stops?: MonolithStop[]
  ) => Promise<DestinationAdvisoriesResponse | null>;

  // Dual-mode map & Operations Cockpit
  activeMapMode: MapMode;
  setActiveMapMode: (mode: MapMode) => void;
  activeCockpitTab: CockpitTab;
  setActiveCockpitTab: (tab: CockpitTab) => void;

  // Expenses & 4-Bucket Rebalancing (Chapter 5)
  expenses: ExpenseItem[];
  addExpense: (expense: Omit<ExpenseItem, 'id' | 'timestamp'>) => void;
  updateExpense: (id: string, patch: Partial<ExpenseItem>) => void;
  deleteExpense: (id: string) => void;
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
  diningReservations: Record<string, DiningReservation>;
  saveDiningReservation: (res: DiningReservation) => void;
  cancelDiningReservation: (venueId: string) => void;
  stayReservations: Record<string, StayReservation>;
  saveStayReservation: (res: StayReservation) => void;
  cancelStayReservation: (stayId: string) => void;

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
  pairBluetoothFitband: (travelerId?: string, preRequestedDevicePromise?: Promise<any>, scanAllNearby?: boolean) => Promise<void>;
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
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isProfilesLoading, setIsProfilesLoading] = useState<boolean>(false);
  const isHydrating = isAuthLoading || isProfilesLoading;

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<AppView>('AUTH');

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

  const [travelers, setTravelers] = useState<TravelerProfile[]>([]);
  const [activeTravelerId, setActiveTravelerId] = useState<string>('');
  const [connectedFriends, setConnectedFriends] = useState<ConnectedFriend[]>([]);
  const [incomingInvites, setIncomingInvites] = useState<FriendInvite[]>([]);
  const [outgoingInvites, setOutgoingInvites] = useState<FriendInvite[]>([]);
  const [intakeMode, setIntakeMode] = useState<'MANUAL' | 'CONNECT'>('MANUAL');

  const activeUid = currentUser ? currentUser.uid : undefined;

  const [destinations] = useState<Destination[]>(INITIAL_DESTINATIONS);
  const [activeDestinationId, setActiveDestinationId] = useState<string>('hampi');

  const skipNextStopResetRef = useRef<boolean>(false);
  const hydratedUidRef = useRef<string | null>(null);
  const [isPrimaryOnboarding, setIsPrimaryOnboarding] = useState<boolean>(false);
  const [onboardingPrefill, setOnboardingPrefill] = useState<{
    name?: string;
    age?: number;
    mobility?: MobilityLevel;
  } | null>(null);

  const resetWorkspaceState = useCallback(() => {
    setTravelers([]);
    setActiveTravelerId('');
    setConnectedFriends([]);
    setIncomingInvites([]);
    setOutgoingInvites([]);
    setIntakeMode('MANUAL');
    setActiveDestinationId('hampi');
    setRouteStops(INITIAL_DESTINATIONS[0].stops);
    setActiveTrip(INITIAL_ACTIVE_TRIP);
    setHasPlannedTrip(false);
    setExpenses([]);
    setRebalanceApplied(false);
    setIsStormDisrupted(false);
    setWishlistIds([]);
    setOcrScanResult(null);
    setActiveStopId(null);
    setIsPrimaryOnboarding(false);
    setOnboardingPrefill(null);
    setIsIntakeModalOpen(false);
  }, []);

  // Sync Firebase Auth session & hydrate Firestore state strictly isolated per uid
  useEffect(() => {
    clearLegacyGlobalCache();
    let isMounted = true;

    const unsubscribe = subscribeToAuth(async (user) => {
      if (!isMounted) return;
      const hasTripHash = typeof window !== 'undefined' && window.location.hash.startsWith('#trip=');

      if (!user) {
        if (hasTripHash) {
          setIsAuthLoading(false);
          setIsProfilesLoading(false);
          return;
        }
        hydratedUidRef.current = null;
        resetWorkspaceState();
        setCurrentUser(null);
        setIsAuthenticated(false);
        setActiveView('AUTH');
        setIsAuthLoading(false);
        setIsProfilesLoading(false);
        return;
      }

      // Immediately clear previous user's in-memory state on account switch
      if (hydratedUidRef.current && hydratedUidRef.current !== user.uid) {
        resetWorkspaceState();
      }

      setCurrentUser(user);
      setIsAuthenticated(true);
      setIsAuthLoading(false);

      if (user.isDemo) {
        const demoCache = readUserCache('demo_coorg_cohort');
        const rawDemoProfiles = Array.isArray(demoCache.travelers) ? demoCache.travelers : INITIAL_TRAVELERS;
        const demoProfiles = rawDemoProfiles.map((p: TravelerProfile, idx: number) =>
          idx === 0 && !rawDemoProfiles.some((x: TravelerProfile) => x.isPrimarySelf)
            ? {
                ...p,
                isPrimarySelf: true,
                isPrimary: true,
                username: p.username || 'aarav_chen',
                dob: p.dob || '1999-05-14',
                age: computeAgeFromDob(p.dob || '1999-05-14', p.age),
              }
            : p
        );
        setTravelers(demoProfiles);
        setActiveTravelerId(demoCache.activeTravelerId || demoProfiles[0]?.id || '');

        if (!hasTripHash) {
          const destId = demoCache.activeDestinationId || 'hampi';
          setActiveDestinationId(destId);
          if (Array.isArray(demoCache.routeStops) && demoCache.routeStops.length > 0) {
            skipNextStopResetRef.current = true;
            setRouteStops(demoCache.routeStops);
          } else {
            const dest = destinations.find(d => d.id === destId) ?? INITIAL_DESTINATIONS[0];
            setRouteStops(dest.stops);
          }
          setActiveTrip(demoCache.activeTrip || INITIAL_ACTIVE_TRIP);
          setHasPlannedTrip(Boolean(demoCache.activeTrip));
          setRebalanceApplied(Boolean(demoCache.rebalanceApplied));
        }

        setExpenses(Array.isArray(demoCache.expenses) ? demoCache.expenses : INITIAL_EXPENSES);
        setWishlistIds(
          Array.isArray(demoCache.wishlistIds)
            ? demoCache.wishlistIds
            : ['hmp-4', 'crg-1', 'kyo-1', 'vns-1']
        );
        setIsPrimaryOnboarding(false);
        setIsIntakeModalOpen(false);
        hydratedUidRef.current = user.uid;
        setActiveView(prev => (prev === 'AUTH' ? 'GALLERY_HOME' : prev));
        setIsProfilesLoading(false);
        return;
      }

      // Real Firebase account: keep loading screen active until Cloud Firestore workspace finishes resolving
      setIsProfilesLoading(true);
      try {
        const snapshot = await fetchUserWorkspace(user.uid);
        if (!isMounted) return;

        const loadedProfiles = snapshot.profiles?.profiles ?? [];
        setTravelers(loadedProfiles);

        if (loadedProfiles.length > 0) {
          const preferredId = snapshot.profiles?.activeTravelerId;
          const resolvedId =
            preferredId && loadedProfiles.some(p => p.id === preferredId)
              ? preferredId
              : loadedProfiles[0].id;
          setActiveTravelerId(resolvedId);
          setIsPrimaryOnboarding(false);
          setIsIntakeModalOpen(false);
        } else {
          setActiveTravelerId('');
          setOnboardingPrefill(prev => prev ?? { name: user.displayName || user.email?.split('@')[0] || '' });
        }

        if (!hasTripHash) {
          const nextDestId = snapshot.trip?.activeDestinationId || 'hampi';
          setActiveDestinationId(nextDestId);
          if (snapshot.trip?.routeStops && snapshot.trip.routeStops.length > 0) {
            skipNextStopResetRef.current = true;
            setRouteStops(snapshot.trip.routeStops);
          } else {
            const targetDest = destinations.find(d => d.id === nextDestId) ?? INITIAL_DESTINATIONS[0];
            setRouteStops(targetDest.stops);
          }
          setActiveTrip(snapshot.trip?.activeTrip || INITIAL_ACTIVE_TRIP);
          setHasPlannedTrip(Boolean(snapshot.trip?.activeTrip));
          setRebalanceApplied(Boolean(snapshot.trip?.rebalanceApplied));
        }

        setExpenses(Array.isArray(snapshot.expenses) ? snapshot.expenses : []);
        setWishlistIds(Array.isArray(snapshot.wishlistIds) ? snapshot.wishlistIds : []);
        hydratedUidRef.current = user.uid;
        setActiveView(prev => (prev === 'AUTH' ? 'GALLERY_HOME' : prev));
      } finally {
        if (isMounted) {
          setIsProfilesLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [destinations, resetWorkspaceState]);

  // First-Time / Empty-Profiles Onboarding Gate
  useEffect(() => {
    if (isHydrating) return;
    if (!isAuthenticated || !currentUser || currentUser.isDemo) return;
    if (travelers.length === 0) {
      setOnboardingPrefill(prev => prev ?? {
        name: currentUser.displayName || currentUser.email?.split('@')[0] || '',
      });
      setIsPrimaryOnboarding(true);
      setEditingTravelerId(null);
      setIsIntakeModalOpen(true);
    }
  }, [isHydrating, isAuthenticated, currentUser, travelers.length]);

  // Firebase Auth Handlers
  const loginWithEmail = async (email: string, pass: string) => {
    clearDemoCache();
    resetWorkspaceState();
    setIsProfilesLoading(true);
    try {
      const user = await signInWithEmail(email, pass);
      setCurrentUser(user);
      setIsAuthenticated(true);
      localStorage.setItem('prayana_auth_authenticated', 'true');
      setActiveView('GALLERY_HOME');
    } catch (err) {
      setIsProfilesLoading(false);
      throw err;
    }
  };

  const registerWithEmail = async (
    name: string,
    age: number,
    email: string,
    pass: string,
    mobility: MobilityLevel
  ) => {
    clearDemoCache();
    resetWorkspaceState();
    setOnboardingPrefill({
      name: name.trim(),
      age: Number(age) || 30,
      mobility,
    });
    setIsProfilesLoading(true);
    try {
      const user = await signUpWithEmail(email, pass, name);
      setCurrentUser(user);
      setIsAuthenticated(true);
      localStorage.setItem('prayana_auth_authenticated', 'true');
      setActiveView('GALLERY_HOME');
    } catch (err) {
      setIsProfilesLoading(false);
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    clearDemoCache();
    resetWorkspaceState();
    setIsProfilesLoading(true);
    try {
      const user = await signInWithGoogle();
      setCurrentUser(user);
      setIsAuthenticated(true);
      localStorage.setItem('prayana_auth_authenticated', 'true');
      setActiveView('GALLERY_HOME');
    } catch (err) {
      setIsProfilesLoading(false);
      throw err;
    }
  };

  const demoBypass = () => {
    const bypassUser: AuthUser = {
      uid: 'demo_coorg_cohort',
      email: 'coorg.cohort@prayana.arch',
      displayName: 'Aarav Chen (Coorg Cohort)',
      isDemo: true,
    };
    resetWorkspaceState();
    localStorage.setItem('prayana_auth_demo', 'true');
    localStorage.setItem('prayana_auth_user', JSON.stringify(bypassUser));
    localStorage.setItem('prayana_auth_authenticated', 'true');
    const demoSeed = INITIAL_TRAVELERS.map((p, idx) =>
      idx === 0
        ? {
            ...p,
            isPrimarySelf: true,
            isPrimary: true,
            username: 'aarav_chen',
            dob: '1999-05-14',
            age: computeAgeFromDob('1999-05-14', p.age),
          }
        : p
    );
    setCurrentUser(bypassUser);
    setIsAuthenticated(true);
    setTravelers(demoSeed);
    setActiveTravelerId(demoSeed[0].id);
    setExpenses(INITIAL_EXPENSES);
    setWishlistIds(['hmp-4', 'crg-1', 'kyo-1', 'vns-1']);
    persistProfiles(demoSeed, bypassUser.uid, demoSeed[0].id);
    persistExpenses(INITIAL_EXPENSES, bypassUser.uid);
    persistWishlist(['hmp-4', 'crg-1', 'kyo-1', 'vns-1'], bypassUser.uid);
    hydratedUidRef.current = bypassUser.uid;
    setIsPrimaryOnboarding(false);
    setIsIntakeModalOpen(false);
    setIsAuthLoading(false);
    setIsProfilesLoading(false);
    setIsPreloaderActive(true);
    setActiveView('GALLERY_HOME');
  };

  const logoutUser = async () => {
    bleHandleRef.current?.disconnect();
    bleHandleRef.current = null;
    setBleConnectedDevice(null);
    setBleHrLocked(false);
    setIsFitbandSimActive(false);
    hydratedUidRef.current = null;
    resetWorkspaceState();
    await signOutUser();
    clearDemoCache();
    setCurrentUser(null);
    setIsAuthenticated(false);
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

  // Dynamic route stops (equally distributed across days by default)
  const [routeStops, setRouteStops] = useState<MonolithStop[]>(() => {
    const initialStops = activeDestination?.stops ?? INITIAL_DESTINATIONS[0].stops;
    const initialDays = activeDestination?.daysCount ?? INITIAL_ACTIVE_TRIP.totalDays ?? 3;
    return distributeStopsAcrossDays(initialStops, initialDays, initialStops);
  });

  useEffect(() => {
    if (skipNextStopResetRef.current) {
      skipNextStopResetRef.current = false;
      return;
    }
    if (activeDestination?.stops) {
      const daysCount = Math.max(1, activeDestination.daysCount || 3);
      setRouteStops(distributeStopsAcrossDays(activeDestination.stops, daysCount, activeDestination.stops));
      setActiveStopId(null);
      setActiveTrip(prev =>
        prev.destinationId === activeDestination.id
          ? prev
          : {
              ...prev,
              destinationId: activeDestination.id,
              routeTitle: activeDestination.routeTitle,
              totalDays: daysCount,
              dayIndex: 1,
            }
      );
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

  const [activeTrip, setActiveTrip] = useState<ActiveTrip>(INITIAL_ACTIVE_TRIP);
  const [hasPlannedTrip, setHasPlannedTrip] = useState<boolean>(false);
  const [incomingTripInvites, setIncomingTripInvites] = useState<TripInvite[]>([]);
  const [outgoingTripInvites, setOutgoingTripInvites] = useState<TripInvite[]>([]);
  const [sharedTrips, setSharedTrips] = useState<SharedTrip[]>([]);
  const [communityAlerts, setCommunityAlerts] = useState<CommunityAlert[]>([]);
  const [destinationAdvisories, setDestinationAdvisories] = useState<DestinationAdvisoriesResponse | null>(null);
  const [advisoriesLoading, setAdvisoriesLoading] = useState<boolean>(false);

  const activeDay = Math.max(1, Math.min(activeTrip.totalDays || 1, activeTrip.dayIndex || 1));

  const dayRouteStops = useMemo(() => {
    return routeStops.filter(s => (s.day ?? 1) === activeDay);
  }, [routeStops, activeDay]);

  const [activeMapMode, setActiveMapMode] = useState<MapMode>('NODE_GRAPH');
  const [activeCockpitTab, setActiveCockpitTab] = useState<CockpitTab>('ROUTE_TIMELINE');

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);

  const [rebalanceApplied, setRebalanceApplied] = useState<boolean>(false);
  const [isStormDisrupted, setIsStormDisrupted] = useState<boolean>(false);
  const [placesData, setPlacesData] = useState<PlacesApiResponse | null>(null);
  const [placesLoading, setPlacesLoading] = useState<boolean>(false);

  const [diningReservations, setDiningReservations] = useState<Record<string, DiningReservation>>({});
  const [stayReservations, setStayReservations] = useState<Record<string, StayReservation>>({});

  useEffect(() => {
    try {
      const uid = activeUid || 'guest';
      const dRaw = localStorage.getItem(`prayana_dining_res_${uid}`);
      const sRaw = localStorage.getItem(`prayana_stay_res_${uid}`);
      setDiningReservations(dRaw ? JSON.parse(dRaw) : {});
      setStayReservations(sRaw ? JSON.parse(sRaw) : {});
    } catch {
      setDiningReservations({});
      setStayReservations({});
    }
  }, [activeUid]);

  const saveDiningReservation = (res: DiningReservation) => {
    setDiningReservations(prev => {
      const next = { ...prev, [res.venueId]: res };
      try {
        localStorage.setItem(`prayana_dining_res_${activeUid || 'guest'}`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const saveStayReservation = (res: StayReservation) => {
    setStayReservations(prev => {
      const next = { ...prev, [res.stayId]: res };
      try {
        localStorage.setItem(`prayana_stay_res_${activeUid || 'guest'}`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const cancelDiningReservation = (venueId: string) => {
    setDiningReservations(prev => {
      const next = { ...prev };
      delete next[venueId];
      try {
        localStorage.setItem(`prayana_dining_res_${activeUid || 'guest'}`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const cancelStayReservation = (stayId: string) => {
    setStayReservations(prev => {
      const next = { ...prev };
      delete next[stayId];
      try {
        localStorage.setItem(`prayana_stay_res_${activeUid || 'guest'}`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

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
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  const [isBucketListOpen, setIsBucketListOpen] = useState(false);
  const [isShareHubOpen, setIsShareHubOpen] = useState(false);
  const [isMobileRailOpen, setIsMobileRailOpen] = useState(false);
  const toggleMobileRail = () => setIsMobileRailOpen(prev => !prev);

  useEffect(() => {
    setIsMobileRailOpen(false);
  }, [activeView]);

  const hasTravelers = travelers.length > 0;
  const primarySelfProfile = useMemo(() => {
    return travelers.find(t => t.isPrimarySelf) ?? null;
  }, [travelers]);

  const activeTraveler = useMemo(() => {
    return (
      travelers.find(t => t.id === activeTravelerId) ??
      travelers[0] ??
      INITIAL_TRAVELERS[0]
    );
  }, [travelers, activeTravelerId]);

  const activeSharedTrip = useMemo(() => {
    if (!sharedTrips.length) return null;
    return sharedTrips.find((t) => t.id === activeTrip.id) || sharedTrips[0] || null;
  }, [sharedTrips, activeTrip.id]);

  const canEditSchedule = useMemo(() => {
    if (!activeSharedTrip || !activeUid) return true;
    if (activeSharedTrip.hostUid === activeUid) return true;
    return (activeSharedTrip.editGrantedUids || []).includes(activeUid);
  }, [activeSharedTrip, activeUid]);

  // Subscribe to Community Corridor Alerts (global across users)
  useEffect(() => {
    return subscribeToCommunityAlerts(setCommunityAlerts);
  }, []);

  // Subscribe to Collaborative Trip Invites & Shared Trips
  useEffect(() => {
    if (!isAuthenticated || !currentUser || currentUser.isDemo || !activeUid) return;
    const unsubInv = subscribeToTripInvites(activeUid, (inc, out) => {
      setIncomingTripInvites(inc);
      setOutgoingTripInvites(out);
    });
    const unsubShared = subscribeToSharedTrips(activeUid, (trips) => {
      setSharedTrips(trips);
      if (trips.length > 0 && !hasPlannedTrip) {
        const primary = trips[0];
        setActiveDestinationId(primary.activeDestinationId);
        setActiveTrip(primary.activeTrip);
        if (primary.routeStops?.length) {
          skipNextStopResetRef.current = true;
          setRouteStops(primary.routeStops);
        }
        setHasPlannedTrip(true);
      }
    });
    return () => {
      unsubInv();
      unsubShared();
    };
  }, [isAuthenticated, activeUid, currentUser?.isDemo, hasPlannedTrip]);

  const hydrateFriendSharedProfiles = async (friends: ConnectedFriend[]) => {
    if (!friends.length) return;
    const enriched = await Promise.all(
      friends.map(async (f) => {
        const list = await fetchFriendProfilesList(f.uid);
        return {
          ...f,
          sharedProfiles: list.length > 0 ? list : [f.profile],
        };
      })
    );
    setConnectedFriends(enriched);
  };

  // Real-time Friend Network Subscription (@username invites, connectedFriends & /friendships)
  useEffect(() => {
    if (!isAuthenticated || !currentUser || currentUser.isDemo || !activeUid) {
      return;
    }
    const unsubNetwork = subscribeToFriendNetwork(activeUid, {
      onIncoming: setIncomingInvites,
      onOutgoing: setOutgoingInvites,
      onFriends: (friends) => {
        setConnectedFriends(friends);
        void hydrateFriendSharedProfiles(friends);
      },
    });
    let hadFriendshipsSnapshot = false;
    const unsubFriendships = subscribeToFriendships(activeUid, (docs) => {
      const activeFriendUids = new Set<string>();
      docs.forEach((d) => {
        if (Array.isArray(d.uids)) {
          d.uids.forEach((u) => {
            if (u !== activeUid) activeFriendUids.add(u);
          });
        }
      });
      if (hadFriendshipsSnapshot) {
        setConnectedFriends((prev) => {
          const filtered = prev.filter((f) => activeFriendUids.has(f.uid));
          return filtered.length === prev.length ? prev : filtered;
        });
      }
      hadFriendshipsSnapshot = true;
    });
    return () => {
      unsubNetwork();
      unsubFriendships();
    };
  }, [isAuthenticated, activeUid, currentUser?.isDemo]);

  // Auto-save accepted outgoing @username invites into host's users/{uid}/connectedFriends & /friendships
  useEffect(() => {
    if (!isAuthenticated || !currentUser || currentUser.isDemo || !activeUid) return;
    const acceptedOutgoing = outgoingInvites.filter(inv => inv.status === 'ACCEPTED');
    acceptedOutgoing.forEach((inv) => {
      const myPrimary = travelers.find(t => t.isPrimarySelf) ?? travelers[0];
      void ensureFriendshipDoc(
        activeUid,
        inv.toUid,
        { username: myPrimary?.username || inv.fromUsername, name: myPrimary?.name || inv.fromName },
        { username: inv.toUsername, name: inv.toName || inv.toUsername }
      );
      if (connectedFriends.some(f => f.uid === inv.toUid)) return;
      const syncedProfile = normalizeFriendProfileSnapshot(
        inv.toProfile || ({
          id: `friend-${inv.toUid}`,
          name: inv.toName || `@${inv.toUsername}`,
          age: 28,
          mobility: 'Full Mobility',
          medicalFlags: [],
          dietaryTags: [],
          vibeProfile: 'Cultural Explorer',
          fitbandConnected: false,
          travelInsuranceId: 'CONNECTED-FRIEND',
          emergencyContact: { name: 'Friend Contact', phone: '', relation: 'Companion' },
          vitals: { heartRate: 72, spO2: 99, steps: 4500, strainLevel: 'LOW', ambientWbgt: 26.5, lastSync: 'friend sync' },
        } as TravelerProfile),
        inv.toUid,
        inv.toUsername,
        inv.toName || `@${inv.toUsername}`
      );
      void saveConnectedFriend(activeUid, {
        uid: inv.toUid,
        username: inv.toUsername,
        name: syncedProfile.name,
        connectedAt: inv.respondedAt || new Date().toISOString(),
        profile: syncedProfile,
      });
    });
  }, [outgoingInvites, connectedFriends, isAuthenticated, currentUser, activeUid]);

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

  const refreshDestinationAdvisories = async (
    destId?: string,
    destName?: string,
    startDate?: string,
    endDate?: string,
    stops?: MonolithStop[]
  ): Promise<DestinationAdvisoriesResponse | null> => {
    const targetDestId = destId || activeDestinationId;
    const targetDest = destinations.find(d => d.id === targetDestId) || activeDestination;
    const targetStops = stops || routeStops;
    setAdvisoriesLoading(true);
    try {
      const res = await fetchDestinationAdvisories({
        destination_id: targetDestId,
        destination_name: destName || targetDest.name,
        start_date: startDate || activeTrip.checkInDate || '',
        end_date: endDate || activeTrip.checkOutDate || '',
        stops: targetStops.map(s => ({
          id: s.id,
          name: s.title,
          isOutdoor: s.isOutdoor,
          lat: s.coords?.lat,
          lon: s.coords?.lng,
          category: s.vibeTag,
        })),
      });
      setDestinationAdvisories(res);
      return res;
    } finally {
      setAdvisoriesLoading(false);
    }
  };

  const applyWizardRouteStops = (stops: MonolithStop[]) => {
    skipNextStopResetRef.current = true;
    setRouteStops(stops);
    setActiveStopId(null);
    setHasPlannedTrip(true);
  };

  const publishSharedTripAndInvites = async (params: {
    trip: ActiveTrip;
    stops: MonolithStop[];
    invitedFriends: ConnectedFriend[];
  }) => {
    const myPrimary = travelers.find((t) => t.isPrimarySelf) || travelers[0];
    if (!activeUid || currentUser?.isDemo) return;
    const shared: SharedTrip = {
      id: params.trip.id,
      hostUid: activeUid,
      hostUsername: myPrimary?.username || 'host',
      hostName: myPrimary?.name || currentUser?.displayName || 'Host',
      participantUids: [],
      editGrantedUids: [],
      editRequestUids: [],
      activeDestinationId: params.trip.destinationId,
      activeTrip: params.trip,
      routeStops: params.stops,
      cohortTravelers: travelers.filter((t) => params.trip.groupTravelerIds.includes(t.id)),
      expenses,
      updatedAt: new Date().toISOString(),
    };
    await saveSharedTrip(shared);
    await Promise.all(
      params.invitedFriends.map((f) =>
        sendTripInvite({
          tripId: params.trip.id,
          destinationId: params.trip.destinationId,
          destinationName: destinations.find((d) => d.id === params.trip.destinationId)?.name || params.trip.destinationId,
          routeTitle: params.trip.routeTitle,
          checkInDate: params.trip.checkInDate || '',
          checkOutDate: params.trip.checkOutDate || '',
          fromUid: activeUid,
          fromUsername: myPrimary?.username || 'host',
          fromName: myPrimary?.name || 'Host',
          toUid: f.uid,
          toUsername: f.username,
          toName: f.name,
        })
      )
    );
  };

  const acceptTripInvite = async (invite: TripInvite, participantTravelers: TravelerProfile[]) => {
    await respondToTripInvite({
      invite,
      decision: 'ACCEPTED',
      participantTravelers,
    });
    setActiveDestinationId(invite.destinationId);
    setHasPlannedTrip(true);
  };

  const declineTripInvite = async (invite: TripInvite) => {
    await respondToTripInvite({
      invite,
      decision: 'DECLINED',
    });
  };

  const requestEditAccess = async () => {
    if (!activeSharedTrip || !activeUid) return;
    await requestTripEditAccess(activeSharedTrip.id, activeUid);
  };

  const grantEditAccess = async (targetUid: string) => {
    if (!activeSharedTrip) return;
    await grantTripEditAccess(activeSharedTrip.id, targetUid);
  };

  const reportCommunityIncident = async (
    category: import('../types').IncidentCategory,
    description: string
  ): Promise<{ alert: CommunityAlert; aiProposal: string }> => {
    const myPrimary = travelers.find((t) => t.isPrimarySelf) || travelers[0];
    const aiProposal =
      category === 'Storm'
        ? `Prayana AI confirmed ${category} risk in ${activeDestination.name}: swap exposed outdoor stops for indoor heritage pavilions & museums.`
        : category === 'Accident' || category === 'Landslide / Roadblock'
        ? `Prayana AI confirmed ${category} disruption on ${activeDestination.name} corridor: rerouting transit windows & buffering +45m.`
        : `Prayana AI confirmed ${category} congestion in ${activeDestination.name}: shifting peak visits to early morning 06:30–08:30.`;

    const alert = await publishCommunityAlert({
      destinationId: activeDestination.id,
      destinationName: activeDestination.name,
      category,
      description: description.trim() || aiProposal,
      aiProposal,
      authorUid: activeUid || 'guest',
      authorName: myPrimary?.name || 'Traveler',
    });
    setCommunityAlerts((prev) => [alert, ...prev]);
    return { alert, aiProposal };
  };

  const reorderDayRouteStops = (newDayOrder: MonolithStop[]) => {
    setRouteStops(prev => {
      const others = prev.filter(s => (s.day ?? 1) !== activeDay);
      const dayTagged = newDayOrder.map(s => ({ ...s, day: activeDay }));
      const merged = recalculateDayTimings([...others, ...dayTagged], activeDay);
      persistTrip(activeTrip, activeUid, { activeDestinationId, routeStops: merged, rebalanceApplied });
      return merged;
    });
  };

  const reorderRouteStops = (fromIndex: number, toIndex: number) => {
    setRouteStops(prev => {
      const currentDayStops = prev.filter(s => (s.day ?? 1) === activeDay);
      const others = prev.filter(s => (s.day ?? 1) !== activeDay);
      const updated = [...currentDayStops];
      if (fromIndex < 0 || fromIndex >= updated.length || toIndex < 0 || toIndex >= updated.length) {
        return prev;
      }
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      const merged = recalculateDayTimings([...others, ...updated], activeDay);
      persistTrip(activeTrip, activeUid, { activeDestinationId, routeStops: merged, rebalanceApplied });
      return merged;
    });
  };

  const moveStopToDay = (stopId: string, targetDay: number) => {
    const clampedTarget = Math.max(1, Math.min(activeTrip.totalDays || 1, targetDay));
    setRouteStops(prev => {
      const targetStop = prev.find(s => s.id === stopId);
      if (!targetStop) return prev;
      const sourceDay = targetStop.day ?? 1;
      if (sourceDay === clampedTarget) return prev;
      let next = prev.map(s => (s.id === stopId ? { ...s, day: clampedTarget } : s));
      next = recalculateDayTimings(next, sourceDay);
      next = recalculateDayTimings(next, clampedTarget);
      persistTrip(activeTrip, activeUid, { activeDestinationId, routeStops: next, rebalanceApplied });
      return next;
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
      const removed = prev.find(s => s.id === id);
      const sourceDay = removed?.day ?? activeDay;
      const filtered = prev.filter(s => s.id !== id);
      const next = recalculateDayTimings(filtered, sourceDay);
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
      const targetDay = stop.day ?? activeDay;
      const next = recalculateDayTimings([...prev, { ...stop, day: targetDay }], targetDay);
      persistTrip(activeTrip, activeUid, { activeDestinationId, routeStops: next, rebalanceApplied });
      return next;
    });
  };

  const optimizeActiveRoute = async (): Promise<{ solverStatus: string; solveTimeMs: number } | null> => {
    const targetStops = dayRouteStops.length >= 2 ? dayRouteStops : routeStops;
    if (targetStops.length < 2) return null;

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
      poi_candidates: targetStops.map(s => ({
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
      pinned_stop_ids: targetStops.filter(s => s.isPinned).map(s => s.id),
    };

    const resp = await apiOptimizeRoute(payload);
    if (resp && resp.ordered_stops?.length > 0) {
      setRouteStops(prev => {
        const currentDay = prev.filter(s => (s.day ?? 1) === activeDay);
        const others = prev.filter(s => (s.day ?? 1) !== activeDay);
        const byId = new Map(currentDay.map(s => [s.id, s]));
        const reordered = resp.ordered_stops
          .map(o => byId.get(o.id))
          .filter((s): s is MonolithStop => Boolean(s));
        const included = new Set(reordered.map(s => s.id));
        const remainder = currentDay.filter(s => !included.has(s.id));
        return recalculateDayTimings([...others, ...reordered, ...remainder], activeDay);
      });
      return { solverStatus: resp.solver_status, solveTimeMs: resp.solve_time_ms };
    }

    // Local deterministic fallback ordering (low slope/effort first)
    setRouteStops(prev => {
      const currentDay = prev.filter(s => (s.day ?? 1) === activeDay);
      const others = prev.filter(s => (s.day ?? 1) !== activeDay);
      const sorted = [...currentDay].sort((a, b) =>
        a.isPinned === b.isPinned ? a.slopeDeg - b.slopeDeg : a.isPinned ? -1 : 1
      );
      return recalculateDayTimings([...others, ...sorted], activeDay);
    });
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
    const safeAmount = Math.max(0, Number(expense.amount) || 0);
    const safeCustomSplits = expense.customSplits
      ? Object.fromEntries(
          Object.entries(expense.customSplits).map(([k, v]) => [k, Math.max(0, Number(v) || 0)])
        )
      : undefined;
    const newItem: ExpenseItem = {
      ...expense,
      amount: safeAmount,
      customSplits: safeCustomSplits,
      id: `exp-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setExpenses(prev => {
      const next = [newItem, ...prev];
      persistExpenses(next, activeUid);
      return next;
    });
  };

  const updateExpense = (id: string, patch: Partial<ExpenseItem>) => {
    const safePatch: Partial<ExpenseItem> = { ...patch };
    if (patch.amount !== undefined) {
      safePatch.amount = Math.max(0, Number(patch.amount) || 0);
    }
    if (patch.customSplits) {
      safePatch.customSplits = Object.fromEntries(
        Object.entries(patch.customSplits).map(([k, v]) => [k, Math.max(0, Number(v) || 0)])
      );
    }
    setExpenses(prev => {
      const next = prev.map(item => (item.id === id ? { ...item, ...safePatch } : item));
      persistExpenses(next, activeUid);
      return next;
    });
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => {
      const next = prev.filter(item => item.id !== id);
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
      const target = prev.find(t => t.id === id);
      // Permanent Self-Profile cannot be deleted
      if (target?.isPrimarySelf) return prev;
      const next = prev.filter(t => t.id !== id);
      const nextActive = activeTravelerId === id ? (next[0]?.id ?? '') : activeTravelerId;
      if (activeTravelerId === id) {
        setActiveTravelerId(nextActive);
      }
      persistProfiles(next, activeUid, nextActive);
      return next;
    });
  };

  const registerPrimarySelfProfile = async (
    profileData: Omit<TravelerProfile, 'id'> & { username: string; dob: string },
    editingId?: string | null
  ) => {
    const existing = editingId ? travelers.find(t => t.id === editingId) : null;
    const claimedUsername = await claimUsernameAndUpdateRoot({
      uid: activeUid,
      username: profileData.username,
      displayName: profileData.name,
      dob: profileData.dob,
      oldUsername: existing?.username,
    });
    const computedAge = computeAgeFromDob(profileData.dob, profileData.age);

    setTravelers(prev => {
      let next: TravelerProfile[];
      let targetActive = activeTravelerId;
      if (editingId && prev.some(t => t.id === editingId)) {
        next = prev.map(t =>
          t.id === editingId
            ? {
                ...t,
                ...profileData,
                username: claimedUsername,
                dob: profileData.dob,
                age: computedAge,
                isPrimarySelf: true,
                isPrimary: true,
                ownerUid: activeUid || t.ownerUid,
              }
            : t
        );
      } else {
        const selfId = `traveler-self-${Date.now()}`;
        const selfProfile: TravelerProfile = {
          ...profileData,
          id: selfId,
          username: claimedUsername,
          dob: profileData.dob,
          age: computedAge,
          isPrimarySelf: true,
          isPrimary: true,
          ownerUid: activeUid,
        };
        next = [selfProfile, ...prev.map(t => ({ ...t, isPrimarySelf: false }))];
        targetActive = prev.length === 0 ? selfId : targetActive || selfId;
        if (prev.length === 0 || !activeTravelerId) {
          setActiveTravelerId(selfId);
        }
      }
      persistProfiles(next, activeUid, targetActive);
      return next;
    });
  };

  const lookupUsernameHandle = async (rawUsername: string) => {
    return lookupUserByUsername(rawUsername, activeUid);
  };

  const sendInviteByUsername = async (rawUsername: string): Promise<FriendInvite> => {
    if (!currentUser || currentUser.isDemo || !activeUid) {
      throw new Error('Sign in with Google or Email to connect with @username travelers.');
    }
    const selfProfile = travelers.find(t => t.isPrimarySelf) ?? travelers.find(t => t.isPrimary) ?? travelers[0];
    const fromUsername = sanitizeUsername(selfProfile?.username || '');
    if (!fromUsername) {
      throw new Error('Set your own @username on your Primary Self profile before inviting friends.');
    }

    const target = await lookupUserByUsername(rawUsername, activeUid);
    if (!target) {
      throw new Error(`No Prayana traveler found with handle @${sanitizeUsername(rawUsername)}.`);
    }
    if (target.uid === activeUid) {
      throw new Error('You cannot send an invite to your own @username.');
    }
    if (connectedFriends.some(f => f.uid === target.uid)) {
      throw new Error(`@${target.username} is already in your Connected Friends list.`);
    }
    if (outgoingInvites.some(inv => inv.toUid === target.uid && inv.status === 'PENDING')) {
      throw new Error(`An invite is already pending for @${target.username}.`);
    }

    return sendFriendInvite({
      fromUid: activeUid,
      fromUsername,
      fromName: selfProfile.name || currentUser.displayName || `@${fromUsername}`,
      fromProfile: selfProfile,
      toUid: target.uid,
      toUsername: target.username,
    });
  };

  const acceptFriendInvite = async (invite: FriendInvite) => {
    if (!activeUid) return;
    const myPrimary = travelers.find(t => t.isPrimarySelf) ?? travelers.find(t => t.isPrimary) ?? travelers[0] ?? null;
    await respondToFriendInvite({
      invite,
      responderUid: activeUid,
      myPrimaryProfile: myPrimary,
      decision: 'ACCEPTED',
    });
  };

  const declineFriendInvite = async (invite: FriendInvite) => {
    if (!activeUid) return;
    await respondToFriendInvite({
      invite,
      responderUid: activeUid,
      myPrimaryProfile: null,
      decision: 'DECLINED',
    });
  };

  const cancelOutgoingInvite = async (inviteId: string) => {
    await cancelFriendInvite(inviteId, activeUid);
  };

  const unfriendConnection = async (friendUid: string) => {
    setConnectedFriends(prev => prev.filter(f => f.uid !== friendUid));
    if (activeUid) {
      await firebaseUnfriendConnection(activeUid, friendUid);
    }
  };

  const addConnectedFriendToCohort = (
    friend: ConnectedFriend,
    specificProfile?: TravelerProfile
  ): TravelerProfile => {
    const sourceProfile = specificProfile || friend.profile;
    const targetId = specificProfile
      ? `friend-${friend.uid}-${specificProfile.id}`
      : `friend-${friend.uid}`;
    const existing = travelers.find(
      t => t.id === targetId || (!specificProfile && (t.ownerUid === friend.uid || t.id === `friend-${friend.uid}`))
    );
    const synced = normalizeFriendProfileSnapshot(
      { ...sourceProfile, id: targetId },
      friend.uid,
      specificProfile?.username || friend.username,
      specificProfile?.name || friend.name
    );
    synced.id = targetId;

    if (existing) {
      const merged: TravelerProfile = {
        ...existing,
        ...synced,
        id: existing.id,
        isPrimarySelf: false,
      };
      setTravelers(prev => {
        const next = prev.map(t => (t.id === existing.id ? merged : t));
        persistProfiles(next, activeUid, activeTravelerId);
        return next;
      });
      return merged;
    }

    setTravelers(prev => {
      const next = [...prev, synced];
      persistProfiles(next, activeUid, activeTravelerId || synced.id);
      return next;
    });
    return synced;
  };

  const loadSampleCohort = () => {
    setTravelers(INITIAL_TRAVELERS);
    const firstId = INITIAL_TRAVELERS[0]?.id ?? '';
    setActiveTravelerId(firstId);
    persistProfiles(INITIAL_TRAVELERS, activeUid, firstId);
  };

  const attachBleHandle = (targetId: string, handle: BleConnectionHandle) => {
    bleHandleRef.current?.disconnect();
    bleHandleRef.current = handle;
    setBleConnectedDevice(handle.deviceName);
    setIsFitbandSimActive(false);
    setBleError(null);
    if (handle.batteryLevel !== undefined || handle.spO2 !== undefined) {
      setLiveVitals(prev => ({
        ...prev,
        ...(handle.spO2 !== undefined ? { spO2: handle.spO2 } : {}),
        ...(handle.batteryLevel !== undefined ? { batteryLevel: handle.batteryLevel } : {}),
      }));
    }
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
  };

  const handleBleBpm = (targetId: string, bpm: number, deviceName: string) => {
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
  };

  const handleBleTelemetry = (data: { spO2?: number; batteryLevel?: number }) => {
    setLiveVitals(prev => ({
      ...prev,
      ...(data.spO2 !== undefined ? { spO2: data.spO2 } : {}),
      ...(data.batteryLevel !== undefined ? { batteryLevel: data.batteryLevel } : {}),
    }));
  };

  const handleBleDisconnect = (targetId: string) => {
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
  };

  // Auto-reconnect previously permitted BLE health devices on mount
  useEffect(() => {
    const targetId = activeTravelerId || travelers[0]?.id;
    if (!targetId || bleHandleRef.current) return;
    void tryReconnectPermittedBleDevice(
      (bpm, deviceName) => handleBleBpm(targetId, bpm, deviceName),
      () => handleBleDisconnect(targetId),
      handleBleTelemetry
    ).then((handle) => {
      if (handle) attachBleHandle(targetId, handle);
    });
  }, []);

  const pairBluetoothFitband = async (
    travelerId?: string,
    preRequestedDevicePromise?: Promise<any>,
    scanAllNearby = false
  ) => {
    const targetId = travelerId || activeTraveler.id;
    setBleError(null);
    try {
      const handle = await connectBleHeartRateDevice(
        (bpm, deviceName) => handleBleBpm(targetId, bpm, deviceName),
        () => handleBleDisconnect(targetId),
        preRequestedDevicePromise,
        {
          scanAllNearby,
          onTelemetry: handleBleTelemetry,
        }
      );
      if (!handle) {
        // User cancelled the device picker — preserve any active connection and show no error
        return;
      }
      attachBleHandle(targetId, handle);
    } catch (err: any) {
      if (err?.message) {
        setBleError(err.message);
      }
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
        isHydrating,
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
        primarySelfProfile,
        hasTravelers,
        activeTravelerId,
        activeTraveler,
        setActiveTravelerId,
        updateTraveler,
        addTraveler,
        deleteTraveler,
        loadSampleCohort,

        connectedFriends,
        incomingInvites,
        outgoingInvites,
        intakeMode,
        setIntakeMode,
        registerPrimarySelfProfile,
        lookupUsernameHandle,
        sendInviteByUsername,
        acceptFriendInvite,
        declineFriendInvite,
        cancelOutgoingInvite,
        unfriendConnection,
        addConnectedFriendToCohort,

        isMobileRailOpen,
        setIsMobileRailOpen,
        toggleMobileRail,

        destinations,
        activeDestinationId,
        activeDestination,
        setActiveDestinationId,
        nextDestination,
        prevDestination,

        routeStops,
        dayRouteStops,
        activeDay,
        setActiveDay: (day: number) => {
          const clamped = Math.max(1, Math.min(activeTrip.totalDays || 1, day));
          updateActiveTrip({ dayIndex: clamped });
          setActiveStopId(null);
        },
        setRouteStops,
        reorderRouteStops,
        reorderDayRouteStops,
        moveStopToDay,
        updateRouteStop,
        removeRouteStop,
        insertStopIntoRoute,
        applyWizardRouteStops,
        activeStopId,
        setActiveStopId,
        activeStop,
        hoveredStopId,
        setHoveredStopId,

        activeTrip,
        updateActiveTrip,
        hasPlannedTrip,
        setHasPlannedTrip,
        incomingTripInvites,
        outgoingTripInvites,
        sharedTrips,
        activeSharedTrip,
        canEditSchedule,
        communityAlerts,
        publishSharedTripAndInvites,
        acceptTripInvite,
        declineTripInvite,
        requestEditAccess,
        grantEditAccess,
        reportCommunityIncident,
        destinationAdvisories,
        advisoriesLoading,
        refreshDestinationAdvisories,

        activeMapMode,
        setActiveMapMode,
        activeCockpitTab,
        setActiveCockpitTab,

        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
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
        diningReservations,
        saveDiningReservation,
        cancelDiningReservation,
        stayReservations,
        saveStayReservation,
        cancelStayReservation,

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
