import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  buildAttendanceCsvUrl,
  fetchTeacherReports,
} from '../services/attendanceService.ts';
import { AttendanceRecord, TeacherClass, TeacherReportsResult } from '../types.ts';
import {
  Download,
  Filter,
  CheckCircle,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { user } = useAuth();
  const teacherUid = user?.uid || user?.id || '';

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');

  const [report, setReport] = useState<TeacherReportsResult>({
    sessions: [],
    recordsBySession: {},
    summary: {
      totalSessions: 0,
      totalPresentMarks: 0,
      activeSessions: 0,
      averagePresentPerSession: 0,
    },
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Drilldown to view attendees of a specific session
  const [activeDrilldownSessionId, setActiveDrilldownSessionId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!teacherUid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetchTeacherReports({
        teacherUid,
        classId: selectedClassId || undefined,
        date: selectedDate || undefined,
      });
      setClasses(res.classes);
      setReport(res.report);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load attendance reports from Firestore.'
      );
    } finally {
      setLoading(false);
    }
  }, [teacherUid, selectedClassId, selectedDate]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleDrilldown = (sessionId: string) => {
    setActiveDrilldownSessionId((prev) => (prev === sessionId ? null : sessionId));
  };

  const handleExportAllFilteredCsv = () => {
    const filteredRecords: AttendanceRecord[] = [];
    report.sessions.forEach((s) => {
      const sessionRecords = report.recordsBySession[s.id] || [];
      filteredRecords.push(...sessionRecords);
    });

    const url = buildAttendanceCsvUrl(filteredRecords);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportSingleSessionCsv = (sessionId: string) => {
    const sessionRecords = report.recordsBySession[sessionId] || [];
    const url = buildAttendanceCsvUrl(sessionRecords);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_session_${sessionId.slice(0, 8)}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Attendance Reports &amp; Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Filter by your classes and dates, inspect verified student submissions, and export CSV
          </p>
        </div>

        <button
          onClick={handleExportAllFilteredCsv}
          disabled={report.summary.totalPresentMarks === 0}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs flex items-center gap-2 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export All Filtered (CSV)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-700">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span>Filter Records</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Class &amp; Subject
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className} — {c.subjectName} ({c.subjectCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>

        {(selectedClassId || selectedDate) && (
          <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => {
                setSelectedClassId('');
                setSelectedDate('');
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500">Conducted Sessions</span>
          <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {loading ? '—' : report.summary.totalSessions}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500">Total Present Marks</span>
          <p className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-1">
            {loading ? '—' : report.summary.totalPresentMarks}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500">Active Sessions</span>
          <p className="text-2xl font-bold text-slate-700 font-mono tabular-nums mt-1">
            {loading ? '—' : report.summary.activeSessions}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500">Avg. Present / Session</span>
          <p className="text-2xl font-bold text-blue-600 font-mono tabular-nums mt-1">
            {loading ? '—' : report.summary.averagePresentPerSession}
          </p>
        </div>
      </div>

      {/* Sessions List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Lecture Attendance Sessions</h2>
          <span className="text-xs text-slate-500 font-mono">
            {report.sessions.length} sessions match criteria
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading attendance reports from Cloud Firestore...
          </div>
        ) : report.sessions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {report.sessions.map((s) => {
              const isExpanded = activeDrilldownSessionId === s.id;
              const sessionRecords = report.recordsBySession[s.id] || [];

              return (
                <div key={s.id} className="transition-colors">
                  <div className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/60">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-700">
                          {s.id.slice(0, 8)}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{s.subjectName}</span>
                        <span className="text-xs font-mono text-slate-500">({s.subjectCode})</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            s.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.status === 'CLOSED'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {s.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>
                          Class: <strong className="text-slate-700">{s.className}</strong>
                        </span>
                        <span>
                          Faculty: <strong className="text-slate-700">{s.teacherName}</strong>
                        </span>
                        <span>
                          Date:{' '}
                          <span className="font-mono">
                            {new Date(s.startTime).toLocaleString()}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right text-xs font-mono">
                        <span className="font-bold text-emerald-600">{sessionRecords.length}</span>
                        <span className="text-slate-500 ml-1">present</span>
                      </div>

                      <button
                        onClick={() => handleDrilldown(s.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                          isExpanded
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isExpanded ? 'Hide Roster' : 'View Roster'}
                      </button>

                      <button
                        onClick={() => handleExportSingleSessionCsv(s.id)}
                        title="Download CSV for this lecture"
                        className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Drilldown Roster */}
                  {isExpanded && (
                    <div className="p-4 sm:px-6 bg-slate-50/80 border-t border-slate-200">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            Verified Present Students ({sessionRecords.length})
                          </span>
                        </div>

                        {sessionRecords.length > 0 ? (
                          <div className="max-h-60 overflow-y-auto space-y-2">
                            {sessionRecords.map((r) => (
                              <div
                                key={r.id}
                                className="text-xs flex justify-between items-center py-1.5 border-b border-slate-50"
                              >
                                <div>
                                  <span className="font-semibold text-slate-800">
                                    {r.studentName}
                                  </span>
                                  <span className="text-[11px] font-mono text-slate-500 ml-2">
                                    {r.rollNumber || 'N/A'}
                                  </span>
                                  <span className="text-[11px] text-slate-400 ml-2">
                                    ({r.studentEmail})
                                  </span>
                                </div>
                                <span className="text-[11px] font-mono text-slate-500">
                                  {new Date(r.markedAt).toLocaleTimeString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 py-3 text-center">
                            No students have marked attendance yet.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500">
            No attendance records available.
          </div>
        )}
      </div>
    </div>
  );
};
