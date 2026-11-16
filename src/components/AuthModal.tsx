import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { RefreshCw, AlertCircle, GraduationCap, CheckCircle, X, ShieldCheck, LogOut } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onDatabaseReset?: () => void;
  initialTab?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onDatabaseReset,
  initialTab = 'login',
}) => {
  const {
    login,
    register,
    completeStudentProfile,
    logout,
    authError,
    missingProfileEmail,
    clearAuthError,
  } = useAuth();

  const [tab, setTab] = useState<'login' | 'register'>(initialTab);

  // Form states (no hardcoded demo credentials)
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [rollNumber, setRollNumber] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setError(null);
      clearAuthError();
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const displayError = error || authError;

  const handleTabChange = (nextTab: 'login' | 'register') => {
    setTab(nextTab);
    setError(null);
    clearAuthError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    clearAuthError();

    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register({
          name,
          email,
          password,
          rollNumber,
        });
      }
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    clearAuthError();

    try {
      await completeStudentProfile({ name, rollNumber });
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to complete student profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecoverySignOut = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await logout();
    } catch (err: any) {
      setError(err.message || 'Failed to sign out');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetDb = async () => {
    if (!confirmingReset) {
      setConfirmingReset(true);
      return;
    }
    setConfirmingReset(false);
    setIsSubmitting(true);
    try {
      await api.resetDemoDatabase();
      setResetMessage('Local attendance demo data reset to 23 lectures!');
      if (onDatabaseReset) onDatabaseReset();
      setTimeout(() => setResetMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset demo data');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden relative">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-slate-100">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center mx-auto mb-2 shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Smart Attendance Portal</h2>
          <p className="text-xs text-slate-500">
            {missingProfileEmail
              ? 'Complete your Firestore user profile to continue'
              : 'Sign in with your Firebase account or register as a student'}
          </p>
        </div>

        {missingProfileEmail ? (
          /* Safe Recovery View when Auth succeeded but Firestore profile is missing */
          <div className="p-6 space-y-4">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">Profile missing for {missingProfileEmail}</p>
                <p className="mt-1 text-amber-800">
                  Your authentication succeeded, but no Firestore profile exists yet. Students can complete their student profile below. Faculty/Admin accounts must have their profile provisioned by an administrator.
                </p>
              </div>
            </div>

            {displayError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{displayError}</span>
              </div>
            )}

            <form onSubmit={handleCompleteProfile} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="e.g. Aarav Patel"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">College Roll Number</label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={e => setRollNumber(e.target.value)}
                  placeholder="e.g. SE-IT-106"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'Saving Profile...' : 'Complete Student Profile'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleRecoverySignOut}
              disabled={isSubmitting}
              className="w-full py-2 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out & Use Another Account</span>
            </button>
          </div>
        ) : (
          <>
            {/* Tab switch */}
            <div className="flex border-b border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleTabChange('login')}
                className={`flex-1 py-3 text-center border-b-2 transition-colors ${
                  tab === 'login'
                    ? 'border-blue-600 text-blue-600 bg-blue-50/20'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In with Email
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('register')}
                className={`flex-1 py-3 text-center border-b-2 transition-colors ${
                  tab === 'register'
                    ? 'border-blue-600 text-blue-600 bg-blue-50/20'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Student Registration
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6">
              {displayError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{displayError}</span>
                </div>
              )}

              {resetMessage && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{resetMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                {tab === 'register' && (
                  <>
                    <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-900 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>
                        Public registration creates a <strong>Student</strong> account. Faculty and admin accounts are provisioned separately by an administrator.
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        placeholder="e.g. Aarav Patel"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">College Roll Number</label>
                      <input
                        type="text"
                        value={rollNumber}
                        onChange={e => setRollNumber(e.target.value)}
                        placeholder="e.g. SE-IT-106"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="name@college.edu"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={tab === 'register' ? 6 : undefined}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50 mt-2"
                >
                  {isSubmitting
                    ? 'Processing...'
                    : tab === 'login'
                    ? 'Sign In'
                    : 'Create Student Account'}
                </button>
              </form>

              {/* Reset Local Attendance Data Action (pending Firestore attendance migration in Phases 3-5) */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{confirmingReset ? 'Reset local sample lectures & logs?' : 'Reset local attendance data?'}</span>
                <div className="flex items-center gap-2">
                  {confirmingReset && (
                    <button
                      type="button"
                      onClick={() => setConfirmingReset(false)}
                      className="text-slate-500 hover:text-slate-700 font-medium"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetDb}
                    disabled={isSubmitting}
                    className={`font-medium flex items-center gap-1 transition-colors ${
                      confirmingReset
                        ? 'text-red-600 hover:text-red-700 font-semibold'
                        : 'text-slate-600 hover:text-red-600'
                    }`}
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{confirmingReset ? 'Confirm Reset' : 'Reset Local Data'}</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
