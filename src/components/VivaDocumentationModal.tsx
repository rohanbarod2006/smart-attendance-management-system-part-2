import React, { useState } from 'react';
import {
  BookOpen,
  Code2,
  Database,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Cpu,
  Layers,
  HelpCircle,
  FileText,
} from 'lucide-react';

export const VivaDocumentationModal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'viva' | 'python_code' | 'guide'>('architecture');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          College Project Documentation & Viva Examination Guide
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Second-Year IT Engineering · Smart Attendance Management System Using QR Code
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg max-w-xl text-xs font-semibold">
        <button
          onClick={() => setActiveTab('architecture')}
          className={`flex-1 py-1.5 px-3 rounded-md transition-colors ${
            activeTab === 'architecture' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          System Architecture & ERD
        </button>
        <button
          onClick={() => setActiveTab('viva')}
          className={`flex-1 py-1.5 px-3 rounded-md transition-colors ${
            activeTab === 'viva' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Viva Q&A Prep
        </button>
        <button
          onClick={() => setActiveTab('python_code')}
          className={`flex-1 py-1.5 px-3 rounded-md transition-colors ${
            activeTab === 'python_code' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Python Flask Code
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`flex-1 py-1.5 px-3 rounded-md transition-colors ${
            activeTab === 'guide' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Demonstration Steps
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
              Step-by-step lifecycle from teacher session creation to student verification and SQLite storage.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg space-y-1">
                <span className="font-bold text-blue-700">1. Teacher Initiates</span>
                <p className="text-slate-600">
                  Selects Class & Subject, sets timer (e.g. 5 min). Backend generates a 48-char random token and stores its SHA-256 hash.
                </p>
              </div>

              <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-lg space-y-1">
                <span className="font-bold text-indigo-700">2. QR Display</span>
                <p className="text-slate-600">
                  Backend generates high-resolution QR containing the attendance session ID and token. Displayed on classroom projector.
                </p>
              </div>

              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-1">
                <span className="font-bold text-emerald-700">3. Student Scans</span>
                <p className="text-slate-600">
                  Student opens browser camera, scans QR code. Client sends authentication JWT + Session ID + Scanned Token.
                </p>
              </div>

              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-1">
                <span className="font-bold text-amber-700">4. 7-Point Backend Check</span>
                <p className="text-slate-600">
                  Validates Token Hash, Session Expiry, Class Enrollment, and prevents duplicate records via SQLite UNIQUE constraints.
                </p>
              </div>
            </div>
          </div>

          {/* Database Schema & ERD */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              SQLite Database Relational Design (6 Tables)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                <span className="font-bold text-slate-800">Users</span>
                <ul className="text-slate-600 text-[11px] mt-1 space-y-0.5">
                  <li>• id (PK AUTOINCREMENT)</li>
                  <li>• name TEXT</li>
                  <li>• email TEXT UNIQUE</li>
                  <li>• password_hash TEXT</li>
                  <li>• role (teacher/student/admin)</li>
                  <li>• roll_number TEXT</li>
                  <li>• created_at TIMESTAMP</li>
                </ul>
              </div>

              <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                <span className="font-bold text-slate-800">AttendanceSessions</span>
                <ul className="text-slate-600 text-[11px] mt-1 space-y-0.5">
                  <li>• id (PK AUTOINCREMENT)</li>
                  <li>• teacher_id (FK Users)</li>
                  <li>• subject_id (FK Subjects)</li>
                  <li>• class_id (FK Classes)</li>
                  <li>• token_hash TEXT UNIQUE</li>
                  <li>• start_time TIMESTAMP</li>
                  <li>• expiry_time TIMESTAMP</li>
                  <li>• status (ACTIVE/CLOSED/EXPIRED)</li>
                </ul>
              </div>

              <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                <span className="font-bold text-slate-800">AttendanceRecords</span>
                <ul className="text-slate-600 text-[11px] mt-1 space-y-0.5">
                  <li>• id (PK AUTOINCREMENT)</li>
                  <li>• session_id (FK AttendanceSessions)</li>
                  <li>• student_id (FK Users)</li>
                  <li>• marked_at TIMESTAMP</li>
                  <li>• status ('PRESENT')</li>
                  <li className="text-blue-700 font-bold">★ UNIQUE(session_id, student_id)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Security Architecture & Anti-Proxy Analysis */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              QR Code Security & Anti-Proxy Engineering
            </h2>
            <div className="text-xs text-slate-600 space-y-2">
              <p>
                <strong>1. Cryptographic Token Hashing (SHA-256):</strong> The raw random token is generated via secure entropy (`crypto.randomBytes(24)` in Node and `secrets.token_hex(24)` in Python). The database stores only the SHA-256 hash `token_hash`. Even if an attacker reads the database, they cannot reverse the hash to craft valid QR codes.
              </p>
              <p>
                <strong>2. Short Time-to-Live (TTL):</strong> Sessions are configured with tight expiry windows (e.g., 2–5 minutes) matching the lecture attendance call. This drastically reduces the window for screenshot sharing among students.
              </p>
              <p>
                <strong>3. Anti-Proxy Transparency:</strong> In engineering presentations, explain that static QR codes reduce remote forwarding due to short TTL, but cannot 100% prevent an in-class friend from messaging a QR photo. Dynamic rotating QR codes (TOTP/refresh every 15s) and GPS geofencing or WiFi MAC verification represent logical future work.
              </p>
              <p>
                <strong>4. Zero Client Trust:</strong> The client browser only provides its JWT token and the scanned QR token. The server computes the timestamp, checks enrollment, verifies token hash, and inserts the record. The client cannot forge marked times or bypass enrollment.
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
              Frequently Asked Viva Questions & Model Answers
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Answers tailored specifically for your 2nd Year IT Engineering viva panel.
            </p>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">
                  Q1: Why do you store `token_hash` in SQLite instead of storing the raw token?
                </span>
                <p className="text-slate-600">
                  <strong>Answer:</strong> Storing the one-way cryptographic hash (SHA-256) follows the principle of defense-in-depth. If the database is compromised or read by unauthorized personnel, the raw tokens cannot be recovered to mark fraudulent attendance. When the student submits the token, the backend hashes the received string and compares the hashes in constant time.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">
                  Q2: How is duplicate attendance prevented if a student scans the QR code twice?
                </span>
                <p className="text-slate-600">
                  <strong>Answer:</strong> We implement duplicate prevention at two distinct layers:
                  <br />
                  1. <em>Application Layer:</em> Before insertion, the backend queries `AttendanceRecords` for `(session_id, student_id)` and immediately returns HTTP 409 Conflict if found.
                  <br />
                  2. <em>Database Layer:</em> The SQLite table enforces a `UNIQUE(session_id, student_id)` composite constraint. Even under high concurrency or race conditions, SQLite rejects duplicate row insertion.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">
                  Q3: How does the camera scanner work inside the web browser without installing an app?
                </span>
                <p className="text-slate-600">
                  <strong>Answer:</strong> It utilizes the standard HTML5 `navigator.mediaDevices.getUserMedia()` WebRTC API to stream video frames from the device camera. The `html5-qrcode` engine samples canvas frames at 10 FPS and applies mathematical computer-vision decoding to extract the encoded payload. If camera access is denied, we provide a clean fallback to upload screenshot images or enter the attendance link.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">
                  Q4: How is attendance percentage computed for each student?
                </span>
                <p className="text-slate-600">
                  <strong>Answer:</strong> Subject attendance is calculated as:
                  <br />
                  <code>Percentage = (Count of sessions where student is marked 'PRESENT' ÷ Total sessions conducted for that subject) × 100</code>.
                  Students with attendance &lt; 75% are automatically flagged as Defaulters according to standard university criteria.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">
                  Q5: Why choose SQLite for this project?
                </span>
                <p className="text-slate-600">
                  <strong>Answer:</strong> SQLite is a self-contained, serverless, zero-configuration ACID-compliant SQL engine. It stores data in a single cross-platform file, making it ideal for college demonstrations, offline reliability, and fast embedded performance.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Python Flask Backend Code */}
      {activeTab === 'python_code' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-blue-600" />
                  Flask Backend Implementation (`backend/app.py`)
                </h2>
                <p className="text-xs text-slate-500">
                  Full Python code matching all project criteria. Created in project folder `/backend`.
                </p>
              </div>
              <button
                onClick={() => handleCopy('# See backend/app.py in project files', 'code')}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1.5"
              >
                {copiedSection === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'code' ? 'Copied' : 'Copy Path'}</span>
              </button>
            </div>

            <div className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-[11px] overflow-x-auto max-h-96">
              <pre>{`# Python Flask + SQLite Backend
# Run with: cd backend && pip install -r requirements.txt && python app.py

from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import sqlite3, qrcode, io, base64, secrets, hashlib, jwt
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

DB_PATH = 'attendance.db'
JWT_SECRET = 'smart-qr-attendance-sec-key-2026'

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

@app.route('/api/sessions/create', methods=['POST'])
def create_session():
    # 1. Generates 48-char random token
    raw_token = secrets.token_hex(24)
    token_h = hashlib.sha256(raw_token.encode()).hexdigest()
    # 2. Generates QR code in memory with Python qrcode
    qr = qrcode.QRCode(box_size=10, border=2)
    qr.add_data(f"http://localhost:3000/#scan?sessionId={sid}&token={raw_token}")
    # 3. Saves session in SQLite
    ...`}</pre>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              All backend files (`app.py`, `models.py`, `init_db.py`, `requirements.txt`, `README.md`) are saved in the <code>/backend</code> directory.
            </p>
          </div>
        </div>
      )}

      {/* Tab 4: Demonstration Guide */}
      {activeTab === 'guide' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            College Project Demonstration Checklist
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                1
              </span>
              <div>
                <span className="font-semibold text-slate-900">Show Teacher Login & Dashboard</span>
                <p className="text-slate-600">
                  Click the <strong>Demo Switcher</strong> and select <strong>Prof. Rajesh Sharma</strong>. Show the KPI summary cards and recent sessions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                2
              </span>
              <div>
                <span className="font-semibold text-slate-900">Start Attendance Session & Display QR</span>
                <p className="text-slate-600">
                  Click <strong>Start Session</strong>. Choose Class <em>SE-IT Div A</em> and Subject <em>Data Structures & Algorithms</em>. Set duration (e.g., 5 min). Click <strong>Projector Mode</strong> to show the large QR display.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                3
              </span>
              <div>
                <span className="font-semibold text-slate-900">Switch to Student & Mark Attendance</span>
                <p className="text-slate-600">
                  Use the <strong>Demo Switcher</strong> to switch to <strong>Aarav Patel</strong>. Click <strong>Scan QR</strong>. Use camera or paste token to record attendance. Show the success confirmation!
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                4
              </span>
              <div>
                <span className="font-semibold text-slate-900">Demonstrate Duplicate Rejection</span>
                <p className="text-slate-600">
                  Try scanning or submitting the same session again. The server immediately returns a red error: <em>"Duplicate attendance: You have already marked attendance for this session!"</em>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                5
              </span>
              <div>
                <span className="font-semibold text-slate-900">Switch Back to Teacher & Export CSV</span>
                <p className="text-slate-600">
                  Switch back to <strong>Prof. Rajesh Sharma</strong>. Watch the student's name appear in the live feed in real time! Go to <strong>Reports</strong> and click <strong>Export All Filtered (CSV)</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
