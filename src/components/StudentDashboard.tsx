import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { fetchStudentDashboardData } from '../services/attendanceService.ts';
import { StudentDashboardData } from '../types.ts';
import {
  QrCode,
  AlertTriangle,
  RefreshCw,
  Clock,
  Award,
} from 'lucide-react';

interface StudentDashboardProps {
  onScanQR: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onScanQR }) => {
  const { user } = useAuth();
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError(null);
    try {
      const res = await fetchStudentDashboardData(user);
      setData(res);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load attendance records from Firestore.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const profile = data?.profile || user;
  const hasRecords = (data?.totalConductedSessions ?? 0) > 0;
  const overallPct = data?.overallPercentage ?? 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="font-semibold text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Student Attendance Portal
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor your verified attendance records and subject participation in Cloud Firestore
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchDashboard();
            }}
            disabled={refreshing}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh attendance records"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onScanQR}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan Classroom QR</span>
          </button>
        </div>
      </div>

      {/* Student Profile & Overall Status Split */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Profile Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs md:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg shadow-inner">
                {profile?.name ? profile.name[0].toUpperCase() : 'S'}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  {profile?.name || 'Student'}
                </h2>
                <p className="text-xs font-mono font-medium text-blue-600">
                  {profile?.roll_number || 'Roll No: Not specified'}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
              <div className="flex justify-between text-slate-600 gap-2">
                <span className="text-slate-400">Email:</span>
                <span className="font-medium truncate max-w-[190px]">{profile?.email}</span>
              </div>
              <div className="flex justify-between text-slate-600 gap-2">
                <span className="text-slate-400">Role:</span>
                <span className="font-semibold text-slate-800 capitalize">{profile?.role || 'student'}</span>
              </div>
              <div className="flex justify-between text-slate-600 gap-2">
                <span className="text-slate-400">Subjects Attended:</span>
                <span className="font-medium font-mono">
                  {loading ? '—' : data?.subjectPercentages.length ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={onScanQR}
              className="w-full py-2 px-3 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center justify-center gap-2 border border-emerald-200/60"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Mark Attendance Now</span>
            </button>
          </div>
        </div>

        {/* Overall Percentage Hero Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Overall Attendance Progress
              </span>
              {hasRecords ? (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                    overallPct >= 75
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {overallPct >= 75 ? 'Eligible for Exams' : 'Below 75% Threshold'}
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600">
                  No Records Yet
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-3 my-2">
              <span className="text-4xl font-extrabold text-slate-900 font-mono tabular-nums">
                {loading ? '—' : `${overallPct}%`}
              </span>
              <span className="text-xs text-slate-500">
                {hasRecords
                  ? `(${data?.totalAttendedSessions ?? 0} attended of ${data?.totalConductedSessions ?? 0} conducted lectures)`
                  : 'No attendance records available.'}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mt-3 mb-2 relative">
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
                style={{ left: '75%' }}
                title="75% Minimum Requirement"
              />
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  !hasRecords
                    ? 'bg-slate-300'
                    : overallPct >= 75
                    ? 'bg-blue-600'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, overallPct)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>0%</span>
              <span className="text-slate-600 font-medium">75% Minimum College Rule</span>
              <span>100%</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-xs text-blue-800 flex items-start gap-2">
            <Award className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Attendance percentages update automatically as you scan live classroom QR sessions created by your teachers.
            </span>
          </div>
        </div>
      </div>

      {/* Subject-Wise Attendance Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Subject-Wise Attendance Breakdown</h2>
          <p className="text-xs text-slate-500">
            Calculated from verified Firestore sessions for each class you attend
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-8 text-center text-xs text-slate-500">
              Loading subject attendance from Cloud Firestore...
            </div>
          ) : data?.subjectPercentages && data.subjectPercentages.length > 0 ? (
            data.subjectPercentages.map((s) => (
              <div
                key={s.classId}
                className={`p-4 rounded-xl border transition-all ${
                  s.isDefaulter
                    ? 'border-red-200 bg-red-50/30'
                    : 'border-slate-200 bg-white hover:border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[11px] font-mono font-medium text-slate-500">
                      {s.subjectCode} · {s.className}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      {s.subjectName}
                    </h3>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded tabular-nums ${
                      s.isDefaulter
                        ? 'bg-red-100 text-red-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {s.percentage}%
                  </span>
                </div>

                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden my-3">
                  <div
                    className={`h-full rounded-full ${s.isDefaulter ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, s.percentage)}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-slate-600">
                  <span>Present: {s.attendedSessions}</span>
                  <span className="text-slate-400">Conducted: {s.totalSessions}</span>
                </div>

                {s.isDefaulter && (
                  <div className="mt-2 text-[11px] font-medium text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Below 75% threshold</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full py-8 text-center text-xs text-slate-500">
              No attendance records available.
            </div>
          )}
        </div>
      </div>

      {/* Recent Attendance History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Recent Attendance History</h2>
          <p className="text-xs text-slate-500">Verified lecture attendance entries</p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading attendance history...
          </div>
        ) : data?.recentHistory && data.recentHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">Subject</th>
                  <th className="py-3 px-4 font-semibold">Class</th>
                  <th className="py-3 px-4 font-semibold">Faculty</th>
                  <th className="py-3 px-4 font-semibold">Marked Timestamp</th>
                  <th className="py-3 px-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentHistory.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900">{rec.subjectName}</span>
                      <span className="text-slate-400 font-mono ml-1.5">({rec.subjectCode})</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{rec.className}</td>
                    <td className="py-3 px-4 text-slate-700">{rec.teacherName}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {new Date(rec.markedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                        Present
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No attendance records available.</p>
            <p className="text-xs text-slate-500 mt-1">
              Scan an active QR code from your teacher to record your first lecture attendance.
            </p>
            <button
              onClick={onScanQR}
              className="mt-3 px-4 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              Scan Your First QR Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
