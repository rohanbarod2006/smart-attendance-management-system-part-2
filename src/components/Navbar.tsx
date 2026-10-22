import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { QrCode, LogOut, BookOpen, BarChart3, User, RefreshCw, FileText } from 'lucide-react';

interface NavbarProps {
  currentTab: 'dashboard' | 'reports' | 'viva';
  onSelectTab: (tab: 'dashboard' | 'reports' | 'viva') => void;
  onOpenCreateSession?: () => void;
  onOpenScanModal?: () => void;
  onOpenDemoSwitcher?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenCreateSession,
  onOpenScanModal,
  onOpenDemoSwitcher,
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4 sm:gap-8">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <button
              onClick={() => onSelectTab('dashboard')}
              className="text-left font-bold text-slate-900 tracking-tight text-lg whitespace-nowrap hover:text-blue-600 transition-colors"
            >
              SmartQR <span className="font-normal text-slate-500 text-sm hidden sm:inline">Attendance</span>
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-3 text-sm font-medium">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap text-xs sm:text-sm ${
                currentTab === 'dashboard'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Dashboard
            </button>

            {user?.role === 'teacher' && (
              <button
                onClick={() => onSelectTab('reports')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap text-xs sm:text-sm flex items-center gap-1.5 ${
                  currentTab === 'reports'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Reports
              </button>
            )}

            <button
              onClick={() => onSelectTab('viva')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap text-xs sm:text-sm flex items-center gap-1.5 ${
                currentTab === 'viva'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Project Docs & Viva
            </button>

            {onOpenDemoSwitcher && (
              <button
                onClick={onOpenDemoSwitcher}
                className="hidden md:flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
                title="Switch demo account"
              >
                <RefreshCw className="w-3 h-3 text-slate-500" />
                Demo Switcher
              </button>
            )}
          </nav>

          {/* Zone 3: Primary Action & Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {user ? (
              <>
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-900 truncate max-w-[140px]">{user.name}</span>
                  <span className="text-[11px] text-slate-500 capitalize">{user.role} {user.roll_number ? `(${user.roll_number})` : ''}</span>
                </div>

                {user.role === 'teacher' && onOpenCreateSession && (
                  <button
                    onClick={onOpenCreateSession}
                    className="px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shadow-xs flex items-center gap-1.5"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Start Session</span>
                  </button>
                )}

                {user.role === 'student' && onOpenScanModal && (
                  <button
                    onClick={onOpenScanModal}
                    className="px-3 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap shadow-xs flex items-center gap-1.5"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Scan QR</span>
                  </button>
                )}

                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-500">Not logged in</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
