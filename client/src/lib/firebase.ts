// Firebase configuration — supports TWO ways to connect, checked in order:
//
// 1) BUILD-TIME via environment variable VITE_FIREBASE_CONFIG (RECOMMENDED
//    for real deployments). Set it in your hosting provider's dashboard
//    (e.g. Cloudflare Pages → Settings → Environment Variables) to the full
//    Firebase config as one JSON string, e.g.:
//      {"apiKey":"...","authDomain":"...","projectId":"...","appId":"..."}
//    This gets baked into the build, so EVERY visitor (siswa, guru, admin,
//    on any device) automatically connects to the right project — nothing
//    to configure per-browser. This is the right approach when you deploy
//    one folder/build PER SCHOOL (separate Cloudflare project per school):
//    just set a different VITE_FIREBASE_CONFIG per deployment.
//
// 2) RUNTIME via localStorage (fallback, set from Admin → Firebase in the
//    app). Handy for quick testing without rebuilding, but only affects the
//    browser that set it — NOT other visitors. Don't rely on this for a
//    real multi-user school deployment; use (1) instead.
//
// If neither is set, the app runs on local mock/demo data.

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

function getEnvConfig(): FirebaseProjectConfig | null {
  try {
    const raw = import.meta.env.VITE_FIREBASE_CONFIG as string | undefined;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.apiKey || !parsed?.projectId) return null;
    return parsed;
  } catch {
    return null;
  }
}

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

/** True when the config came from the build-time env var — meaning it's the
 *  same for every visitor and the localStorage switcher in Admin should be
 *  treated as locked/informational rather than something to change. */
export const IS_FIREBASE_CONFIG_LOCKED_BY_ENV = getEnvConfig() !== null;

/** Saves a (possibly new) Firebase project config and reloads the page so
 *  every module reconnects cleanly against it. Only meaningful when NOT
 *  locked by env — see IS_FIREBASE_CONFIG_LOCKED_BY_ENV. */
export function setFirebaseConfigAndReload(config: FirebaseProjectConfig) {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  window.location.reload();
}

/** Disconnects from Firebase and falls back to local demo/mock data. */
export function clearFirebaseConfigAndReload() {
  localStorage.removeItem(CONFIG_STORAGE_KEY);
  window.location.reload();
}

/** The config actually in effect right now (env takes priority), for display. */
export function getActiveFirebaseConfig(): FirebaseProjectConfig | null {
  return getEnvConfig() ?? getSavedFirebaseConfig();
}

const activeConfig = getActiveFirebaseConfig();

// No project configured yet (brand new deployment) → run on local mock
// data so the app is still usable/explorable before a project is set up.
export const DEMO_MODE = !activeConfig;

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (activeConfig) {
  try {
    app = initializeApp(activeConfig);
    db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch (err) {
    console.error('Gagal terhubung ke project Firebase:', err);
  }
}

export { app, db };
