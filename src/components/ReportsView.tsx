import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { CollegeClass, Subject } from '../types.ts';
import {
  Download,
  Filter,
  BarChart3,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [classes, setClasses] = useState<CollegeClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');

  const [sessions, setSessions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalSessions: 0,
    totalPresentCumulative: 0,
    totalEnrolledCumulative: 0,
    averagePercentage: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Drilldown to view attendees of a specific session
  const [activeDrilldownSessionId, setActiveDrilldownSessionId] = useState<number | null>(null);
  const [drilldownDetails, setDrilldownDetails] = useState<any | null>(null);

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [selectedClassId, selectedSubjectId, selectedDate]);

  const loadFilters = async () => {
    try {
      const data = await api.getClassesAndSubjects();
      setClasses(data.classes);
      setSubjects(data.subjects);
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.getTeacherReports({
        classId: selectedClassId ? Number(selectedClassId) : undefined,
        subjectId: selectedSubjectId ? Number(selectedSubjectId) : undefined,
        date: selectedDate || undefined,
      });
      setSessions(res.sessions);
      setSummary(res.summary);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDrilldown = async (sessionId: number) => {
    if (activeDrilldownSessionId === sessionId) {
      setActiveDrilldownSessionId(null);
      setDrilldownDetails(null);
      return;
    }

    try {
      const details = await api.getSessionLive(sessionId);
      setActiveDrilldownSessionId(sessionId);
      setDrilldownDetails(details);
    } catch (err) {
      console.error('Failed to load session details:', err);
    }
  };

  const handleExportCsv = () => {
    const url = api.getExportCsvUrl({
      classId: selectedClassId ? Number(selectedClassId) : undefined,
      subjectId: selectedSubjectId ? Number(selectedSubjectId) : undefined,
    });
    window.location.href = url;
  };

  const handleExportSingleSessionCsv = (sessionId: number) => {
    const url = api.getExportCsvUrl({ sessionId });
    window.location.href = url;
  };

  // Filter subjects for the selected class
  const filteredSubjects = selectedClassId
    ? subjects.filter(s => s.class_id === Number(selectedClassId))
    : subjects;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Attendance Reports & Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Filter by class, subject, date, view absent students, and export official CSV
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-2 self-start sm:self-auto"
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Class / Division</label>
            <select
              value={selectedClassId}
              onChange={e => {
                setSelectedClassId(e.target.value);
                setSelectedSubjectId('');
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.class_name} ({c.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Subject</label>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Subjects</option>
              {filteredSubjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.subject_name} ({s.subject_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>

        {(selectedClassId || selectedSubjectId || selectedDate) && (
          <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => {
                setSelectedClassId('');
                setSelectedSubjectId('');
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
            {loading ? '—' : summary.totalSessions}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500">Total Present Marks</span>
          <p className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-1">
            {loading ? '—' : summary.totalPresentCumulative}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500">Total Student Eligible</span>
          <p className="text-2xl font-bold text-slate-700 font-mono tabular-nums mt-1">
            {loading ? '—' : summary.totalEnrolledCumulative}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500">Average Turnout Rate</span>
          <p className="text-2xl font-bold text-blue-600 font-mono tabular-nums mt-1">
            {loading ? '—' : `${summary.averagePercentage}%`}
          </p>
        </div>
      </div>

      {/* Sessions List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Lecture Attendance Sessions</h2>
          <span className="text-xs text-slate-500 font-mono">{sessions.length} sessions match criteria</span>
        </div>

        {sessions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {sessions.map(s => {
              const turnout = s.total_enrolled > 0
                ? Math.round((s.present_count / s.total_enrolled) * 100)
                : 0;
              const isExpanded = activeDrilldownSessionId === s.session_id;

              return (
                <div key={s.session_id} className="transition-colors">
                  <div className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/60">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-700">
                          #{s.session_id}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{s.subject_name}</span>
                        <span className="text-xs font-mono text-slate-500">({s.subject_code})</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            s.session_status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {s.session_status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Class: <strong className="text-slate-700">{s.class_name}</strong></span>
                        <span>Faculty: <strong className="text-slate-700">{s.teacher_name}</strong></span>
                        <span>Date: <span className="font-mono">{new Date(s.start_time).toLocaleString()}</span></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right">
                        <div className="text-xs font-mono">
                          <span className="font-bold text-emerald-600">{s.present_count}</span>
                          <span className="text-slate-400"> / {s.total_enrolled}</span>
                          <span className="text-slate-500 ml-1.5 font-medium">({turnout}%)</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDrilldown(s.session_id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                          isExpanded
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isExpanded ? 'Hide Roster' : 'View Roster'}
                      </button>

                      <button
                        onClick={() => handleExportSingleSessionCsv(s.session_id)}
                        title="Download CSV for this lecture"
                        className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Drilldown Roster */}
                  {isExpanded && drilldownDetails && (
                    <div className="p-4 sm:px-6 bg-slate-50/80 border-t border-slate-200 space-y-4">
                      {/* Present vs Absent Lists */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Present Students */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              Present Students ({drilldownDetails.records.length})
                            </span>
                          </div>

                          {drilldownDetails.records.length > 0 ? (
                            <div className="max-h-60 overflow-y-auto space-y-2">
                              {drilldownDetails.records.map((r: any) => (
                                <div key={r.id} className="text-xs flex justify-between items-center py-1 border-b border-slate-50">
                                  <div>
                                    <span className="font-semibold text-slate-800">{r.student_name}</span>
                                    <span className="text-[11px] font-mono text-slate-500 ml-2">
                                      {r.roll_number || 'N/A'}
                                    </span>
                                  </div>
                                  <span className="text-[11px] font-mono text-slate-500">
                                    {new Date(r.marked_at).toLocaleTimeString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 py-3 text-center">No students present.</p>
                          )}
                        </div>

                        {/* Absent Students */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                            <span className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                              Absent Students ({drilldownDetails.absentStudents.length})
                            </span>
                          </div>

                          {drilldownDetails.absentStudents.length > 0 ? (
                            <div className="max-h-60 overflow-y-auto space-y-2">
                              {drilldownDetails.absentStudents.map((s: any) => (
                                <div key={s.id} className="text-xs flex justify-between items-center py-1 border-b border-slate-50">
                                  <div>
                                    <span className="font-semibold text-slate-800">{s.name}</span>
                                    <span className="text-[11px] font-mono text-slate-500 ml-2">
                                      {s.roll_number || 'N/A'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-semibold">
                                    Absent
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-emerald-600 py-3 text-center font-medium">
                              100% attendance! No absentees.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500">
            No attendance records match the selected filter criteria.
          </div>
        )}
      </div>
    </div>
  );
};
