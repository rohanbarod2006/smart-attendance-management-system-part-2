/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { StudentDashboard } from './components/StudentDashboard.tsx';
import { TeacherDashboard } from './components/TeacherDashboard.tsx';
import { CreateSessionModal } from './components/CreateSessionModal.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { QRScannerModal } from './components/QRScannerModal.tsx';
import { VivaDocumentationModal } from './components/VivaDocumentationModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { QrCode, GraduationCap, Briefcase } from 'lucide-react';

function MainApp() {
  const { user, loading, missingProfileEmail, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'reports' | 'viva'>('dashboard');

  // Modals
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [authModalRole, setAuthModalRole] = useState<'student' | 'teacher'>('student');
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  const openAuthModal = (
    tab: 'login' | 'register' = 'login',
    role: 'student' | 'teacher' = 'student'
  ) => {
    setAuthModalRole(role);
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  useEffect(() => {
    if (missingProfileEmail) {
      setIsAuthModalOpen(true);
    }
  }, [missingProfileEmail]);

  // Only teachers may view attendance reports
  useEffect(() => {
    if (currentTab === 'reports' && !isTeacher) {
      setCurrentTab('dashboard');
    }
  }, [currentTab, isTeacher]);

  // Deep-link / scanned URL states (only students can scan attendance QR codes)
  const [deepLinkSessionId, setDeepLinkSessionId] = useState<string | null>(null);
  const [deepLinkToken, setDeepLinkToken] = useState<string | null>(null);

  // Check URL hash / search params on initial load for attendance links
  useEffect(() => {
    const handleUrlParams = () => {
      const hash = window.location.hash;
      const search = window.location.search;
      const paramString = hash.includes('?') ? hash.split('?')[1] : search.replace(/^\?/, '');

      if (paramString) {
        const params = new URLSearchParams(paramString);
        const sessionId = params.get('sessionId') || params.get('session');
        const token = params.get('token');

        if (sessionId && token) {
          setDeepLinkSessionId(sessionId.trim());
          setDeepLinkToken(token.trim());
          setIsScannerOpen(true);
        }
      }
    };

    handleUrlParams();
    window.addEventListener('hashchange', handleUrlParams);
    return () => window.removeEventListener('hashchange', handleUrlParams);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center animate-pulse mb-3 shadow-md">
          <QrCode className="w-6 h-6" />
        </div>
        <p className="text-xs font-semibold text-slate-600">Loading Smart Attendance System...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenCreateSession={isTeacher ? () => setIsCreateSessionOpen(true) : undefined}
        onOpenScanModal={isStudent ? () => setIsScannerOpen(true) : undefined}
        onOpenAccountPortal={() =>
          openAuthModal('login', isTeacher ? 'teacher' : 'student')
        }
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20">
        {currentTab === 'viva' ? (
          <VivaDocumentationModal />
        ) : !user ? (
          /* Landing & Role Portal Prompt */
          <div className="max-w-2xl mx-auto py-8 sm:py-12 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md">
              <QrCode className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Smart Attendance Management System Using QR Code
              </h1>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                Secure, browser-based student attendance verification designed for college lectures,
                practicals, and university compliance.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs max-w-lg mx-auto space-y-4">
              <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                Choose Your Portal to Continue
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-left flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-blue-900 mb-1">
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                      <span className="text-base font-bold">Student</span>
                    </div>
                    <p className="text-xs text-blue-800/80">
                      Sign in or create a student account to view attendance &amp; scan lecture QR codes.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openAuthModal('login', 'student')}
                      className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => openAuthModal('register', 'student')}
                      className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-white hover:bg-blue-100/60 text-blue-700 border border-blue-200 transition-colors"
                    >
                      Register
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-left flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-950 mb-1">
                      <Briefcase className="w-4 h-4 text-emerald-700" />
                      <span className="text-base font-bold">Teacher / Faculty</span>
                    </div>
                    <p className="text-xs text-emerald-900/80">
                      Sign in or register as faculty to manage classes, launch QR sessions, and track attendance.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openAuthModal('login', 'teacher')}
                      className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => openAuthModal('register', 'teacher')}
                      className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-white hover:bg-emerald-100/60 text-emerald-800 border border-emerald-200 transition-colors"
                    >
                      Register
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => openAuthModal('login', 'student')}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Open Account Portal
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentTab('viva')}
                  className="text-slate-500 hover:text-slate-800"
                >
                  View Viva Prep &amp; Docs
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Role-Based Authenticated Views: Teacher or Student */
          <div>
            {currentTab === 'dashboard' && (
              <>
                {isTeacher ? (
                  <TeacherDashboard
                    key={`teacher-${user.id}-${refreshKey}`}
                    onStartSession={() => setIsCreateSessionOpen(true)}
                    onViewReports={() => setCurrentTab('reports')}
                  />
                ) : (
                  <StudentDashboard
                    key={`student-${user.id}-${refreshKey}`}
                    onScanQR={() => setIsScannerOpen(true)}
                  />
                )}
              </>
            )}

            {currentTab === 'reports' && isTeacher && (
              <ReportsView key={`reports-${refreshKey}`} />
            )}
          </div>
        )}
      </main>

      {/* Bottom Status & Quick Navigation Footer */}
      <footer className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2.5 px-4 z-30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {user ? (
              <span className="text-slate-600">
                Signed in as <strong className="text-slate-900">{user.name}</strong>{' '}
                <span className="capitalize text-slate-500">({user.role})</span>
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAuthModal('login', 'student')}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  Student Portal
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('login', 'teacher')}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Teacher / Faculty
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentTab('viva')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 underline"
            >
              Viva &amp; ERD Guide
            </button>
            {user && (
              <button
                type="button"
                onClick={logout}
                className="text-xs text-slate-500 hover:text-red-600 transition-colors"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Role-Gated Modals */}
      {isTeacher && (
        <CreateSessionModal
          isOpen={isCreateSessionOpen}
          onClose={() => setIsCreateSessionOpen(false)}
          onSessionCreated={() => {
            setRefreshKey((prev) => prev + 1);
          }}
        />
      )}

      {isStudent && (
        <QRScannerModal
          isOpen={isScannerOpen}
          onClose={() => {
            setIsScannerOpen(false);
            setDeepLinkSessionId(null);
            setDeepLinkToken(null);
          }}
          initialSessionId={deepLinkSessionId}
          initialToken={deepLinkToken}
          onAttendanceMarked={() => {
            setRefreshKey((prev) => prev + 1);
          }}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={authModalTab}
        initialRole={authModalRole}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
