import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function isMissingOrPlaceholder(value: unknown): boolean {
  if (typeof value !== 'string') return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return (
    trimmed.startsWith('your_actual_') ||
    trimmed.startsWith('YOUR_') ||
    trimmed.startsWith('MY_') ||
    trimmed === 'undefined' ||
    trimmed === 'null'
  );
}

const invalidKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => isMissingOrPlaceholder(value))
  .map(([key]) => key);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let firebaseConfigError: string | null = null;

if (invalidKeys.length > 0) {
  firebaseConfigError =
    'Firebase Web App configuration in .env.local is missing or still uses placeholder values. Add your real VITE_FIREBASE_* credentials and restart the dev server.';
  console.warn(`[Firebase] ${firebaseConfigError} Invalid/missing keys: ${invalidKeys.join(', ')}`);
} else {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    firebaseConfigError =
      err instanceof Error
        ? `Firebase initialization failed: ${err.message}`
        : 'Firebase initialization failed due to invalid configuration.';
    console.warn(`[Firebase] ${firebaseConfigError}`);
    app = null;
    auth = null;
    db = null;
  }
}

export const isFirebaseConfigured: boolean = Boolean(app && auth && db);
export { app, auth, db, firebaseConfigError };
