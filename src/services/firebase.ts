/**
 * PRAYANA — Firebase Auth & Cloud Firestore Persistence Service
 * 
 * Configures Firebase Auth + Firestore for traveler profiles, active trips, bucket list POIs,
 * and expenses, with seamless offline-first fallback to localStorage + preloaded demo state.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { 
  getAuth, 
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { TravelerProfile, ActiveTrip, ExpenseItem, MonolithStop } from '../types';

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
export let auth: Auth | null = null;

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
    console.info('PRAYANA: Firebase Cloud Firestore & Auth initialized successfully.');
  } catch (err) {
    console.warn('PRAYANA: Firebase initialization warning, using offline fallback:', err);
  }
} else {
  console.info('PRAYANA: Running in Offline-First Demo Persistence mode (localStorage backed).');
}

export function getPersistenceStatus(): { isCloudActive: boolean; storageDriver: string } {
  return {
    isCloudActive: isFirebaseConfigured && db !== null,
    storageDriver: isFirebaseConfigured && db !== null ? 'Cloud Firestore' : 'Local Architectural Cache',
  };
}

/**
 * Sign In with Email & Password (with graceful local fallback)
 */
export async function signInWithEmail(email: string, pass: string): Promise<AuthUser> {
  if (auth && isFirebaseConfigured) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const user: AuthUser = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || email.split('@')[0],
        photoURL: cred.user.photoURL,
        isDemo: false,
      };
      localStorage.setItem('prayana_auth_user', JSON.stringify(user));
      return user;
    } catch (err: any) {
      console.warn('Firebase signIn failed, evaluating fallback:', err);
      throw err;
    }
  }

  // Graceful offline mock authentication
  if (!email || !email.includes('@')) {
    throw new Error('auth/invalid-email');
  }
  if (!pass || pass.length < 6) {
    throw new Error('auth/weak-password');
  }

  const mockUser: AuthUser = {
    uid: `demo_user_${Date.now()}`,
    email,
    displayName: email.split('@')[0].toUpperCase(),
    isDemo: true,
  };
  localStorage.setItem('prayana_auth_user', JSON.stringify(mockUser));
  return mockUser;
}

/**
 * Sign Up with Email, Password & Display Name
 */
export async function signUpWithEmail(email: string, pass: string, displayName: string): Promise<AuthUser> {
  if (auth && isFirebaseConfigured) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
      const user: AuthUser = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: displayName || email.split('@')[0],
        photoURL: cred.user.photoURL,
        isDemo: false,
      };
      localStorage.setItem('prayana_auth_user', JSON.stringify(user));
      return user;
    } catch (err: any) {
      console.warn('Firebase signUp failed:', err);
      throw err;
    }
  }

  // Graceful offline mock signup
  if (!email || !email.includes('@')) {
    throw new Error('auth/invalid-email');
  }
  if (!pass || pass.length < 6) {
    throw new Error('auth/weak-password');
  }

  const mockUser: AuthUser = {
    uid: `traveler_${Date.now()}`,
    email,
    displayName: displayName || email.split('@')[0].toUpperCase(),
    isDemo: true,
  };
  localStorage.setItem('prayana_auth_user', JSON.stringify(mockUser));
  return mockUser;
}

/**
 * Sign In with Google Provider
 */
export async function signInWithGoogle(): Promise<AuthUser> {
  if (auth && isFirebaseConfigured) {
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const user: AuthUser = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || 'Google Explorer',
        photoURL: cred.user.photoURL,
        isDemo: false,
      };
      localStorage.setItem('prayana_auth_user', JSON.stringify(user));
      return user;
    } catch (err: any) {
      console.warn('Firebase Google Auth popup failed/cancelled:', err);
      // If user closed popup, rethrow; otherwise allow graceful mock fallback
      if (err.code === 'auth/popup-closed-by-user') {
        throw err;
      }
    }
  }

  // Offline mock Google sign-in
  const mockUser: AuthUser = {
    uid: `google_explorer_${Date.now()}`,
    email: 'explorer@prayana.arch',
    displayName: 'Aarav Chen (Google Verified)',
    isDemo: true,
  };
  localStorage.setItem('prayana_auth_user', JSON.stringify(mockUser));
  return mockUser;
}

/**
 * Sign Out User
 */
export async function signOutUser(): Promise<void> {
  if (auth && isFirebaseConfigured) {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Firebase signOut warning:', e);
    }
  }
  localStorage.removeItem('prayana_auth_user');
  localStorage.removeItem('prayana_auth_authenticated');
}

/**
 * Subscribe to Auth State Changes
 */
export function subscribeToAuth(callback: (user: AuthUser | null) => void): () => void {
  if (auth && isFirebaseConfigured) {
    return onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const u: AuthUser = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Traveler',
          photoURL: fbUser.photoURL,
          isDemo: false,
        };
        callback(u);
      } else {
        const cached = localStorage.getItem('prayana_auth_user');
        callback(cached ? JSON.parse(cached) : null);
      }
    });
  }

  const cached = localStorage.getItem('prayana_auth_user');
  callback(cached ? JSON.parse(cached) : null);
  return () => {};
}

/**
 * Saves traveler profiles to Firestore (or localStorage fallback)
 */
export async function persistProfiles(profiles: TravelerProfile[], userId: string = 'demo_user'): Promise<void> {
  localStorage.setItem('prayana_travelers', JSON.stringify(profiles));
  if (db) {
    try {
      await setDoc(doc(db, 'users', userId), { profiles, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.warn('Firestore write failed, cached locally:', e);
    }
  }
}

/**
 * Loads traveler profiles from Firestore (or localStorage fallback)
 */
export async function fetchProfiles(userId: string = 'demo_user'): Promise<TravelerProfile[] | null> {
  if (db) {
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      if (snap.exists() && snap.data()?.profiles) {
        return snap.data().profiles as TravelerProfile[];
      }
    } catch (e) {
      console.warn('Firestore read failed, reading local cache:', e);
    }
  }
  const local = localStorage.getItem('prayana_travelers');
  return local ? JSON.parse(local) : null;
}

/**
 * Saves active trip state
 */
export async function persistTrip(trip: ActiveTrip, userId: string = 'demo_user'): Promise<void> {
  localStorage.setItem('prayana_active_trip', JSON.stringify(trip));
  if (db) {
    try {
      await setDoc(doc(db, 'trips', `${userId}_active`), { trip, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.warn('Firestore trip write failed:', e);
    }
  }
}

/**
 * Saves personal bucket list POIs
 */
export async function persistWishlist(wishlistIds: string[], userId: string = 'demo_user'): Promise<void> {
  localStorage.setItem('prayana_wishlist', JSON.stringify(wishlistIds));
  if (db) {
    try {
      await setDoc(doc(db, 'wishlists', userId), { wishlistIds, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.warn('Firestore wishlist write failed:', e);
    }
  }
}

/**
 * Loads personal bucket list POIs
 */
export async function fetchWishlist(userId: string = 'demo_user'): Promise<string[]> {
  if (db) {
    try {
      const snap = await getDoc(doc(db, 'wishlists', userId));
      if (snap.exists() && snap.data()?.wishlistIds) {
        return snap.data().wishlistIds as string[];
      }
    } catch (e) {
      console.warn('Firestore wishlist read failed:', e);
    }
  }
  const local = localStorage.getItem('prayana_wishlist');
  return local ? JSON.parse(local) : ['hmp-4', 'crg-1', 'kyo-1', 'vns-1'];
}
