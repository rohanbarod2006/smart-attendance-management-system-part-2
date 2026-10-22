# Smart Attendance Management System Using QR Code - Backend (Python Flask)

This is the standalone Python Flask backend for the **Smart Attendance Management System Using QR Code**.

## Architecture & Technology Stack
- **Framework**: Python Flask 3.0
- **Database**: SQLite 3 (`attendance.db`)
- **Authentication**: JWT (JSON Web Tokens) with PBKDF2:SHA256 password hashing
- **QR Code Engine**: Python `qrcode` library with PIL (Pillow) image generation
- **Security**: SHA-256 token hashing, session expiry verification, student class enrollment checks, unique attendance constraints

## Folder Contents
- `app.py`: Main Flask application containing REST API endpoints, JWT decorators, and verification logic.
- `models.py`: SQLite DDL schema creation scripts.
- `init_db.py`: Script to initialize the SQLite database with demo accounts and data.
- `requirements.txt`: Python package requirements.

## How to Run Locally

### Step 1: Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Initialize SQLite Database
```bash
python init_db.py
```
This creates `attendance.db` and populates:
- Demo Teachers (`teacher@college.edu`, `teacher2@college.edu`)
- Demo Students (`student1@college.edu` to `student5@college.edu`)
- Demo Classes & Subjects
- Default password for all demo accounts: `password123`

### Step 3: Start the Flask Server
```bash
python app.py
```
The server will start at `http://localhost:5000`.

## API Documentation Summary

### Authentication
- `POST /api/auth/login`: Authenticate teacher or student with email and password.
- `POST /api/auth/register`: Create new student or teacher account.
- `GET /api/auth/me`: Retrieve currently authenticated user profile.

### Teacher Operations
- `GET /api/teacher/dashboard-stats`: Summary of students, active sessions, and recent session cards.
- `POST /api/sessions/create`: Generate new attendance session with time limit and dynamic QR code.
- `GET /api/sessions/<id>/live`: Poll real-time present student list for active session.
- `POST /api/sessions/<id>/close`: Manually terminate an active attendance session.
- `GET /api/reports/export-csv`: Download CSV attendance sheet.

### Student Operations
- `GET /api/student/dashboard`: View subject-wise attendance percentages, total sessions, and defaulter status (<75%).
- `POST /api/attendance/mark`: Submit session ID and scanned QR token with server-side validation.
