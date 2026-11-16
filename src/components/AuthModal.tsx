import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  AlertCircle,
  GraduationCap,
  Briefcase,
  X,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  initialTab?: 'login' | 'register';
  initialRole?: 'student' | 'teacher';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'login',
  initialRole = 'student',
}) => {
  const {
    login,
    register,
    registerTeacher,
    completeStudentProfile,
    logout,
    authError,
    missingProfileEmail,
    clearAuthError,
  } = useAuth();

  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher'>(initialRole);
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);

  // Shared login & student registration states
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [rollNumber, setRollNumber] = useState<string>('');

  // Teacher registration states
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [collegeName, setCollegeName] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [facultyId, setFacultyId] = useState<string>('');
  const [designation, setDesignation] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedRole(initialRole);
      setTab(initialTab);
      setError(null);
      clearAuthError();
    }
  }, [isOpen, initialTab, initialRole]);

  if (!isOpen) return null;

  const displayError = error || authError;

  const handleRoleChange = (nextRole: 'student' | 'teacher') => {
    setSelectedRole(nextRole);
    setError(null);
    clearAuthError();
  };

  const handleTabChange = (nextTab: 'login' | 'register') => {
    setTab(nextTab);
    setError(null);
    clearAuthError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    clearAuthError();

    if (selectedRole === 'teacher' && tab === 'register') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError('Please enter a valid email address.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Password and Confirm Password do not match.');
        return;
      }
      if (!collegeName.trim()) {
        setError('Please enter your College / Institution Name.');
        return;
      }
      if (!department.trim()) {
        setError('Please enter your Department.');
        return;
      }
      if (!facultyId.trim()) {
        setError('Please enter your Faculty ID / Employee ID.');
        return;
      }
      if (!designation.trim()) {
        setError('Please enter your Designation.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (tab === 'login') {
        await login(email, password, selectedRole);
      } else if (selectedRole === 'student') {
        await register({
          name,
          email,
          password,
          rollNumber,
        });
      } else {
        await registerTeacher({
          name,
          email,
          password,
          confirmPassword,
          collegeName,
          department,
          facultyId,
          designation,
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

  const isTeacher = selectedRole === 'teacher';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] overflow-y-auto border border-slate-200 relative my-auto">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-slate-100">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center mx-auto mb-2 shadow-xs">
            {isTeacher ? <Briefcase className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
          </div>
          <h2 className="text-lg font-bold text-slate-900">Smart Attendance Portal</h2>
          <p className="text-xs text-slate-500">
            {missingProfileEmail
              ? 'Complete your Firestore user profile to continue'
              : isTeacher
              ? 'Sign in or register as Teacher / Faculty to manage classes and QR sessions'
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
                  Your authentication succeeded, but no Firestore profile exists yet. Students can
                  complete their student profile below, or you can sign out and register again.
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
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  College Roll Number
                </label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. IT-2025-101"
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
              <span>Sign Out &amp; Use Another Account</span>
            </button>
          </div>
        ) : (
          <>
            {/* Role Selection Switcher */}
            <div className="px-6 pt-4 pb-3 bg-slate-50/70 border-b border-slate-200">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Select Account Type
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleRoleChange('student')}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                    selectedRole === 'student'
                      ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-xs ring-1 ring-blue-600/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      selectedRole === 'student'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold leading-tight">Student</span>
                    <span className="block text-[10px] text-slate-500 leading-tight mt-0.5">
                      Scan &amp; track
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleChange('teacher')}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                    selectedRole === 'teacher'
                      ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-xs ring-1 ring-blue-600/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      selectedRole === 'teacher'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold leading-tight">Teacher / Faculty</span>
                    <span className="block text-[10px] text-slate-500 leading-tight mt-0.5">
                      Faculty portal
                    </span>
                  </div>
                </button>
              </div>
            </div>

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
                {isTeacher ? 'Teacher Sign In' : 'Sign In with Email'}
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
                {isTeacher ? 'Teacher Registration' : 'Student Registration'}
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

              <form onSubmit={handleSubmit} className="space-y-3">
                {/* STUDENT REGISTRATION FIELDS */}
                {selectedRole === 'student' && tab === 'register' && (
                  <>
                    <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-900 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>
                        Student registration creates a <strong>Student</strong> account with
                        immediate access to QR attendance scanning and history.
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Enter your full name"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        College Roll Number
                      </label>
                      <input
                        type="text"
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        placeholder="e.g. IT-2025-101"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </>
                )}

                {/* TEACHER REGISTRATION FIELDS */}
                {isTeacher && tab === 'register' && (
                  <>
                    <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        Teacher registration creates a <strong>Faculty</strong> account with
                        immediate access to classes, lecture QR codes, and reports.
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        maxLength={120}
                        placeholder="Enter your full name"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder={isTeacher ? 'faculty@college.edu' : 'student@college.edu'}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={tab === 'register' ? 6 : undefined}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {isTeacher && tab === 'register' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        College / Institution Name
                      </label>
                      <input
                        type="text"
                        value={collegeName}
                        onChange={(e) => setCollegeName(e.target.value)}
                        required
                        maxLength={150}
                        placeholder="Enter college or institution name"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Department
                        </label>
                        <input
                          type="text"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          required
                          maxLength={120}
                          placeholder="e.g. Information Technology"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Faculty ID / Employee ID
                        </label>
                        <input
                          type="text"
                          value={facultyId}
                          onChange={(e) => setFacultyId(e.target.value)}
                          required
                          maxLength={60}
                          placeholder="e.g. FAC-204"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Designation
                      </label>
                      <input
                        type="text"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        required
                        maxLength={100}
                        placeholder="e.g. Assistant Professor"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50 mt-2"
                >
                  {isSubmitting
                    ? 'Processing...'
                    : tab === 'login'
                    ? isTeacher
                      ? 'Sign In as Teacher'
                      : 'Sign In'
                    : isTeacher
                    ? 'Create Teacher Account'
                    : 'Create Student Account'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
