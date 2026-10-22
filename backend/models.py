"""
Database Models and Schemas for Smart Attendance Management System
SQLite Database Tables:
- Users (Teachers, Students, Admins)
- Classes (Departments, Academic Years)
- Subjects (Mapped to Classes)
- StudentClasses (Enrolled students in classes)
- AttendanceSessions (Time-bound attendance sessions with token hashes)
- AttendanceRecords (Recorded student attendance)
"""

SCHEMA_SQL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('teacher', 'student', 'admin')),
    roll_number TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_name TEXT NOT NULL,
    department TEXT NOT NULL,
    academic_year TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_name TEXT NOT NULL,
    subject_code TEXT NOT NULL,
    class_id INTEGER NOT NULL,
    FOREIGN KEY (class_id) REFERENCES Classes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS StudentClasses (
    student_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    PRIMARY KEY (student_id, class_id),
    FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES Classes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS AttendanceSessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    start_time TIMESTAMP NOT NULL,
    expiry_time TIMESTAMP NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'CLOSED', 'EXPIRED')),
    FOREIGN KEY (teacher_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES Subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES Classes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS AttendanceRecords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'PRESENT',
    UNIQUE (session_id, student_id),
    FOREIGN KEY (session_id) REFERENCES AttendanceSessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE
);
"""
