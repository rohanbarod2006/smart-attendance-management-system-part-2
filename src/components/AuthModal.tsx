import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { LogIn, UserPlus, RefreshCw, AlertCircle, Shield, GraduationCap, CheckCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, quickDemoLogin } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Form states
  const [email, setEmail] = useState<string>('teacher@college.edu');
  const [password, setPassword] = useState<string>('password123');
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [rollNumber, setRollNumber] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register({
          name,
          email,
          password,
          role,
          rollNumber: role === 'student' ? rollNumber : undefined,
          classIds: role === 'student' ? [1] : [],
        });
      }
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoSwitch = async (demoEmail: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await quickDemoLogin(demoEmail);
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetDb = async () => {
    if (!confirm('Reset database to clean initial state? Past session data will be restored to default demo records.')) {
      return;
    }
    setIsSubmitting(true);
    try {
      await api.resetDemoDatabase();
      setResetMessage('Database successfully reset to clean demo state!');
      setTimeout(() => setResetMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset database');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-slate-100">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center mx-auto mb-2 shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Smart Attendance Portal</h2>
          <p className="text-xs text-slate-500">Sign in to record or manage college attendance</p>

          {/* Quick Demo Selector */}
          <div className="mt-4 p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-left">
            <span className="text-[11px] font-bold text-blue-900 block mb-1.5 flex items-center gap-1">
              <Shield className="w-3 h-3 text-blue-600" />
              1-Click Demo Login (for College Viva):
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleDemoSwitch('teacher@college.edu')}
                className="px-2.5 py-1.5 bg-white hover:bg-blue-100 border border-blue-200 rounded-md font-semibold text-blue-800 text-left truncate transition-colors"
                title="Prof. Rajesh Sharma (Teacher)"
              >
                👨‍🏫 Prof. Rajesh (Faculty)
              </button>
              <button
                type="button"
                onClick={() => handleDemoSwitch('student1@college.edu')}
                className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-200 rounded-md font-semibold text-emerald-800 text-left truncate transition-colors"
                title="Aarav Patel (Student, SE-IT-101)"
              >
                🎓 Aarav (Student)
              </button>
              <button
                type="button"
                onClick={() => handleDemoSwitch('student2@college.edu')}
                className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-200 rounded-md font-semibold text-emerald-800 text-left truncate transition-colors"
                title="Diya Sharma (Student, SE-IT-102)"
              >
                🎓 Diya (Student)
              </button>
              <button
                type="button"
                onClick={() => handleDemoSwitch('admin@college.edu')}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-md font-semibold text-slate-700 text-left truncate transition-colors"
                title="College Administrator"
              >
                🛡️ Admin Account
              </button>
            </div>

            {/* Quick 60-Student Selector */}
            <div className="mt-2.5 pt-2 border-t border-blue-200/50">
              <label className="block text-[10px] font-bold text-blue-900 mb-1">
                Or Select from all 60 Enrolled Students:
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleDemoSwitch(e.target.value);
                  }
                }}
                defaultValue=""
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-blue-300 rounded-md text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="" disabled>-- Choose from 60 Students (Roll 101 to 160) --</option>
                {Array.from({ length: 60 }).map((_, i) => {
                  const num = i + 1;
                  const roll = `SE-IT-${100 + num}`;
                  const email = `student${num}@college.edu`;
                  return (
                    <option key={num} value={email}>
                      Student #{num} ({roll}) - {email}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('login')}
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
            onClick={() => setTab('register')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              tab === 'register'
                ? 'border-blue-600 text-blue-600 bg-blue-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
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
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Account Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`py-1.5 px-3 text-xs font-semibold rounded-lg border transition-colors ${
                        role === 'student'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('teacher')}
                      className={`py-1.5 px-3 text-xs font-semibold rounded-lg border transition-colors ${
                        role === 'teacher'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Teacher / Faculty
                    </button>
                  </div>
                </div>

                {role === 'student' && (
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
                )}
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
                placeholder="••••••••"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50 mt-2"
            >
              {isSubmitting ? 'Processing...' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Reset Demo Database Action */}
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Reset test data?</span>
            <button
              type="button"
              onClick={handleResetDb}
              disabled={isSubmitting}
              className="text-slate-600 hover:text-red-600 font-medium flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset SQLite Database</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
