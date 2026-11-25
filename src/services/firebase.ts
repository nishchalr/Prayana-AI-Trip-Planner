/**
 * PRAYANA — Firebase Auth & Cloud Firestore Persistence Service
 * ----------------------------------------------------------------------
 * Strict Firebase Authentication (Email/Password + Google OAuth Popup) and
 * per-user Cloud Firestore persistence scoped to `users/{uid}/...` on
 * Firestore Standard Native `(default)`.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { ActiveTrip, ExpenseItem, MonolithStop, TravelerProfile } from '../types';

export interface FirebaseSyncConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isDemo?: boolean;
}

export interface UserWorkspaceSnapshot {
  profiles?: {
    profiles: TravelerProfile[];
    activeTravelerId?: string | null;
    initialized: boolean;
  };
  trip?: {
    activeTrip?: ActiveTrip;
    activeDestinationId?: string;
    routeStops?: MonolithStop[];
    rebalanceApplied?: boolean;
  };
  expenses?: ExpenseItem[];
  wishlistIds?: string[];
}

const firebaseConfig: FirebaseSyncConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY,
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID,
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== 'mock-key' &&
    firebaseConfig.apiKey.length > 10
);

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
    console.info('PRAYANA: Firebase Auth & Cloud Firestore initialized.');
  } catch (err) {
    console.warn('PRAYANA: Firebase initialization error:', err);
  }
}

export function getCloudSyncStatus() {
  return {
    isCloudActive: isFirebaseConfigured && db !== null && auth !== null,
    storageDriver:
      isFirebaseConfigured && db !== null ? 'Cloud Firestore' : 'Local Cache Only',
  };
}

function toAuthUser(fbUser: FirebaseUser): AuthUser {
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Traveler'),
    photoURL: fbUser.photoURL,
    isDemo: false,
  };
}

/**
 * Strict Email & Password Sign-In — never falls back to fake login on error.
 */
export async function signInWithEmail(email: string, pass: string): Promise<AuthUser> {
  if (!auth || !isFirebaseConfigured) {
    throw new Error('auth/not-configured');
  }
  if (!email.trim() || !pass) {
    throw new Error('auth/invalid-credential');
  }

  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  const authUser = toAuthUser(cred.user);
  localStorage.setItem('prayana_auth_user', JSON.stringify(authUser));

  if (db) {
    try {
      await setDoc(
        doc(db, 'users', authUser.uid),
        {
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName,
          lastLoginAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore user metadata merge skipped:', err);
    }
  }

  return authUser;
}

/**
 * Strict Email & Password Sign-Up with Firestore root document initialization.
 */
export async function signUpWithEmail(
  email: string,
  pass: string,
  displayName: string
): Promise<AuthUser> {
  if (!auth || !isFirebaseConfigured) {
    throw new Error('auth/not-configured');
  }

  const cleanName = displayName.trim() || email.trim().split('@')[0];
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  await updateProfile(cred.user, { displayName: cleanName });

  const authUser: AuthUser = {
    uid: cred.user.uid,
    email: cred.user.email,
    displayName: cleanName,
    photoURL: cred.user.photoURL,
    isDemo: false,
  };
  localStorage.setItem('prayana_auth_user', JSON.stringify(authUser));

  if (db) {
    try {
      await setDoc(
        doc(db, 'users', authUser.uid),
        {
          uid: authUser.uid,
          email: authUser.email,
          displayName: cleanName,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore signup profile write skipped:', err);
    }
  }

  return authUser;
}

/**
 * Google Sign-In via real Firebase OAuth Popup.
 */
export async function signInWithGoogle(): Promise<AuthUser> {
  if (!auth || !isFirebaseConfigured) {
    throw new Error('auth/not-configured');
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  const authUser = toAuthUser(cred.user);
  localStorage.setItem('prayana_auth_user', JSON.stringify(authUser));

  if (db) {
    try {
      await setDoc(
        doc(db, 'users', authUser.uid),
        {
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName,
          photoURL: authUser.photoURL || null,
          lastLoginAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore Google user metadata merge skipped:', err);
    }
  }

  return authUser;
}

/**
 * Sign Out cleanly from Firebase Auth + legacy/local auth keys.
 */
export async function signOutUser(): Promise<void> {
  if (auth && isFirebaseConfigured) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signOut warning:', e);
    }
  }
  localStorage.removeItem('prayana_auth_user');
  localStorage.removeItem('prayana_auth_authenticated');
  localStorage.removeItem('prayana_auth_demo');
  clearLegacyGlobalCache();
}

/**
 * Subscribe to Firebase Auth session restoration / transitions.
 */
export function subscribeToAuth(callback: (user: AuthUser | null) => void): () => void {
  if (auth && isFirebaseConfigured) {
    return onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        localStorage.removeItem('prayana_auth_demo');
        const user = toAuthUser(fbUser);
        localStorage.setItem('prayana_auth_user', JSON.stringify(user));
        localStorage.setItem('prayana_auth_authenticated', 'true');
        callback(user);
      } else {
        // Restore Demo Bypass session ONLY when explicitly flagged
        const isDemoFlag = localStorage.getItem('prayana_auth_demo') === 'true';
        const cached = localStorage.getItem('prayana_auth_user');
        if (isDemoFlag && cached) {
          try {
            const parsed = JSON.parse(cached) as AuthUser;
            if (parsed?.isDemo) {
              callback(parsed);
              return;
            }
          } catch {
            // ignore
          }
        }
        localStorage.removeItem('prayana_auth_user');
        localStorage.removeItem('prayana_auth_authenticated');
        callback(null);
      }
    });
  }
  callback(null);
  return () => {};
}

const DEMO_CACHE_KEY = 'prayana_demo_cache';
const LEGACY_GLOBAL_KEYS = [
  'prayana_travelers',
  'prayana_travelers_initialized',
  'prayana_active_trip',
  'prayana_expenses',
  'prayana_wishlist',
];

export function clearLegacyGlobalCache(): void {
  LEGACY_GLOBAL_KEYS.forEach(k => localStorage.removeItem(k));
}

export function getUserCacheKey(uid?: string): string {
  if (!uid || uid.startsWith('demo_')) return DEMO_CACHE_KEY;
  return `prayana_cache_${uid}`;
}

export function readUserCache(uid?: string): Record<string, any> {
  try {
    const raw = localStorage.getItem(getUserCacheKey(uid));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function writeUserCache(uid: string | undefined, patch: Record<string, any>): void {
  try {
    clearLegacyGlobalCache();
    const key = getUserCacheKey(uid);
    const existing = readUserCache(uid);
    localStorage.setItem(key, JSON.stringify({ ...existing, ...patch }));
  } catch {
    // ignore storage quota errors
  }
}

export function clearDemoCache(): void {
  localStorage.removeItem(DEMO_CACHE_KEY);
  localStorage.removeItem('prayana_auth_demo');
  clearLegacyGlobalCache();
}

function canSyncCloud(uid?: string): uid is string {
  return Boolean(db && isFirebaseConfigured && uid && !uid.startsWith('demo_') && auth?.currentUser?.uid === uid);
}

/**
 * Persist traveler cohort strictly scoped under users/{uid}/data/profiles + prayana_cache_{uid}
 */
export async function persistProfiles(
  profiles: TravelerProfile[],
  uid?: string,
  activeTravelerId?: string | null
): Promise<void> {
  try {
    const payload = {
      profiles,
      activeTravelerId: activeTravelerId ?? profiles[0]?.id ?? null,
      initialized: true,
      updatedAt: new Date().toISOString(),
    };
    writeUserCache(uid, {
      travelers: profiles,
      activeTravelerId: payload.activeTravelerId,
      initialized: true,
    });

    if (canSyncCloud(uid) && db) {
      await setDoc(doc(db, 'users', uid, 'data', 'profiles'), payload);
    }
  } catch (err) {
    console.warn('Firestore profile persistence warning:', err);
  }
}

/**
 * Persist active trip, active destination, ordered stops, and rebalance flag under users/{uid}/data/trip
 */
export async function persistTrip(
  trip: ActiveTrip,
  uid?: string,
  extras?: {
    activeDestinationId?: string;
    routeStops?: MonolithStop[];
    rebalanceApplied?: boolean;
  }
): Promise<void> {
  try {
    const payload = {
      activeTrip: trip,
      activeDestinationId: extras?.activeDestinationId ?? trip.destinationId,
      routeStops: extras?.routeStops,
      rebalanceApplied: extras?.rebalanceApplied ?? false,
      updatedAt: new Date().toISOString(),
    };
    writeUserCache(uid, {
      activeTrip: payload.activeTrip,
      activeDestinationId: payload.activeDestinationId,
      routeStops: payload.routeStops,
      rebalanceApplied: payload.rebalanceApplied,
    });

    if (canSyncCloud(uid) && db) {
      await setDoc(
        doc(db, 'users', uid, 'data', 'trip'),
        JSON.parse(JSON.stringify(payload)),
        { merge: true }
      );
    }
  } catch (err) {
    console.warn('Firestore trip persistence warning:', err);
  }
}

/**
 * Persist logged expenses under users/{uid}/data/expenses
 */
export async function persistExpenses(expenses: ExpenseItem[], uid?: string): Promise<void> {
  try {
    writeUserCache(uid, { expenses });
    if (canSyncCloud(uid) && db) {
      await setDoc(doc(db, 'users', uid, 'data', 'expenses'), {
        items: expenses,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Firestore expenses persistence warning:', err);
  }
}

/**
 * Persist user wishlist POI IDs under users/{uid}/data/wishlist
 */
export async function persistWishlist(wishlistIds: string[], uid?: string): Promise<void> {
  try {
    writeUserCache(uid, { wishlistIds });
    if (canSyncCloud(uid) && db) {
      await setDoc(doc(db, 'users', uid, 'data', 'wishlist'), {
        poiIds: wishlistIds,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Firestore wishlist persistence warning:', err);
  }
}

export async function fetchWishlist(uid?: string): Promise<string[]> {
  if (canSyncCloud(uid) && db) {
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'data', 'wishlist'));
      if (snap.exists()) {
        return snap.data().poiIds || [];
      }
    } catch (err) {
      console.warn('Firestore wishlist fetch failed:', err);
    }
  }
  const cache = readUserCache(uid);
  return Array.isArray(cache.wishlistIds) ? cache.wishlistIds : [];
}

/**
 * Fetch complete user workspace state from Cloud Firestore (strictly isolated per uid),
 * falling back ONLY to that uid's own `prayana_cache_{uid}` entry when offline.
 */
export async function fetchUserWorkspace(uid: string): Promise<UserWorkspaceSnapshot> {
  const snapshot: UserWorkspaceSnapshot = {};

  if (canSyncCloud(uid) && db) {
    try {
      const [profSnap, tripSnap, expSnap, wishSnap] = await Promise.all([
        getDoc(doc(db, 'users', uid, 'data', 'profiles')),
        getDoc(doc(db, 'users', uid, 'data', 'trip')),
        getDoc(doc(db, 'users', uid, 'data', 'expenses')),
        getDoc(doc(db, 'users', uid, 'data', 'wishlist')),
      ]);

      if (profSnap.exists()) {
        const d = profSnap.data();
        snapshot.profiles = {
          profiles: Array.isArray(d.profiles) ? d.profiles : [],
          activeTravelerId: d.activeTravelerId ?? null,
          initialized: d.initialized ?? true,
        };
      }
      if (tripSnap.exists()) {
        const d = tripSnap.data();
        snapshot.trip = {
          activeTrip: d.activeTrip,
          activeDestinationId: d.activeDestinationId,
          routeStops: d.routeStops,
          rebalanceApplied: d.rebalanceApplied,
        };
      }
      if (expSnap.exists()) {
        const d = expSnap.data();
        if (Array.isArray(d.items)) {
          snapshot.expenses = d.items;
        }
      }
      if (wishSnap.exists()) {
        const d = wishSnap.data();
        if (Array.isArray(d.poiIds)) {
          snapshot.wishlistIds = d.poiIds;
        }
      }

      // Sync fresh Firestore snapshot into this uid's isolated local cache only
      writeUserCache(uid, {
        travelers: snapshot.profiles?.profiles ?? [],
        activeTravelerId: snapshot.profiles?.activeTravelerId ?? null,
        activeTrip: snapshot.trip?.activeTrip,
        activeDestinationId: snapshot.trip?.activeDestinationId,
        routeStops: snapshot.trip?.routeStops,
        rebalanceApplied: snapshot.trip?.rebalanceApplied ?? false,
        expenses: snapshot.expenses ?? [],
        wishlistIds: snapshot.wishlistIds ?? [],
      });

      return snapshot;
    } catch (err) {
      console.warn('Firestore workspace hydrate error:', err);
    }
  }

  // Offline / unavailable fallback strictly scoped to prayana_cache_{uid}
  const cached = readUserCache(uid);
  if (Array.isArray(cached.travelers)) {
    snapshot.profiles = {
      profiles: cached.travelers,
      activeTravelerId: cached.activeTravelerId ?? null,
      initialized: Boolean(cached.initialized),
    };
  }
  if (cached.activeTrip) {
    snapshot.trip = {
      activeTrip: cached.activeTrip,
      activeDestinationId: cached.activeDestinationId,
      routeStops: cached.routeStops,
      rebalanceApplied: cached.rebalanceApplied,
    };
  }
  if (Array.isArray(cached.expenses)) {
    snapshot.expenses = cached.expenses;
  }
  if (Array.isArray(cached.wishlistIds)) {
    snapshot.wishlistIds = cached.wishlistIds;
  }

  return snapshot;
}
