import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { StudentDashboardData } from '../types.ts';
import {
  QrCode,
  User,
  GraduationCap,
  Calendar,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  BookOpen,
  Clock,
  Award,
} from 'lucide-react';

interface StudentDashboardProps {
  onScanQR: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onScanQR }) => {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchDashboard = async () => {
    try {
      const res = await api.getStudentDashboard();
      setData(res);
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Student Attendance Portal
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor subject eligibility, college attendance requirements, and lecture records
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
                {data?.profile.name ? data.profile.name[0] : 'S'}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  {data?.profile.name || 'Student'}
                </h2>
                <p className="text-xs font-mono font-medium text-blue-600">
                  {data?.profile.roll_number || 'Roll No: Pending'}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
              <div className="flex justify-between text-slate-600">
                <span className="text-slate-400">Email:</span>
                <span className="font-medium truncate max-w-[170px]">{data?.profile.email}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="text-slate-400">Class:</span>
                <span className="font-semibold text-slate-800">
                  {data?.classes.map(c => c.class_name).join(', ') || 'SE-IT Div A'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="text-slate-400">Department:</span>
                <span className="font-medium">Information Technology</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="text-slate-400">Academic Year:</span>
                <span className="font-medium">2025-2026</span>
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
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  (data?.overallPercentage ?? 100) >= 75
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {(data?.overallPercentage ?? 100) >= 75 ? 'Eligible for Exams' : 'Defaulter Alert (<75%)'}
              </span>
            </div>

            <div className="flex items-baseline gap-3 my-2">
              <span className="text-4xl font-extrabold text-slate-900 font-mono tabular-nums">
                {loading ? '—' : `${data?.overallPercentage ?? 0}%`}
              </span>
              <span className="text-xs text-slate-500">
                ({data?.totalAttendedSessions ?? 0} attended of {data?.totalEligibleSessions ?? 0} conducted lectures)
              </span>
            </div>

            {/* Custom Progress Bar */}
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mt-3 mb-2 relative">
              {/* 75% Requirement Marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
                style={{ left: '75%' }}
                title="75% University Minimum Requirement"
              />
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  (data?.overallPercentage ?? 100) >= 75 ? 'bg-blue-600' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, data?.overallPercentage ?? 0)}%` }}
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
              Attendance is evaluated dynamically per subject. Maintain over 75% in each subject to be in the nominal list.
            </span>
          </div>
        </div>
      </div>

      {/* Subject-Wise Attendance Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Subject-Wise Attendance Breakdown</h2>
          <p className="text-xs text-slate-500">
            Calculated as: (Sessions Present ÷ Total Sessions Conducted) × 100
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.subjectPercentages && data.subjectPercentages.length > 0 ? (
            data.subjectPercentages.map(s => (
              <div
                key={s.subjectId}
                className={`p-4 rounded-xl border transition-all ${
                  s.isDefaulter
                    ? 'border-red-200 bg-red-50/30'
                    : 'border-slate-200 bg-white hover:border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[11px] font-mono font-medium text-slate-500">
                      {s.subjectCode}
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

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden my-3">
                  <div
                    className={`h-full rounded-full ${s.isDefaulter ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, s.percentage)}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-slate-600">
                  <span>Present: {s.attendedSessions}</span>
                  <span className="text-slate-400">Total: {s.totalSessions}</span>
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
              No subjects or enrollment found.
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

        {data?.recentHistory && data.recentHistory.length > 0 ? (
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
                {data.recentHistory.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900">{rec.subject_name}</span>
                      <span className="text-slate-400 font-mono ml-1.5">({rec.subject_code})</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{rec.class_name}</td>
                    <td className="py-3 px-4 text-slate-700">{rec.teacher_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {new Date(rec.marked_at).toLocaleString()}
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
            <p className="text-xs text-slate-500">No attendance marked yet.</p>
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
