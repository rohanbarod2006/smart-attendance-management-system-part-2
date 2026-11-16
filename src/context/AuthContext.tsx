import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, firebaseConfigError } from '../lib/firebase.ts';
import { User } from '../types.ts';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  rollNumber?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: string | null;
  missingProfileEmail: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  completeStudentProfile: (payload: { name: string; rollNumber?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LEGACY_AUTH_TOKEN_KEY = 'smart_attendance_jwt_user_id';

export function getFirebaseErrorMessage(err: unknown, fallback = 'Authentication failed. Please try again.'): string {
  const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: unknown }).code) : '';
  const rawMessage = err instanceof Error ? err.message : '';

  if (code.includes('api-key-not-valid') || rawMessage.includes('api-key-not-valid')) {
    return 'Firebase Web App configuration in .env.local is missing or invalid. Please add your valid Firebase credentials and restart the dev server.';
  }

  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact your college administrator.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'Network error while connecting to Firebase. Please check your internet connection.';
    case 'auth/operation-not-allowed':
      return 'Email/Password authentication is not enabled in your Firebase project.';
    case 'permission-denied':
      return 'Permission denied while accessing your profile. Verify your Firestore security rules.';
    case 'unavailable':
      return 'Cloud Firestore is temporarily unavailable. Please check your connection and try again.';
    default:
      return rawMessage || fallback;
  }
}

async function fetchUserProfile(firebaseUser: FirebaseUser): Promise<User | null> {
  if (!db) {
    throw new Error(firebaseConfigError || 'Cloud Firestore is not initialized.');
  }

  const userRef = doc(db, 'users', firebaseUser.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    return null;
  }

  const data = snap.data();
  const role: User['role'] =
    data.role === 'teacher' || data.role === 'admin' ? data.role : 'student';

  return {
    id: snap.id,
    name:
      typeof data.name === 'string' && data.name.trim()
        ? data.name
        : firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    email: typeof data.email === 'string' ? data.email : firebaseUser.email || '',
    role,
    roll_number: typeof data.roll_number === 'string' ? data.roll_number : null,
    created_at: typeof data.created_at === 'string' ? data.created_at : undefined,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [missingProfileEmail, setMissingProfileEmail] = useState<string | null>(null);

  // Prevents onAuthStateChanged from racing with in-flight login() or register() Firestore profile writes
  const activeAuthOpRef = useRef<boolean>(false);
  const authSeqRef = useRef<number>(0);

  const syncFromFirebaseUser = useCallback(async (firebaseUser: FirebaseUser | null) => {
    const seq = ++authSeqRef.current;

    if (!firebaseUser) {
      setUser(null);
      setMissingProfileEmail(null);
      setLoading(false);
      return;
    }

    try {
      const profile = await fetchUserProfile(firebaseUser);
      if (seq !== authSeqRef.current) return;

      if (!profile) {
        setUser(null);
        setMissingProfileEmail(firebaseUser.email || 'this account');
        setAuthError(
          'Your Firebase login succeeded, but no user profile exists in Firestore. Complete your student profile below or sign out.'
        );
      } else {
        setUser(profile);
        setMissingProfileEmail(null);
        setAuthError(null);
      }
    } catch (err) {
      if (seq !== authSeqRef.current) return;
      console.error('Failed to load user profile from Firestore:', err);
      setUser(null);
      setAuthError(getFirebaseErrorMessage(err, 'Failed to load your user profile.'));
    } finally {
      if (seq === authSeqRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!auth || !db) {
      setUser(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (!isMounted) return;
        if (activeAuthOpRef.current) return;
        await syncFromFirebaseUser(firebaseUser);
      },
      (err) => {
        if (!isMounted) return;
        console.error('Firebase auth listener error:', err);
        setUser(null);
        setAuthError(getFirebaseErrorMessage(err));
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [syncFromFirebaseUser]);

  const login = async (email: string, password: string) => {
    if (!auth || !db) {
      const msg =
        firebaseConfigError ||
        'Firebase is not configured. Please update .env.local and restart the dev server.';
      setAuthError(msg);
      throw new Error(msg);
    }

    activeAuthOpRef.current = true;
    setAuthError(null);

    try {
      const cleanEmail = email.trim();
      const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const profile = await fetchUserProfile(credential.user);

      if (!profile) {
        setUser(null);
        setMissingProfileEmail(credential.user.email || cleanEmail);
        const msg =
          'Your account signed in, but your Firestore profile was not found. Complete your student profile below to recover, or contact an administrator if this is a faculty account.';
        setAuthError(msg);
        throw new Error(msg);
      }

      setUser(profile);
      setMissingProfileEmail(null);
      setAuthError(null);
      setLoading(false);
    } catch (err) {
      const friendly = getFirebaseErrorMessage(err, 'Failed to sign in.');
      setAuthError(friendly);
      throw new Error(friendly);
    } finally {
      activeAuthOpRef.current = false;
    }
  };

  const register = async (payload: RegisterPayload) => {
    if (!auth || !db) {
      const msg =
        firebaseConfigError ||
        'Firebase is not configured. Please update .env.local and restart the dev server.';
      setAuthError(msg);
      throw new Error(msg);
    }

    activeAuthOpRef.current = true;
    setAuthError(null);

    const cleanName = payload.name.trim();
    const cleanEmail = payload.email.trim().toLowerCase();
    const cleanRollNumber = payload.rollNumber?.trim() || null;

    if (!cleanName) {
      activeAuthOpRef.current = false;
      throw new Error('Please enter your full name.');
    }

    let createdUser: FirebaseUser | null = null;

    try {
      const credential = await createUserWithEmailAndPassword(auth, cleanEmail, payload.password);
      createdUser = credential.user;

      // Best-effort Auth displayName sync
      await updateProfile(createdUser, { displayName: cleanName }).catch(() => {});

      // Public registration strictly assigns 'student' role
      const profileDoc: User = {
        id: createdUser.uid,
        name: cleanName,
        email: (createdUser.email || cleanEmail).toLowerCase(),
        role: 'student',
        roll_number: cleanRollNumber,
        created_at: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', createdUser.uid), profileDoc);

      setUser(profileDoc);
      setMissingProfileEmail(null);
      setAuthError(null);
      setLoading(false);
    } catch (err) {
      // If Auth account succeeded but Firestore profile creation failed, roll back orphaned Auth user
      if (createdUser) {
        try {
          await deleteUser(createdUser);
        } catch {
          await signOut(auth).catch(() => {});
        }
      }
      setUser(null);
      setMissingProfileEmail(null);

      const baseMsg = getFirebaseErrorMessage(err, 'Registration failed.');
      const message = createdUser
        ? `Account creation could not be completed because saving your Firestore profile failed (${baseMsg}). No incomplete session was saved.`
        : baseMsg;
      setAuthError(message);
      throw new Error(message);
    } finally {
      activeAuthOpRef.current = false;
    }
  };

  const completeStudentProfile = async (payload: { name: string; rollNumber?: string }) => {
    if (!auth || !db) {
      throw new Error(firebaseConfigError || 'Firebase is not configured.');
    }

    const current = auth.currentUser;
    if (!current) {
      throw new Error('Your authentication session expired. Please sign in again.');
    }

    const cleanName = payload.name.trim();
    if (!cleanName) {
      throw new Error('Please enter your full name.');
    }

    activeAuthOpRef.current = true;
    setAuthError(null);

    try {
      await updateProfile(current, { displayName: cleanName }).catch(() => {});

      const profileDoc: User = {
        id: current.uid,
        name: cleanName,
        email: (current.email || '').toLowerCase(),
        role: 'student',
        roll_number: payload.rollNumber?.trim() || null,
        created_at: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', current.uid), profileDoc);
      setUser(profileDoc);
      setMissingProfileEmail(null);
      setAuthError(null);
    } catch (err) {
      const friendly = getFirebaseErrorMessage(err, 'Failed to save your student profile.');
      setAuthError(friendly);
      throw new Error(friendly);
    } finally {
      activeAuthOpRef.current = false;
    }
  };

  const logout = async () => {
    activeAuthOpRef.current = true;
    try {
      localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
      if (auth) {
        await signOut(auth);
      }
      setUser(null);
      setMissingProfileEmail(null);
      setAuthError(null);
    } catch (err) {
      const friendly = getFirebaseErrorMessage(err, 'Failed to sign out.');
      setAuthError(friendly);
      throw new Error(friendly);
    } finally {
      activeAuthOpRef.current = false;
    }
  };

  const refreshUser = async () => {
    if (!auth || !db) {
      setUser(null);
      setLoading(false);
      return;
    }
    await syncFromFirebaseUser(auth.currentUser);
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        missingProfileEmail,
        login,
        register,
        completeStudentProfile,
        logout,
        refreshUser,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
