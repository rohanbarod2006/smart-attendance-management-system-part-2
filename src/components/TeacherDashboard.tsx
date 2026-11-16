import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  createTeacherClass,
  deleteTeacherClass,
  updateTeacherClass,
  type CreateTeacherClassPayload,
} from '../services/classService.ts';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';
import {
  closeAttendanceSession,
  fetchTeacherDashboardData,
  mapAttendanceDoc,
  mapSessionDoc,
} from '../services/attendanceService.ts';
import {
  SessionLiveDetails,
  TeacherClass,
  TeacherDashboardStats,
} from '../types.ts';
import {
  QrCode,
  CheckCircle,
  Clock,
  Play,
  StopCircle,
  BarChart2,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  Briefcase,
} from 'lucide-react';

interface TeacherDashboardProps {
  onStartSession: () => void;
  onViewReports: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  onStartSession,
  onViewReports,
}) => {
  const { user } = useAuth();
  const teacherUid = user?.uid || user?.id || '';

  const [stats, setStats] = useState<TeacherDashboardStats | null>(null);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedActiveSessionId, setSelectedActiveSessionId] = useState<string | null>(null);
  const [activeSessionLiveData, setActiveSessionLiveData] = useState<SessionLiveDetails | null>(null);

  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);

  // Teacher Firestore classes management state
  const [classError, setClassError] = useState<string | null>(null);
  const [classSuccess, setClassSuccess] = useState<string | null>(null);
  const [isClassModalOpen, setIsClassModalOpen] = useState<boolean>(false);
  const [editingClass, setEditingClass] = useState<TeacherClass | null>(null);
  const [classSubmitting, setClassSubmitting] = useState<boolean>(false);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);
  const [classForm, setClassForm] = useState<CreateTeacherClassPayload>({
    className: '',
    subjectName: '',
    subjectCode: '',
    department: user?.department || '',
    academicYear: '',
    semester: '',
  });

  const loadDashboard = useCallback(async () => {
    if (!teacherUid || user?.role !== 'teacher') {
      setClasses([]);
      setStats(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const data = await fetchTeacherDashboardData(teacherUid);
      setClasses(data.classes);
      setStats(data.stats);
      if (data.stats.activeSessions.length > 0) {
        setSelectedActiveSessionId(data.stats.activeSessions[0].id);
      } else {
        setSelectedActiveSessionId(null);
        setActiveSessionLiveData(null);
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to load teacher dashboard from Firestore.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [teacherUid, user?.role]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Real-time active session monitor via Firestore onSnapshot + 1s countdown tick
  useEffect(() => {
    if (!selectedActiveSessionId || !teacherUid || !db) {
      setActiveSessionLiveData(null);
      return;
    }

    let latestSession: ReturnType<typeof mapSessionDoc> | null = null;
    let latestRecords: ReturnType<typeof mapAttendanceDoc>[] = [];
    let expiredTriggered = false;

    const updateCountdown = (session: ReturnType<typeof mapSessionDoc>) => {
      const expiry = new Date(session.expiryTime).getTime();
      const diff = Math.max(0, Math.floor((expiry - Date.now()) / 1000));

      if (diff === 0 || session.status !== 'ACTIVE') {
        setTimeRemaining('Expired');
        if (!expiredTriggered) {
          expiredTriggered = true;
          loadDashboard();
        }
      } else {
        const mins = Math.floor(diff / 60);
        const secs = diff % 60;
        setTimeRemaining(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    };

    const syncLiveState = () => {
      if (!latestSession) return;
      setActiveSessionLiveData({
        session: latestSession,
        records: latestRecords,
        presentCount: latestRecords.length,
      });
      updateCountdown(latestSession);
    };

    const unsubSession = onSnapshot(
      doc(db, 'sessions', selectedActiveSessionId),
      (snap) => {
        if (!snap.exists()) {
          setActiveSessionLiveData(null);
          if (!expiredTriggered) {
            expiredTriggered = true;
            loadDashboard();
          }
          return;
        }
        latestSession = mapSessionDoc(snap.id, snap.data(), latestRecords.length);
        syncLiveState();
      },
      (err) => {
        console.warn('Live session listener error:', err);
      }
    );

    const unsubAttendance = onSnapshot(
      query(collection(db, 'attendance'), where('teacherUid', '==', teacherUid)),
      (snap) => {
        latestRecords = snap.docs
          .map((d) => mapAttendanceDoc(d.id, d.data()))
          .filter((r) => r.sessionId === selectedActiveSessionId)
          .sort((a, b) => new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime());
        if (latestSession) {
          latestSession = { ...latestSession, presentCount: latestRecords.length };
        }
        syncLiveState();
      },
      (err) => {
        console.warn('Live attendance listener error:', err);
      }
    );

    const countdownInterval = setInterval(() => {
      if (latestSession) {
        updateCountdown(latestSession);
      }
    }, 1000);

    return () => {
      unsubSession();
      unsubAttendance();
      clearInterval(countdownInterval);
    };
  }, [selectedActiveSessionId, teacherUid, loadDashboard]);

  const handleCloseSession = async (sessionId: string) => {
    setActionError(null);
    try {
      await closeAttendanceSession(sessionId);
      await loadDashboard();
    } catch (err: any) {
      setActionError(err.message || 'Failed to close session');
    }
  };

  const openNewClassModal = () => {
    setEditingClass(null);
    setClassForm({
      className: '',
      subjectName: '',
      subjectCode: '',
      department: user?.department || '',
      academicYear: '',
      semester: '',
    });
    setClassError(null);
    setIsClassModalOpen(true);
  };

  const openEditClassModal = (item: TeacherClass) => {
    setEditingClass(item);
    setClassForm({
      className: item.className,
      subjectName: item.subjectName,
      subjectCode: item.subjectCode,
      department: item.department,
      academicYear: item.academicYear,
      semester: item.semester,
    });
    setClassError(null);
    setIsClassModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setClassSubmitting(true);
    setClassError(null);
    setClassSuccess(null);

    try {
      if (editingClass) {
        await updateTeacherClass(editingClass.id, user.name, classForm);
        setClassSuccess(`Updated class "${classForm.className}".`);
      } else {
        await createTeacherClass(teacherUid, user.name, classForm);
        setClassSuccess(`Created class "${classForm.className}".`);
      }
      setIsClassModalOpen(false);
      await loadDashboard();
    } catch (err) {
      setClassError(err instanceof Error ? err.message : 'Failed to save class.');
    } finally {
      setClassSubmitting(false);
    }
  };

  const handleDeleteClass = async (item: TeacherClass) => {
    setDeletingClassId(item.id);
    setClassError(null);
    setClassSuccess(null);
    try {
      await deleteTeacherClass(item.id);
      setClassSuccess(`Removed class "${item.className}".`);
      await loadDashboard();
    } catch (err) {
      setClassError(err instanceof Error ? err.message : 'Failed to delete class.');
    } finally {
      setDeletingClassId(null);
    }
  };

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-red-600 hover:text-red-800 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner / Actions Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Briefcase className="w-3 h-3" />
              Teacher / Faculty
            </span>
            {user?.department && (
              <span className="text-[11px] text-slate-500">
                {user.department}
                {user.facultyId ? ` • ${user.facultyId}` : ''}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Teacher Attendance Portal
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time session monitoring, class management, instant QR generation, and attendance records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRefreshing(true);
              loadDashboard();
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
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">My Classes</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {loading ? '—' : stats?.totalClasses ?? 0}
            </span>
            <span className="text-xs text-slate-500">Assigned Subjects</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active QR Sessions</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Play className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {loading ? '—' : stats?.activeSessionsCount ?? 0}
            </span>
            <span className="text-xs text-emerald-700 font-medium">
              {stats?.activeSessionsCount ? 'Accepting Scans' : 'Idle'}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Today&apos;s Verified Marks</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {loading ? '—' : stats?.todayAttendanceCount ?? 0}
            </span>
            <span className="text-xs text-slate-500">Scanned Today</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Lectures Conducted</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {loading ? '—' : stats?.totalSessionsCount ?? 0}
            </span>
            <span className="text-xs text-slate-500">In Cloud Firestore</span>
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
                  {activeSessionLiveData.session.subjectName} ({activeSessionLiveData.session.subjectCode})
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
                  {activeSessionLiveData.session.className}
                </span>
                <span className="text-slate-300 mx-2">|</span>
                <span className="text-xs font-semibold text-slate-700">Started:</span>
                <span className="text-xs text-slate-600 ml-1.5 font-mono">
                  {new Date(activeSessionLiveData.session.startTime).toLocaleTimeString()}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Verified Present:</span>
                <span className="font-bold text-emerald-600 font-mono text-sm tabular-nums">
                  {activeSessionLiveData.presentCount}
                </span>
              </div>
            </div>

            {/* Attendees live stream */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-800">
                  Live Attendance Feed (Real-time Firestore updates)
                </h3>
                <span className="text-[11px] text-slate-500">
                  {activeSessionLiveData.records.length} students recorded
                </span>
              </div>

              {activeSessionLiveData.records.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 rounded-lg border border-slate-200">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">
                    No students have marked attendance yet.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Keep the QR code displayed for students to scan.
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
                      {activeSessionLiveData.records.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-medium text-slate-800">
                            {r.rollNumber || 'N/A'}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-900">{r.studentName}</td>
                          <td className="py-2.5 px-4 text-slate-500">{r.studentEmail}</td>
                          <td className="py-2.5 px-4 font-mono text-slate-600">
                            {new Date(r.markedAt).toLocaleTimeString()}
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
            <p className="text-xs text-slate-500">History of lectures conducted from Firestore</p>
          </div>
          <button
            onClick={onViewReports}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>Full Reports</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading sessions from Cloud Firestore...
          </div>
        ) : stats && stats.recentSessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">Session ID</th>
                  <th className="py-3 px-4 font-semibold">Date &amp; Time</th>
                  <th className="py-3 px-4 font-semibold">Subject</th>
                  <th className="py-3 px-4 font-semibold">Class</th>
                  <th className="py-3 px-4 font-semibold text-center">Present Marks</th>
                  <th className="py-3 px-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">{s.id.slice(0, 8)}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {new Date(s.startTime).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900">{s.subjectName}</span>
                      <span className="text-slate-400 font-mono ml-1.5">({s.subjectCode})</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{s.className}</td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums font-semibold text-slate-900">
                      {s.presentCount ?? 0}
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
            <p className="text-xs font-semibold text-slate-700">No lectures scheduled.</p>
            <p className="text-xs text-slate-500 mt-1">
              {classes.length === 0
                ? 'Create a class below first, then start your first QR attendance session.'
                : 'No attendance records available yet. Start a QR session for one of your classes.'}
            </p>
            {classes.length === 0 ? (
              <button
                type="button"
                onClick={openNewClassModal}
                className="mt-3 px-4 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Create Your First Class
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartSession}
                className="mt-3 px-4 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Start First Attendance Session
              </button>
            )}
          </div>
        )}
      </div>

      {/* My Classes Management (Cloud Firestore, isolated to this teacher) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>My Assigned Classes</span>
            </h2>
            <p className="text-xs text-slate-500">
              Create and manage your classes and subjects in Cloud Firestore
            </p>
          </div>
          <button
            type="button"
            onClick={openNewClassModal}
            className="self-start sm:self-auto px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Class</span>
          </button>
        </div>

        {(classError || classSuccess) && (
          <div className="px-6 pt-4">
            {classError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2">
                <span>{classError}</span>
                <button
                  type="button"
                  onClick={() => setClassError(null)}
                  className="font-semibold text-red-800"
                >
                  Dismiss
                </button>
              </div>
            )}
            {classSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2">
                <span>{classSuccess}</span>
                <button
                  type="button"
                  onClick={() => setClassSuccess(null)}
                  className="font-semibold text-emerald-900"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="p-6 text-center text-xs text-slate-500">
            Loading your classes from Cloud Firestore...
          </div>
        ) : classes.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">No classes created yet.</p>
            <p className="text-xs text-slate-500">
              Add your courses and divisions here to launch QR attendance sessions.
            </p>
            <button
              type="button"
              onClick={openNewClassModal}
              className="mt-2 px-4 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Create Your First Class
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">Class / Division</th>
                  <th className="py-3 px-4 font-semibold">Subject</th>
                  <th className="py-3 px-4 font-semibold">Code</th>
                  <th className="py-3 px-4 font-semibold">Department</th>
                  <th className="py-3 px-4 font-semibold">Semester / Year</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classes.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{item.className}</td>
                    <td className="py-3 px-4 text-slate-800">{item.subjectName}</td>
                    <td className="py-3 px-4 font-mono text-blue-700 font-semibold">
                      {item.subjectCode}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{item.department}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.semester} &bull; {item.academicYear}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditClassModal(item)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors inline-flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          disabled={deletingClassId === item.id}
                          onClick={() => handleDeleteClass(item)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{deletingClassId === item.id ? 'Removing...' : 'Delete'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Class Modal */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingClass ? 'Edit Class' : 'Create New Class'}
              </h3>
              <button
                type="button"
                onClick={() => setIsClassModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Class / Division Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={classForm.className}
                  onChange={(e) => setClassForm({ ...classForm, className: e.target.value })}
                  placeholder="e.g. SE-IT Div A"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Subject Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={classForm.subjectName}
                    onChange={(e) => setClassForm({ ...classForm, subjectName: e.target.value })}
                    placeholder="e.g. Data Structures"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Subject Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={30}
                    value={classForm.subjectCode}
                    onChange={(e) => setClassForm({ ...classForm, subjectCode: e.target.value })}
                    placeholder="e.g. IT301"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={classForm.department}
                  onChange={(e) => setClassForm({ ...classForm, department: e.target.value })}
                  placeholder="e.g. Information Technology"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Semester
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={30}
                    value={classForm.semester}
                    onChange={(e) => setClassForm({ ...classForm, semester: e.target.value })}
                    placeholder="e.g. Sem IV"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={30}
                    value={classForm.academicYear}
                    onChange={(e) => setClassForm({ ...classForm, academicYear: e.target.value })}
                    placeholder="e.g. 2025-2026"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={classSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
                >
                  {classSubmitting
                    ? 'Saving...'
                    : editingClass
                    ? 'Update Class'
                    : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
