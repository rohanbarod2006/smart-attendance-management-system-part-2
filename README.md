# Smart Attendance Management System Using QR Code

A production-grade, secure, browser-based student attendance tracking platform developed for college and university environments.

---

## 📌 Project Overview
- **Project Title:** Smart Attendance Management System Using QR Code
- **Target Audience:** College Students (Second-Year IT Engineering Project) & Faculty
- **Key Problem Solved:** Eliminates time-consuming paper attendance sheets and prevents proxy attendance through time-limited dynamic QR code sessions, cryptographic token verification, and student class enrollment validation.

---

## 🛠️ Technology Stack
- **Architecture:** Pure Client-Side Single Page Application (React 19, TypeScript, Vite)
- **Styling:** Tailwind CSS, Lucide Icons
- **QR Engine:** Browser-based `qrcode` generation & `html5-qrcode` camera WebRTC decoding
- **Storage & State:** Persistent Client-Side Relational Store in `localStorage`
- **Security:** Browser Native SubtleCrypto (SHA-256) session token hashing, time-limited tokens, duplicate prevention checks

---

## 🏗️ System Architecture & Workflow

```
+-------------------------------------------------------------+
|                     TEACHER DASHBOARD                       |
| 1. Selects Class & Subject -> Sets Timer (e.g. 5 min)       |
| 2. Backend generates 48-char random token & SHA-256 hash    |
| 3. High-definition QR Code displayed on classroom screen    |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                     STUDENT DASHBOARD                       |
| 4. Student logs in -> Opens browser camera                  |
| 5. Scans QR code or enters attendance token fallback        |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                SERVER-SIDE 7-POINT VERIFICATION             |
| 1. Student Authenticated (Valid JWT)?                       |
| 2. Session exists in database?                              |
| 3. Status is ACTIVE (not closed)?                           |
| 4. Session not expired (Current Time <= Expiry Time)?       |
| 5. SHA-256(Scanned Token) == Stored Token Hash?             |
| 6. Student is enrolled in this Class (StudentClasses)?      |
| 7. Not a duplicate (AttendanceRecords UNIQUE constraint)?   |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                 SQLITE DATABASE COMMIT                      |
| Records student attendance -> Updates Teacher Live Monitor  |
+-------------------------------------------------------------+
```

---

## 📂 Project Structure

```text
├── backend/                       # Complete Python Flask Backend
│   ├── app.py                     # Flask REST API, JWT auth, routes, QR generator
│   ├── models.py                  # SQLite schema definitions
│   ├── init_db.py                 # SQLite database creation & demo seeder
│   ├── requirements.txt           # Python dependencies
│   └── README.md                  # Flask backend setup documentation
├── src/                           # React Frontend Application
│   ├── components/
│   │   ├── Navbar.tsx             # Clean 3-zone top navigation bar
│   │   ├── TeacherDashboard.tsx   # Live session monitor, KPIs, recent lectures
│   │   ├── StudentDashboard.tsx   # Subject percentages, 75% rule, history
│   │   ├── CreateSessionModal.tsx # Class/subject select, duration picker, QR generator
│   │   ├── QRScannerModal.tsx     # WebRTC camera scanner, upload & manual fallback
│   │   ├── ReportsView.tsx        # Multi-filter reports, absent list, CSV export
│   │   ├── VivaDocumentationModal.tsx # In-app Viva Prep, ERD, and architecture guide
│   │   └── AuthModal.tsx          # Login, Register, and 1-click Demo switchers
│   ├── context/
│   │   └── AuthContext.tsx        # React Context for authentication state
│   ├── services/
│   │   └── api.ts                 # Typed fetch client with Bearer token injection
│   ├── types.ts                   # TypeScript interfaces
│   ├── App.tsx                    # Main root component & routing
│   ├── main.tsx                   # React root entrypoint
│   └── index.css                  # Tailwind CSS configuration
├── server/
│   └── db.ts                      # SQLite (sql.js) database connection & schema
├── server.ts                      # Full-stack Express server on port 3000
├── index.html                     # HTML entry point with metadata
├── package.json                   # Node.js dependencies & scripts
├── tsconfig.json                  # TypeScript compiler options
└── README.md                      # Complete project guide
```

---

## 🚀 How to Run the Project

### Option A: Running the Interactive Web App (Vite + Express + SQLite)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the full-stack dev server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.

---

### Option B: Running the Python Flask Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Initialize the SQLite database with demo accounts:
   ```bash
   python init_db.py
   ```
4. Start the Flask server:
   ```bash
   python app.py
   ```
   The Flask API runs at `http://localhost:5000`.

---

## 👥 Demo Accounts (Development & Viva Demonstration)

All demo accounts use the standard password: `password123`

| Role | Name | Email | Details |
|---|---|---|---|
| **Faculty / Teacher** | Prof. Rajesh Sharma | `teacher@college.edu` | Faculty, Dept. of IT |
| **Faculty / Teacher** | Dr. Ananya Iyer | `teacher2@college.edu` | Faculty, Dept. of IT |
| **Student 1** | Aarav Patel | `student1@college.edu` | Roll No: `SE-IT-101` (Div A) |
| **Student 2** | Diya Sharma | `student2@college.edu` | Roll No: `SE-IT-102` (Div A) |
| **Student 3** | Rohan Verma | `student3@college.edu` | Roll No: `SE-IT-103` (Div A) |
| **Administrator** | College Admin | `admin@college.edu` | Admin Privileges |

*Note: For production deployments, change default passwords immediately.*

---

## 🧪 College Viva Demonstration Guide

1. **Teacher Login:** Click "Faculty / Teacher" or use the bottom Demo Switcher.
2. **Start Session:** Click **Start Session**. Choose Class *SE-IT Div A* and Subject *Data Structures & Algorithms*. Set duration (e.g. 5 minutes). Click **Projector Mode** to display the QR code.
3. **Student Scan:** Switch to Student *Aarav Patel*. Click **Scan QR**. Point camera or enter the attendance link. Notice instant success confirmation and confetti animation!
4. **Duplicate Rejection:** Try submitting the same session again. The server immediately returns an error: *"Duplicate attendance: You have already marked attendance for this session!"*
5. **Real-time Live Roster:** Switch back to *Prof. Rajesh Sharma*. Watch the attendee appear in the live feed in real time without refreshing the page!
6. **Reports & CSV:** Open **Reports**, filter by class or subject, view present vs absent students, and click **Export All Filtered (CSV)**.
