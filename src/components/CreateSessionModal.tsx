import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { CollegeClass, Subject } from '../types.ts';
import { QrCode, X, Clock, Maximize2, Minimize2, Copy, Check, Download, AlertCircle, Users } from 'lucide-react';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated?: (session: any) => void;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  onClose,
  onSessionCreated,
}) => {
  const [classes, setClasses] = useState<CollegeClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Result state after generating QR
  const [generatedResult, setGeneratedResult] = useState<{
    session: any;
    token: string;
    qrDataUrl: string;
    attendanceUrl: string;
  } | null>(null);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadClassesAndSubjects();
      setError(null);
      setGeneratedResult(null);
    }
  }, [isOpen]);

  const loadClassesAndSubjects = async () => {
    try {
      const data = await api.getClassesAndSubjects();
      setClasses(data.classes);
      setSubjects(data.subjects);
      if (data.classes.length > 0) {
        setSelectedClassId(data.classes[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load classes and subjects');
    }
  };

  // Filter subjects belonging to currently selected class
  const availableSubjects = subjects.filter(
    s => s.class_id === Number(selectedClassId)
  );

  useEffect(() => {
    if (availableSubjects.length > 0) {
      setSelectedSubjectId(availableSubjects[0].id);
    } else {
      setSelectedSubjectId('');
    }
  }, [selectedClassId, subjects]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !selectedSubjectId) {
      setError('Please select both a class and a subject');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.createSession({
        classId: Number(selectedClassId),
        subjectId: Number(selectedSubjectId),
        durationMinutes: Number(durationMinutes),
      });

      setGeneratedResult(res);
      if (onSessionCreated) {
        onSessionCreated(res.session);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate attendance session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedResult?.attendanceUrl) {
      navigator.clipboard.writeText(generatedResult.attendanceUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    if (generatedResult?.qrDataUrl) {
      const link = document.createElement('a');
      link.href = generatedResult.qrDataUrl;
      link.download = `attendance_qr_session_${generatedResult.session.id}.png`;
      link.click();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-xl shadow-xl w-full transition-all border border-slate-200 overflow-hidden ${
          isFullscreen
            ? 'fixed inset-2 md:inset-6 z-60 max-w-none h-[95vh] flex flex-col'
            : 'max-w-xl'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {generatedResult ? 'Active Attendance QR Code' : 'Start Attendance Session'}
              </h2>
              <p className="text-xs text-slate-500">
                {generatedResult ? 'Display this code on projector for students to scan' : 'Generate unique time-bound QR code'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {generatedResult && (
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-colors"
                title={isFullscreen ? 'Exit projector mode' : 'Projector fullscreen mode'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!generatedResult ? (
            /* Creation Form */
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Class / Division
                </label>
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.class_name} ({c.department} - {c.academic_year})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Subject
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={e => setSelectedSubjectId(Number(e.target.value))}
                  required
                  disabled={availableSubjects.length === 0}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100"
                >
                  {availableSubjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.subject_name} ({s.subject_code})
                    </option>
                  ))}
                </select>
                {availableSubjects.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">No subjects found for this class.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Session Expiry Duration</span>
                  <span className="text-blue-600 font-mono text-xs">{durationMinutes} Minutes</span>
                </label>
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {[1, 2, 5, 10, 15].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDurationMinutes(m)}
                      className={`py-1.5 text-xs font-medium rounded-md border transition-colors ${
                        durationMinutes === m
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">
                  After this time, the QR code automatically expires and rejects further scan submissions.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedSubjectId}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? 'Generating QR...' : 'Generate Attendance QR'}
                </button>
              </div>
            </form>
          ) : (
            /* QR Code Display & Projector Mode */
            <div className={`flex flex-col items-center justify-center text-center ${isFullscreen ? 'h-full justify-between' : ''}`}>
              <div className="mb-3">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-1">
                  Active Session #{generatedResult.session.id}
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {generatedResult.session.subject_name} ({generatedResult.session.subject_code})
                </h3>
                <p className="text-xs text-slate-500">
                  {generatedResult.session.class_name} · Valid for {generatedResult.session.duration_minutes} minutes
                </p>
              </div>

              {/* High Definition QR Code Frame */}
              <div className="p-4 bg-white rounded-2xl shadow-sm border-2 border-slate-200 mb-4 inline-block">
                <img
                  src={generatedResult.qrDataUrl}
                  alt="Attendance QR Code"
                  className={`${
                    isFullscreen ? 'w-80 h-80 sm:w-96 sm:h-96 md:w-[420px] md:h-[420px]' : 'w-64 h-64'
                  } mx-auto object-contain transition-all`}
                />
              </div>

              {/* Helpful instructions for students */}
              <div className="max-w-md bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 mb-4 text-left space-y-1">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Expires at: {new Date(generatedResult.session.expiry_time).toLocaleTimeString()}
                </p>
                <p className="text-[11px]">
                  Students must be logged in to mark attendance. Duplicate attempts and expired submissions will be automatically rejected.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Link Copied!' : 'Copy Attendance Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadQR}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save QR PNG</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
                >
                  Done / View Session Monitor
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
