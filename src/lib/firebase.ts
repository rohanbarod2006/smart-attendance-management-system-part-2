import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

function normalizeEnvValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isMissingOrPlaceholder(value: unknown): boolean {
  const trimmed = normalizeEnvValue(value);
  if (!trimmed) return true;

  const lower = trimmed.toLowerCase();
  return (
    lower.startsWith('your_actual_') ||
    lower.startsWith('your_') ||
    lower.startsWith('my_') ||
    lower.startsWith('replace_with') ||
    lower.startsWith('placeholder') ||
    lower.startsWith('example') ||
    lower.startsWith('demo_') ||
    lower.includes('your_project_id') ||
    lower.includes('your-firebase') ||
    lower.includes('changeme') ||
    (lower.startsWith('<') && lower.endsWith('>')) ||
    /^x{3,}$/i.test(trimmed) ||
    lower === 'undefined' ||
    lower === 'null'
  );
}

const envEntries = [
  { envKey: 'VITE_FIREBASE_API_KEY', value: import.meta.env.VITE_FIREBASE_API_KEY },
  { envKey: 'VITE_FIREBASE_AUTH_DOMAIN', value: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN },
  { envKey: 'VITE_FIREBASE_PROJECT_ID', value: import.meta.env.VITE_FIREBASE_PROJECT_ID },
  { envKey: 'VITE_FIREBASE_STORAGE_BUCKET', value: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET },
  { envKey: 'VITE_FIREBASE_MESSAGING_SENDER_ID', value: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID },
  { envKey: 'VITE_FIREBASE_APP_ID', value: import.meta.env.VITE_FIREBASE_APP_ID },
] as const;

const invalidEnvVars = envEntries
  .filter((entry) => isMissingOrPlaceholder(entry.value))
  .map((entry) => entry.envKey);

const firebaseConfig: FirebaseOptions = {
  apiKey: normalizeEnvValue(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: normalizeEnvValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: normalizeEnvValue(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: normalizeEnvValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: normalizeEnvValue(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: normalizeEnvValue(import.meta.env.VITE_FIREBASE_APP_ID),
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let firebaseConfigError: string | null = null;

if (invalidEnvVars.length > 0) {
  firebaseConfigError = `Firebase Web App configuration in .env.local is missing or still uses placeholder values (${invalidEnvVars.join(', ')}). Add your real VITE_FIREBASE_* credentials and restart the dev server.`;
  console.warn(`[Firebase] ${firebaseConfigError}`);
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
