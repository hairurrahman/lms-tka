// Firebase configuration for the LMS — now DYNAMIC so this exact same build
// can be reused by many schools: each school pastes its own Firebase
// project config (see Admin → Firebase), stored in this browser's
// localStorage. There is no hardcoded project anymore.
//
// Only Firestore is used — no Firebase Authentication. Guru, Admin, and
// Siswa are all plain Firestore documents with their own login check (see
// dataStore.ts: verifyStaffLogin / getUserByNisn). This means a brand new
// Firebase project only needs Firestore Database turned on — nothing to
// configure under Authentication.

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeFirestore, type Firestore } from 'firebase/firestore';

export interface FirebaseProjectConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
}

const CONFIG_STORAGE_KEY = 'lms_firebase_config';

export function getSavedFirebaseConfig(): FirebaseProjectConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.apiKey || !parsed?.projectId) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Saves a (possibly new) Firebase project config and reloads the page so
 *  every module reconnects cleanly against it. */
export function setFirebaseConfigAndReload(config: FirebaseProjectConfig) {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  window.location.reload();
}

/** Disconnects from Firebase and falls back to local demo/mock data. */
export function clearFirebaseConfigAndReload() {
  localStorage.removeItem(CONFIG_STORAGE_KEY);
  window.location.reload();
}

const savedConfig = getSavedFirebaseConfig();

// No project configured yet (brand new deployment) → run on local mock
// data so the app is still usable/explorable before an admin sets one up.
export const DEMO_MODE = !savedConfig;

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (savedConfig) {
  try {
    app = initializeApp(savedConfig);
    db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch (err) {
    console.error('Gagal terhubung ke project Firebase yang tersimpan:', err);
  }
}

export { app, db };
