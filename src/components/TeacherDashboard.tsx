import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { TeacherDashboardStats, AttendanceSession } from '../types.ts';
import {
  Users,
  QrCode,
  CheckCircle,
  Clock,
  Play,
  StopCircle,
  BarChart2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

interface TeacherDashboardProps {
  onStartSession: () => void;
  onViewReports: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  onStartSession,
  onViewReports,
}) => {
  const [stats, setStats] = useState<TeacherDashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedActiveSessionId, setSelectedActiveSessionId] = useState<number | null>(null);
  const [activeSessionLiveData, setActiveSessionLiveData] = useState<{
    session: AttendanceSession;
    records: any[];
    presentCount: number;
    totalEnrolled: number;
    absentStudents: any[];
  } | null>(null);

  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const fetchStats = async () => {
    try {
      const data = await api.getTeacherStats();
      setStats(data);
      if (data.activeSessions && data.activeSessions.length > 0) {
        setSelectedActiveSessionId(data.activeSessions[0].id);
      } else {
        setSelectedActiveSessionId(null);
        setActiveSessionLiveData(null);
      }
    } catch (err) {
      console.error('Failed to load teacher dashboard stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Poll active session attendees every 3 seconds for real-time live attendance
  useEffect(() => {
    if (!selectedActiveSessionId) {
      setActiveSessionLiveData(null);
      return;
    }

    const fetchLiveSession = async () => {
      try {
        const live = await api.getSessionLive(selectedActiveSessionId);
        setActiveSessionLiveData(live);

        // Calculate countdown
        const expiry = new Date(live.session.expiry_time).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.floor((expiry - now) / 1000));

        if (diff === 0) {
          setTimeRemaining('Expired');
          fetchStats(); // refresh overview
        } else {
          const mins = Math.floor(diff / 60);
          const secs = diff % 60;
          setTimeRemaining(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
        }
      } catch (err) {
        console.warn('Failed to poll live session:', err);
      }
    };

    fetchLiveSession();
    const interval = setInterval(fetchLiveSession, 3000);
    return () => clearInterval(interval);
  }, [selectedActiveSessionId]);

  const handleCloseSession = async (sessionId: number) => {
    try {
      await api.closeSession(sessionId);
      fetchStats();
    } catch (err: any) {
      alert(err.message || 'Failed to close session');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Teacher Attendance Portal
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time session monitoring, instant QR generation, and student verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchStats();
            }}
            disabled={refreshing}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onViewReports}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Attendance Reports</span>
          </button>

          <button
            onClick={onStartSession}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Start Attendance</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Enrolled Students</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {loading ? '—' : stats?.totalStudents || 0}
            </span>
            <span className="text-xs text-slate-500">Total in College</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active QR Sessions</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Play className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {loading ? '—' : stats?.activeSessionsCount || 0}
            </span>
            <span className="text-xs text-emerald-700 font-medium">
              {stats?.activeSessionsCount ? 'Accepting Scans' : 'Idle'}
            </span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Today's Total Attended</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {loading ? '—' : stats?.todayAttendanceCount || 0}
            </span>
            <span className="text-xs text-slate-500">Verified Submissions</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Lectures Tracked</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {loading ? '—' : stats?.recentSessions.length || 0}
            </span>
            <span className="text-xs text-slate-500">In SQLite Database</span>
          </div>
        </div>
      </div>

      {/* Realtime Active Attendance Session Monitor */}
      {activeSessionLiveData && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-xs overflow-hidden">
          <div className="bg-blue-600 text-white px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-blue-500/50" />
              <div>
                <span className="text-[11px] font-semibold text-blue-100 uppercase tracking-wider">
                  Live Attendance Session
                </span>
                <h2 className="text-base font-bold leading-tight">
                  {activeSessionLiveData.session.subject_name} ({activeSessionLiveData.session.subject_code})
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-blue-700/80 px-3 py-1 rounded-md text-xs font-mono">
                <Clock className="w-3.5 h-3.5 text-blue-200" />
                <span>Time Remaining:</span>
                <span className="font-bold text-amber-300 tabular-nums">{timeRemaining}</span>
              </div>

              <button
                onClick={() => handleCloseSession(activeSessionLiveData.session.id)}
                className="px-3 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center gap-1"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>End Session</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-semibold text-slate-700">Class Division:</span>
                <span className="text-xs text-slate-600 ml-1.5 font-medium">
                  {activeSessionLiveData.session.class_name}
                </span>
                <span className="text-slate-300 mx-2">|</span>
                <span className="text-xs font-semibold text-slate-700">Started:</span>
                <span className="text-xs text-slate-600 ml-1.5 font-mono">
                  {new Date(activeSessionLiveData.session.start_time).toLocaleTimeString()}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-500">Present Count:</span>{' '}
                  <span className="font-bold text-emerald-600 font-mono text-sm tabular-nums">
                    {activeSessionLiveData.presentCount}
                  </span>
                  <span className="text-slate-400"> / {activeSessionLiveData.totalEnrolled}</span>
                </div>
                <div className="w-32 bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        activeSessionLiveData.totalEnrolled > 0
                          ? (activeSessionLiveData.presentCount / activeSessionLiveData.totalEnrolled) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Attendees live stream */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-800">
                  Live Attendance Feed (Auto-updates every 3 seconds)
                </h3>
                <span className="text-[11px] text-slate-500">
                  {activeSessionLiveData.records.length} students recorded
                </span>
              </div>

              {activeSessionLiveData.records.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 rounded-lg border border-slate-200">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Waiting for students to scan QR code...</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Keep the QR code displayed on the classroom screen.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Roll No</th>
                        <th className="py-2.5 px-4 font-semibold">Student Name</th>
                        <th className="py-2.5 px-4 font-semibold">Email</th>
                        <th className="py-2.5 px-4 font-semibold">Marked At</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeSessionLiveData.records.map((r, i) => (
                        <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-medium text-slate-800">
                            {r.roll_number || `STU-${r.student_id}`}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-900">{r.student_name}</td>
                          <td className="py-2.5 px-4 text-slate-500">{r.student_email}</td>
                          <td className="py-2.5 px-4 font-mono text-slate-600">
                            {new Date(r.marked_at).toLocaleTimeString()}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                              Present
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Sessions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Attendance Sessions</h2>
            <p className="text-xs text-slate-500">History of lectures conducted</p>
          </div>
          <button
            onClick={onViewReports}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>Full Reports</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {stats && stats.recentSessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">Session ID</th>
                  <th className="py-3 px-4 font-semibold">Date & Time</th>
                  <th className="py-3 px-4 font-semibold">Subject</th>
                  <th className="py-3 px-4 font-semibold">Class</th>
                  <th className="py-3 px-4 font-semibold text-center">Present / Enrolled</th>
                  <th className="py-3 px-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentSessions.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">#{s.id}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {new Date(s.start_time).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900">{s.subject_name}</span>
                      <span className="text-slate-400 font-mono ml-1.5">({s.subject_code})</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{s.class_name}</td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums">
                      <span className="font-semibold text-slate-900">{s.present_count ?? 0}</span>
                      <span className="text-slate-400"> / {s.total_enrolled ?? 0}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          s.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.status === 'CLOSED'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <QrCode className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No attendance sessions recorded yet.</p>
            <button
              onClick={onStartSession}
              className="mt-3 px-4 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Start First Attendance Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
