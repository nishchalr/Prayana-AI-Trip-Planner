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
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  runTransaction,
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
import {
  ActiveTrip,
  ConnectedFriend,
  ExpenseItem,
  FriendInvite,
  MonolithStop,
  TravelerProfile,
} from '../types';

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
    const sanitizedPayload = JSON.parse(JSON.stringify(payload));
    writeUserCache(uid, {
      travelers: sanitizedPayload.profiles,
      activeTravelerId: sanitizedPayload.activeTravelerId,
      initialized: true,
    });

    if (canSyncCloud(uid) && db) {
      await setDoc(doc(db, 'users', uid, 'data', 'profiles'), sanitizedPayload);
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
    const cleanExpenses = JSON.parse(JSON.stringify(expenses));
    writeUserCache(uid, { expenses: cleanExpenses });
    if (canSyncCloud(uid) && db) {
      await setDoc(doc(db, 'users', uid, 'data', 'expenses'), {
        items: cleanExpenses,
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
    const cleanWishlist = JSON.parse(JSON.stringify(wishlistIds));
    writeUserCache(uid, { wishlistIds: cleanWishlist });
    if (canSyncCloud(uid) && db) {
      await setDoc(doc(db, 'users', uid, 'data', 'wishlist'), {
        poiIds: cleanWishlist,
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

// ============================================================================
// Username Uniqueness, DOB Age Helper & Friend @username Invite Graph
// ============================================================================

export function computeAgeFromDob(dob?: string, fallbackAge = 28): number {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return fallbackAge;
  const birth = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return fallbackAge;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return Math.max(1, Math.min(120, age));
}

export function sanitizeUsername(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24);
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,24}$/.test(username);
}

function stripUndefined<T>(val: T): T {
  return JSON.parse(JSON.stringify(val)) as T;
}

export async function checkUsernameAvailability(
  rawUsername: string,
  currentUid?: string
): Promise<{ available: boolean; username: string; reason?: string }> {
  const username = sanitizeUsername(rawUsername);
  if (!isValidUsername(username)) {
    return {
      available: false,
      username,
      reason: 'Use 3–24 lowercase letters, numbers, or underscores.',
    };
  }
  if (!canSyncCloud(currentUid) || !db) {
    return { available: true, username };
  }
  try {
    const snap = await getDoc(doc(db, 'usernames', username));
    if (!snap.exists()) {
      return { available: true, username };
    }
    const data = snap.data();
    if (data?.uid === currentUid) {
      return { available: true, username };
    }
    return {
      available: false,
      username,
      reason: `@${username} is already taken.`,
    };
  } catch (err: any) {
    console.warn('Username availability check warning:', err);
    return {
      available: false,
      username,
      reason: 'Unable to verify username right now.',
    };
  }
}

export async function claimUsernameAndUpdateRoot(params: {
  uid?: string;
  username: string;
  displayName: string;
  dob: string;
  oldUsername?: string;
}): Promise<string> {
  const cleanUsername = sanitizeUsername(params.username);
  if (!isValidUsername(cleanUsername)) {
    throw new Error('Username must be 3–24 lowercase characters (a–z, 0–9, _).');
  }
  const cleanName = params.displayName.trim() || cleanUsername;
  const nowIso = new Date().toISOString();

  if (!canSyncCloud(params.uid) || !db) {
    writeUserCache(params.uid, { username: cleanUsername, dob: params.dob });
    return cleanUsername;
  }

  const uid = params.uid;
  const firestoreDb = db;
  const oldClean = params.oldUsername ? sanitizeUsername(params.oldUsername) : undefined;

  await runTransaction(firestoreDb, async (tx) => {
    const targetRef = doc(firestoreDb, 'usernames', cleanUsername);
    const targetSnap = await tx.get(targetRef);

    if (targetSnap.exists() && targetSnap.data()?.uid !== uid) {
      throw new Error(`@${cleanUsername} is already taken by another traveler.`);
    }

    let oldSnap: any = null;
    if (oldClean && oldClean !== cleanUsername) {
      const oldRef = doc(firestoreDb, 'usernames', oldClean);
      oldSnap = await tx.get(oldRef);
    }

    const existingCreated = targetSnap.exists() ? targetSnap.data()?.createdAt : undefined;
    tx.set(targetRef, {
      uid,
      username: cleanUsername,
      displayName: cleanName,
      createdAt: existingCreated || nowIso,
      updatedAt: nowIso,
    });

    if (oldSnap && oldSnap.exists() && oldSnap.data()?.uid === uid && oldClean) {
      tx.delete(doc(firestoreDb, 'usernames', oldClean));
    }

    tx.set(
      doc(firestoreDb, 'users', uid),
      {
        uid,
        username: cleanUsername,
        dob: params.dob,
        displayName: cleanName,
        updatedAt: nowIso,
      },
      { merge: true }
    );
  });

  writeUserCache(uid, { username: cleanUsername, dob: params.dob });
  return cleanUsername;
}

export async function lookupUserByUsername(
  rawUsername: string,
  currentUid?: string
): Promise<{ uid: string; username: string; displayName: string } | null> {
  const username = sanitizeUsername(rawUsername);
  if (!isValidUsername(username)) return null;
  if (!canSyncCloud(currentUid) || !db) return null;

  const snap = await getDoc(doc(db, 'usernames', username));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (!data?.uid || !data?.username) return null;
  return {
    uid: String(data.uid),
    username: String(data.username),
    displayName: String(data.displayName || `@${data.username}`),
  };
}

export async function sendFriendInvite(params: {
  fromUid: string;
  fromUsername: string;
  fromName: string;
  fromProfile: TravelerProfile;
  toUid: string;
  toUsername: string;
}): Promise<FriendInvite> {
  if (!canSyncCloud(params.fromUid) || !db) {
    throw new Error('Sign in with a cloud account to send @username invites.');
  }
  if (params.fromUid === params.toUid) {
    throw new Error('You cannot send a friend invite to yourself.');
  }

  const nowIso = new Date().toISOString();
  const id = `${params.fromUid}_${params.toUid}_${Date.now()}`;
  const cleanFromProfile = stripUndefined({
    ...params.fromProfile,
    isPrimarySelf: false,
    ownerUid: params.fromUid,
    username: sanitizeUsername(params.fromUsername),
  });

  const invite: FriendInvite = {
    id,
    fromUid: params.fromUid,
    fromUsername: sanitizeUsername(params.fromUsername),
    fromName: params.fromName.trim() || params.fromUsername,
    fromProfile: cleanFromProfile,
    toUid: params.toUid,
    toUsername: sanitizeUsername(params.toUsername),
    status: 'PENDING',
    createdAt: nowIso,
  };

  await setDoc(doc(db, 'friendInvites', id), stripUndefined(invite));
  return invite;
}

export function normalizeFriendProfileSnapshot(
  rawProfile: TravelerProfile,
  uid: string,
  username: string,
  fallbackName: string
): TravelerProfile {
  return {
    ...rawProfile,
    id: `friend-${uid}`,
    name: rawProfile?.name || fallbackName || `@${username}`,
    username: sanitizeUsername(rawProfile?.username || username),
    dob: rawProfile?.dob,
    age: rawProfile?.dob
      ? computeAgeFromDob(rawProfile.dob, rawProfile?.age || 28)
      : rawProfile?.age || 28,
    isPrimarySelf: false,
    isPrimary: false,
    ownerUid: uid,
    mobility: rawProfile?.mobility || 'Full Mobility',
    medicalFlags: Array.isArray(rawProfile?.medicalFlags) ? rawProfile.medicalFlags : [],
    dietaryTags: Array.isArray(rawProfile?.dietaryTags) ? rawProfile.dietaryTags : [],
    vibeProfile: rawProfile?.vibeProfile || 'Cultural Explorer',
    fitbandConnected: Boolean(rawProfile?.fitbandConnected),
    wearableStatus: rawProfile?.wearableStatus || 'UNPAIRED',
    travelInsuranceId: rawProfile?.travelInsuranceId || 'CONNECTED-FRIEND',
    emergencyContact: rawProfile?.emergencyContact || {
      name: 'Friend Contact',
      phone: '',
      relation: 'Companion',
    },
    vitals: rawProfile?.vitals || {
      heartRate: 72,
      spO2: 99,
      steps: 4500,
      strainLevel: 'LOW',
      ambientWbgt: 26.5,
      lastSync: 'friend sync',
    },
  };
}

export async function saveConnectedFriend(
  ownerUid: string,
  friend: ConnectedFriend
): Promise<void> {
  if (!canSyncCloud(ownerUid) || !db) return;
  const payload = stripUndefined({
    uid: friend.uid,
    username: sanitizeUsername(friend.username),
    name: friend.name,
    connectedAt: friend.connectedAt,
    updatedAt: new Date().toISOString(),
    profile: normalizeFriendProfileSnapshot(
      friend.profile,
      friend.uid,
      friend.username,
      friend.name
    ),
  });
  await setDoc(doc(db, 'users', ownerUid, 'connectedFriends', friend.uid), payload);
}

export async function respondToFriendInvite(params: {
  invite: FriendInvite;
  responderUid: string;
  myPrimaryProfile: TravelerProfile | null;
  decision: 'ACCEPTED' | 'DECLINED';
}): Promise<ConnectedFriend | null> {
  if (!canSyncCloud(params.responderUid) || !db) {
    throw new Error('Sign in with a cloud account to respond to invites.');
  }

  const nowIso = new Date().toISOString();
  const inviteRef = doc(db, 'friendInvites', params.invite.id);

  if (params.decision === 'DECLINED') {
    await updateDoc(inviteRef, {
      status: 'DECLINED',
      respondedAt: nowIso,
    });
    return null;
  }

  const responderUsername = sanitizeUsername(
    params.myPrimaryProfile?.username || params.invite.toUsername
  );
  const mySnapshot = params.myPrimaryProfile
    ? stripUndefined({
        ...params.myPrimaryProfile,
        isPrimarySelf: false,
        ownerUid: params.responderUid,
        username: responderUsername,
      })
    : undefined;

  await updateDoc(
    inviteRef,
    stripUndefined({
      status: 'ACCEPTED',
      respondedAt: nowIso,
      ...(mySnapshot ? { toName: mySnapshot.name, toProfile: mySnapshot } : {}),
    })
  );

  const connectedFriend: ConnectedFriend = {
    uid: params.invite.fromUid,
    username: sanitizeUsername(params.invite.fromUsername),
    name: params.invite.fromName,
    connectedAt: nowIso,
    updatedAt: nowIso,
    profile: normalizeFriendProfileSnapshot(
      params.invite.fromProfile,
      params.invite.fromUid,
      params.invite.fromUsername,
      params.invite.fromName
    ),
  };

  await saveConnectedFriend(params.responderUid, connectedFriend);
  await ensureFriendshipDoc(
    params.responderUid,
    params.invite.fromUid,
    { username: responderUsername, name: mySnapshot?.name || params.invite.toName || responderUsername },
    { username: params.invite.fromUsername, name: params.invite.fromName }
  );
  return connectedFriend;
}

export function getFriendshipId(uidA: string, uidB: string): string {
  return uidA < uidB ? `${uidA}_${uidB}` : `${uidB}_${uidA}`;
}

export async function ensureFriendshipDoc(
  uidA: string,
  uidB: string,
  metaA: { username: string; name: string },
  metaB: { username: string; name: string }
): Promise<void> {
  if (!canSyncCloud(uidA) || !db || !uidA || !uidB || uidA === uidB) return;
  const pairId = getFriendshipId(uidA, uidB);
  const uids = uidA < uidB ? [uidA, uidB] : [uidB, uidA];
  await setDoc(
    doc(db, 'friendships', pairId),
    stripUndefined({
      id: pairId,
      uids,
      users: {
        [uidA]: { uid: uidA, username: sanitizeUsername(metaA.username), name: metaA.name },
        [uidB]: { uid: uidB, username: sanitizeUsername(metaB.username), name: metaB.name },
      },
      createdAt: new Date().toISOString(),
    }),
    { merge: true }
  );
}

export async function unfriendConnection(myUid: string, friendUid: string): Promise<void> {
  const cached = readUserCache(myUid);
  if (Array.isArray(cached.connectedFriends)) {
    writeUserCache(myUid, {
      connectedFriends: cached.connectedFriends.filter((f: ConnectedFriend) => f.uid !== friendUid),
    });
  }
  if (!canSyncCloud(myUid) || !db) return;
  const pairId = getFriendshipId(myUid, friendUid);
  await Promise.allSettled([
    deleteDoc(doc(db, 'friendships', pairId)),
    deleteDoc(doc(db, 'users', myUid, 'connectedFriends', friendUid)),
  ]);
}

export async function fetchFriendProfilesList(friendUid: string): Promise<TravelerProfile[]> {
  if (!db || !friendUid) return [];
  try {
    const snap = await getDoc(doc(db, 'users', friendUid, 'data', 'profiles'));
    if (!snap.exists()) return [];
    const data = snap.data();
    const list = Array.isArray(data?.profiles) ? (data.profiles as TravelerProfile[]) : [];
    return list.map((p) => ({
      ...p,
      ownerUid: friendUid,
      isPrimarySelf: false,
    }));
  } catch {
    return [];
  }
}

export function subscribeToFriendships(
  uid: string,
  onFriendships: (docs: Array<{ id: string; uids: string[]; users?: Record<string, { uid: string; username: string; name: string }> }>) => void
): () => void {
  if (!canSyncCloud(uid) || !db) return () => {};
  return onSnapshot(
    query(collection(db, 'friendships'), where('uids', 'array-contains', uid)),
    (snap) => {
      onFriendships(snap.docs.map((d) => d.data() as any));
    },
    (err) => console.warn('Friendships listener warning:', err)
  );
}

export async function cancelFriendInvite(inviteId: string, uid?: string): Promise<void> {
  if (!canSyncCloud(uid) || !db) return;
  await deleteDoc(doc(db, 'friendInvites', inviteId));
}

export async function fetchFriendNetworkSnapshot(uid: string): Promise<{
  incomingInvites: FriendInvite[];
  outgoingInvites: FriendInvite[];
  connectedFriends: ConnectedFriend[];
}> {
  if (!canSyncCloud(uid) || !db) {
    const cached = readUserCache(uid);
    return {
      incomingInvites: [],
      outgoingInvites: [],
      connectedFriends: Array.isArray(cached.connectedFriends) ? cached.connectedFriends : [],
    };
  }

  const [inSnap, outSnap, friendsSnap] = await Promise.all([
    getDocs(query(collection(db, 'friendInvites'), where('toUid', '==', uid))),
    getDocs(query(collection(db, 'friendInvites'), where('fromUid', '==', uid))),
    getDocs(collection(db, 'users', uid, 'connectedFriends')),
  ]);

  const incomingInvites = inSnap.docs.map((d) => d.data() as FriendInvite);
  const outgoingInvites = outSnap.docs.map((d) => d.data() as FriendInvite);
  const connectedFriends = friendsSnap.docs.map((d) => d.data() as ConnectedFriend);

  writeUserCache(uid, { connectedFriends });
  return { incomingInvites, outgoingInvites, connectedFriends };
}

export function subscribeToFriendNetwork(
  uid: string,
  handlers: {
    onIncoming: (invites: FriendInvite[]) => void;
    onOutgoing: (invites: FriendInvite[]) => void;
    onFriends: (friends: ConnectedFriend[]) => void;
  }
): () => void {
  if (!canSyncCloud(uid) || !db) {
    return () => {};
  }

  const unsubIn = onSnapshot(
    query(collection(db, 'friendInvites'), where('toUid', '==', uid)),
    (snap) => {
      handlers.onIncoming(snap.docs.map((d) => d.data() as FriendInvite));
    },
    (err) => console.warn('Incoming invites listener warning:', err)
  );

  const unsubOut = onSnapshot(
    query(collection(db, 'friendInvites'), where('fromUid', '==', uid)),
    (snap) => {
      handlers.onOutgoing(snap.docs.map((d) => d.data() as FriendInvite));
    },
    (err) => console.warn('Outgoing invites listener warning:', err)
  );

  const unsubFriends = onSnapshot(
    collection(db, 'users', uid, 'connectedFriends'),
    (snap) => {
      const list = snap.docs.map((d) => d.data() as ConnectedFriend);
      writeUserCache(uid, { connectedFriends: list });
      handlers.onFriends(list);
    },
    (err) => console.warn('Connected friends listener warning:', err)
  );

  return () => {
    unsubIn();
    unsubOut();
    unsubFriends();
  };
}
