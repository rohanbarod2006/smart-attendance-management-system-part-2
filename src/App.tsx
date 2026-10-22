/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { TeacherDashboard } from './components/TeacherDashboard.tsx';
import { StudentDashboard } from './components/StudentDashboard.tsx';
import { CreateSessionModal } from './components/CreateSessionModal.tsx';
import { QRScannerModal } from './components/QRScannerModal.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { VivaDocumentationModal } from './components/VivaDocumentationModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { QrCode, Shield, RefreshCw, UserCheck, CheckCircle2 } from 'lucide-react';

function MainApp() {
  const { user, loading, quickDemoLogin, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'reports' | 'viva'>('dashboard');

  // Modals
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Deep-link / scanned URL states
  const [deepLinkSessionId, setDeepLinkSessionId] = useState<number | null>(null);
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
          setDeepLinkSessionId(Number(sessionId));
          setDeepLinkToken(token);
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
        onOpenCreateSession={() => setIsCreateSessionOpen(true)}
        onOpenScanModal={() => setIsScannerOpen(true)}
        onOpenDemoSwitcher={() => setIsAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20">
        {!user ? (
          /* Landing & Login Prompt */
          <div className="max-w-2xl mx-auto py-8 sm:py-12 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md">
              <QrCode className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Smart Attendance Management System Using QR Code
              </h1>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                Secure, browser-based student attendance verification designed for college lectures, practicals, and university compliance.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs max-w-md mx-auto space-y-4">
              <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                Select a Role to Start
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => quickDemoLogin('teacher@college.edu')}
                  className="p-4 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 rounded-xl text-left transition-all group"
                >
                  <span className="text-base font-bold text-blue-900 block group-hover:text-blue-700">
                    Faculty / Teacher
                  </span>
                  <span className="text-xs text-blue-700/80 mt-1 block">
                    Generate session QR, display countdown & view live roster
                  </span>
                </button>

                <button
                  onClick={() => quickDemoLogin('student1@college.edu')}
                  className="p-4 bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200 rounded-xl text-left transition-all group"
                >
                  <span className="text-base font-bold text-emerald-900 block group-hover:text-emerald-700">
                    Student Portal
                  </span>
                  <span className="text-xs text-emerald-700/80 mt-1 block">
                    Scan lecture QR, check 75% rule & view history
                  </span>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Custom Login / Register
                </button>
                <button
                  onClick={() => setCurrentTab('viva')}
                  className="text-slate-500 hover:text-slate-800"
                >
                  View Viva Prep & Docs
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Authenticated Views */
          <div>
            {currentTab === 'dashboard' && (
              <>
                {user.role === 'teacher' || user.role === 'admin' ? (
                  <TeacherDashboard
                    onStartSession={() => setIsCreateSessionOpen(true)}
                    onViewReports={() => setCurrentTab('reports')}
                  />
                ) : (
                  <StudentDashboard onScanQR={() => setIsScannerOpen(true)} />
                )}
              </>
            )}

            {currentTab === 'reports' && (
              <ReportsView />
            )}

            {currentTab === 'viva' && (
              <VivaDocumentationModal />
            )}
          </div>
        )}
      </main>

      {/* Floating Demo Persona Switcher (Convenient bottom dock for college demo) */}
      <footer className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2.5 px-4 z-30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 hidden sm:inline">Demo Switcher:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => quickDemoLogin('teacher@college.edu')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  user?.email === 'teacher@college.edu'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Teacher (Prof. Rajesh)
              </button>
              <button
                onClick={() => quickDemoLogin('student1@college.edu')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  user?.email === 'student1@college.edu'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Student 1 (Aarav)
              </button>
              <button
                onClick={() => quickDemoLogin('student2@college.edu')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  user?.email === 'student2@college.edu'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Student 2 (Diya)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentTab('viva')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 underline"
            >
              Viva & ERD Guide
            </button>
            {user && (
              <button
                onClick={logout}
                className="text-xs text-slate-500 hover:text-red-600 transition-colors"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CreateSessionModal
        isOpen={isCreateSessionOpen}
        onClose={() => setIsCreateSessionOpen(false)}
        onSessionCreated={() => {
          // Stay in modal to view QR or close
        }}
      />

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
          // Success callback
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
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
