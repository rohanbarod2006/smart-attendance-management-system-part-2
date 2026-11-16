import React, { useState } from 'react';
import {
  Database,
  ShieldCheck,
  CheckCircle2,
  Layers,
  HelpCircle,
} from 'lucide-react';

export const VivaDocumentationModal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'viva' | 'guide'>('architecture');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Project Architecture &amp; Viva Examination Guide
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Smart Attendance Management System Using QR Code · Firebase Authentication &amp; Cloud Firestore
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg max-w-lg text-xs font-semibold">
        <button
          onClick={() => setActiveTab('architecture')}
          className={`flex-1 py-1.5 px-3 rounded-md transition-colors ${
            activeTab === 'architecture' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          System Architecture &amp; Schema
        </button>
        <button
          onClick={() => setActiveTab('viva')}
          className={`flex-1 py-1.5 px-3 rounded-md transition-colors ${
            activeTab === 'viva' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Viva Q&amp;A Prep
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`flex-1 py-1.5 px-3 rounded-md transition-colors ${
            activeTab === 'guide' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Live Workflow Steps
        </button>
      </div>

      {/* Tab 1: Architecture & Security */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          {/* Workflow Diagram */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              End-to-End System Workflow
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Step-by-step lifecycle from teacher session creation to student verification in Cloud Firestore.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg space-y-1">
                <span className="font-bold text-blue-700">1. Teacher Initiates</span>
                <p className="text-slate-600">
                  Teacher creates a class in Firestore, starts an attendance session with a timer, and stores a SHA-256 token hash.
                </p>
              </div>

              <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-lg space-y-1">
                <span className="font-bold text-indigo-700">2. QR Display</span>
                <p className="text-slate-600">
                  Client generates a high-resolution QR containing the session ID and raw token for classroom projection.
                </p>
              </div>

              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-1">
                <span className="font-bold text-emerald-700">3. Student Scans</span>
                <p className="text-slate-600">
                  Student opens browser camera or uploads QR image, decodes the session ID and token, and submits attendance.
                </p>
              </div>

              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-1">
                <span className="font-bold text-amber-700">4. Firestore Rule Check</span>
                <p className="text-slate-600">
                  Firestore Rules verify student identity, active status, server timestamp expiry, token hash, and duplicate prevention.
                </p>
              </div>
            </div>
          </div>

          {/* Firestore Collections Schema */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              Cloud Firestore Data Model (4 Collections)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                <span className="font-bold text-slate-800">users/{'{uid}'}</span>
                <ul className="text-slate-600 text-[11px] mt-1 space-y-0.5">
                  <li>• uid / id (Auth UID)</li>
                  <li>• name, email</li>
                  <li>• role (student | teacher)</li>
                  <li>• roll_number (students)</li>
                  <li>• collegeName, department</li>
                  <li>• facultyId, designation</li>
                </ul>
              </div>

              <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                <span className="font-bold text-slate-800">classes/{'{classId}'}</span>
                <ul className="text-slate-600 text-[11px] mt-1 space-y-0.5">
                  <li>• className</li>
                  <li>• subjectName, subjectCode</li>
                  <li>• department</li>
                  <li>• academicYear, semester</li>
                  <li>• teacherUid, teacherName</li>
                </ul>
              </div>

              <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                <span className="font-bold text-slate-800">sessions/{'{sessionId}'}</span>
                <ul className="text-slate-600 text-[11px] mt-1 space-y-0.5">
                  <li>• teacherUid, classId</li>
                  <li>• tokenHash (SHA-256)</li>
                  <li>• startTime, expiryTime</li>
                  <li>• expiryTimestamp</li>
                  <li>• status (ACTIVE/CLOSED)</li>
                </ul>
              </div>

              <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                <span className="font-bold text-slate-800">attendance/{'{sid}_{uid}'}</span>
                <ul className="text-slate-600 text-[11px] mt-1 space-y-0.5">
                  <li>• sessionId, classId</li>
                  <li>• studentUid, studentName</li>
                  <li>• teacherUid, tokenHash</li>
                  <li>• markedAt, status</li>
                  <li className="text-blue-700 font-bold">★ Unique composite doc ID</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Security Architecture */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              QR Code Security &amp; Role Isolation
            </h2>
            <div className="text-xs text-slate-600 space-y-2">
              <p>
                <strong>1. Cryptographic Token Hashing (SHA-256):</strong> A 48-character random token is generated with Web Crypto (`crypto.getRandomValues`). Firestore stores only its SHA-256 `tokenHash`, never the raw token.
              </p>
              <p>
                <strong>2. Server-Time Expiry Validation:</strong> Sessions include a Firestore `expiryTimestamp`. Security rules verify `request.time &lt;= session.expiryTimestamp` so device clock tampering cannot bypass QR expiry.
              </p>
              <p>
                <strong>3. Deterministic Anti-Duplicate IDs:</strong> Attendance documents use <code>{'{sessionId}_{studentUid}'}</code> as their document ID with <code>allow update, delete: if false</code>, guaranteeing each student can mark attendance only once per session.
              </p>
              <p>
                <strong>4. Immutable Role Isolation:</strong> Users choose Student or Teacher at registration, and Firestore rules forbid modifying the `role` field after account creation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Viva Q&A Prep */}
      {activeTab === 'viva' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              Frequently Asked Viva Questions &amp; Model Answers
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Technical Q&amp;A covering QR verification, duplicate prevention, and Firestore rules.
            </p>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">
                  Q1: Why store `tokenHash` in Firestore instead of storing the raw QR token?
                </span>
                <p className="text-slate-600">
                  <strong>Answer:</strong> Storing a one-way SHA-256 hash ensures that even if a signed-in student inspects a session document, they cannot extract the plaintext QR token to forge attendance without actually scanning the teacher&apos;s QR code.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">
                  Q2: How is duplicate attendance prevented if a student scans the QR code twice?
                </span>
                <p className="text-slate-600">
                  <strong>Answer:</strong> Each attendance document uses the deterministic composite key <code>{`{sessionId}_{studentUid}`}</code>. Firestore Security Rules enforce this document ID and deny updates (`allow update, delete: if false`), so a second scan cannot create a duplicate record.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">
                  Q3: How does the camera scanner work inside the web browser without installing a native app?
                </span>
                <p className="text-slate-600">
                  <strong>Answer:</strong> It uses the HTML5 <code>navigator.mediaDevices.getUserMedia()</code> WebRTC API together with <code>html5-qrcode</code> to decode QR codes directly in the browser, with screenshot upload and manual token fallbacks.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">
                  Q4: How is attendance percentage computed for each student?
                </span>
                <p className="text-slate-600">
                  <strong>Answer:</strong> Subject attendance is calculated from actual Firestore records as:{' '}
                  <code>(Verified Present Sessions ÷ Total Conducted Sessions for that Class) × 100</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Live Workflow Guide */}
      {activeTab === 'guide' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Live Application Walkthrough
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                1
              </span>
              <div>
                <span className="font-semibold text-slate-900">Register &amp; Sign In as Teacher</span>
                <p className="text-slate-600">
                  Select <strong>Teacher / Faculty</strong>, create your faculty account, and sign straight into the Teacher Dashboard.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                2
              </span>
              <div>
                <span className="font-semibold text-slate-900">Create a Class &amp; Start QR Session</span>
                <p className="text-slate-600">
                  Add a class and subject under <strong>My Assigned Classes</strong>, then click <strong>Start Attendance</strong> to generate a timed QR code.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                3
              </span>
              <div>
                <span className="font-semibold text-slate-900">Student Scans QR Code</span>
                <p className="text-slate-600">
                  Sign in with a <strong>Student</strong> account, click <strong>Scan QR</strong>, scan or upload the QR image, and receive an instant verified receipt.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                4
              </span>
              <div>
                <span className="font-semibold text-slate-900">Verify Live Roster &amp; Export CSV</span>
                <p className="text-slate-600">
                  Watch the student&apos;s verified attendance appear in the teacher&apos;s live session monitor and export real records from <strong>Reports</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
