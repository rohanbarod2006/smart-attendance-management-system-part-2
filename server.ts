import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { getDb, queryAll, queryOne, runQuery, resetDatabase, saveDb } from './server/db.ts';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'smart-qr-attendance-sec-key-2026';

app.use(express.json());

// Helper to hash tokens
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Interface for Auth User
interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'teacher' | 'student' | 'admin';
  roll_number?: string | null;
}

// Extend Express Request
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// JWT Auth Middleware
function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded as AuthUser;
    next();
  });
}

// Role Authorization Middleware
function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access forbidden: requires ${roles.join(' or ')} role` });
    }
    next();
  };
}

// ---------------- API ROUTES ---------------- //

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 1. Auth: Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = queryOne<any>('SELECT * FROM Users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const payload: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roll_number: user.roll_number,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: payload,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// 2. Auth: Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, classIds, rollNumber } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    if (!['teacher', 'student', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be teacher, student, or admin' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = queryOne('SELECT id FROM Users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();

    const insertResult = runQuery(
      'INSERT INTO Users (name, email, password_hash, role, roll_number, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [name.trim(), cleanEmail, passwordHash, role, rollNumber?.trim() || null, now]
    );

    const userId = insertResult.lastInsertRowid;

    // If student has chosen class enrollment
    if (role === 'student' && Array.isArray(classIds)) {
      for (const cid of classIds) {
        runQuery('INSERT OR IGNORE INTO StudentClasses (student_id, class_id) VALUES (?, ?)', [userId, Number(cid)]);
      }
    }

    const payload: AuthUser = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      role,
      roll_number: rollNumber?.trim() || null,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: payload,
    });
  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// 3. Auth: Current User Profile
app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const user = queryOne<any>('SELECT id, name, email, role, roll_number, created_at FROM Users WHERE id = ?', [req.user!.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let enrolledClasses: any[] = [];
    if (user.role === 'student') {
      enrolledClasses = queryAll(
        `SELECT c.* FROM Classes c
         JOIN StudentClasses sc ON sc.class_id = c.id
         WHERE sc.student_id = ?`,
        [user.id]
      );
    }

    res.json({ user, enrolledClasses });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// 4. Auth: Reset Demo Database
app.post('/api/auth/reset-demo', async (req, res) => {
  try {
    await resetDatabase();
    res.json({ success: true, message: 'Database reset to initial demo state successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset database' });
  }
});

// 5. Classes and Subjects
app.get('/api/classes', authenticateToken, (req, res) => {
  try {
    const classes = queryAll('SELECT * FROM Classes ORDER BY class_name ASC');
    const subjects = queryAll('SELECT * FROM Subjects ORDER BY subject_name ASC');
    res.json({ classes, subjects });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// 6. Teacher: Dashboard Statistics
app.get('/api/teacher/dashboard-stats', authenticateToken, requireRole('teacher', 'admin'), (req: AuthenticatedRequest, res) => {
  try {
    const teacherId = req.user!.id;

    // Auto-update expired sessions first
    const nowIso = new Date().toISOString();
    runQuery(
      `UPDATE AttendanceSessions 
       SET status = 'EXPIRED' 
       WHERE status = 'ACTIVE' AND expiry_time <= ?`,
      [nowIso]
    );

    // Total unique students in the system
    const totalStudentsRow = queryOne<any>("SELECT COUNT(*) as count FROM Users WHERE role = 'student'");
    const totalStudents = totalStudentsRow?.count || 0;

    // Active attendance sessions created by this teacher
    const activeSessions = queryAll<any>(
      `SELECT s.*, c.class_name, sub.subject_name, sub.subject_code
       FROM AttendanceSessions s
       JOIN Classes c ON s.class_id = c.id
       JOIN Subjects sub ON s.subject_id = sub.id
       WHERE s.teacher_id = ? AND s.status = 'ACTIVE'
       ORDER BY s.id DESC`,
      [teacherId]
    );

    // Total students present in all sessions conducted by this teacher today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayIso = startOfToday.toISOString();

    const todayAttendanceRow = queryOne<any>(
      `SELECT COUNT(DISTINCT ar.id) as count
       FROM AttendanceRecords ar
       JOIN AttendanceSessions s ON ar.session_id = s.id
       WHERE s.teacher_id = ? AND ar.marked_at >= ?`,
      [teacherId, todayIso]
    );

    // Recent sessions conducted
    const recentSessions = queryAll<any>(
      `SELECT s.*, c.class_name, sub.subject_name, sub.subject_code,
              (SELECT COUNT(*) FROM AttendanceRecords ar WHERE ar.session_id = s.id) as present_count,
              (SELECT COUNT(*) FROM StudentClasses sc WHERE sc.class_id = s.class_id) as total_enrolled
       FROM AttendanceSessions s
       JOIN Classes c ON s.class_id = c.id
       JOIN Subjects sub ON s.subject_id = sub.id
       WHERE s.teacher_id = ?
       ORDER BY s.id DESC
       LIMIT 10`,
      [teacherId]
    );

    res.json({
      totalStudents,
      activeSessionsCount: activeSessions.length,
      activeSessions,
      todayAttendanceCount: todayAttendanceRow?.count || 0,
      recentSessions,
    });
  } catch (err: any) {
    console.error('Teacher stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// 7. Teacher: Create Attendance Session & Generate QR Code
app.post('/api/sessions/create', authenticateToken, requireRole('teacher', 'admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const teacherId = req.user!.id;
    const { classId, subjectId, durationMinutes } = req.body;

    if (!classId || !subjectId) {
      return res.status(400).json({ error: 'Class and subject are required' });
    }

    const duration = Number(durationMinutes) || 5; // default 5 minutes
    if (duration <= 0 || duration > 180) {
      return res.status(400).json({ error: 'Duration must be between 1 and 180 minutes' });
    }

    // Verify subject belongs to class
    const subject = queryOne<any>('SELECT * FROM Subjects WHERE id = ? AND class_id = ?', [subjectId, classId]);
    if (!subject) {
      return res.status(400).json({ error: 'Selected subject does not belong to the selected class' });
    }

    const cls = queryOne<any>('SELECT * FROM Classes WHERE id = ?', [classId]);

    // Check if there is already an active session for the same class and subject by this teacher
    const now = new Date();
    const nowIso = now.toISOString();

    // Expire any outdated sessions first
    runQuery(
      `UPDATE AttendanceSessions 
       SET status = 'EXPIRED' 
       WHERE status = 'ACTIVE' AND expiry_time <= ?`,
      [nowIso]
    );

    // Generate unique cryptographically secure token
    const rawToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = hashToken(rawToken);

    const startTime = now.toISOString();
    const expiryTime = new Date(now.getTime() + duration * 60 * 1000).toISOString();

    const insertRes = runQuery(
      `INSERT INTO AttendanceSessions (teacher_id, subject_id, class_id, token_hash, start_time, expiry_time, status)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [teacherId, subjectId, classId, tokenHash, startTime, expiryTime]
    );

    const sessionId = insertRes.lastInsertRowid;

    // Attendance URL that will be encoded into the QR code
    // The student's camera scan or browser link will point to this URL
    const appUrl = (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
    const attendanceUrl = `${appUrl}/#scan?sessionId=${sessionId}&token=${rawToken}`;

    // Payload embedded in QR code: standardized JSON string or URL
    // Including JSON string allows offline/app-level parsers as well as browser links
    const qrPayload = JSON.stringify({
      type: 'SMART_ATTENDANCE_QR',
      sessionId,
      token: rawToken,
      subjectCode: subject.subject_code,
      className: cls?.class_name,
      expiryTime,
      url: attendanceUrl,
    });

    // Generate high-resolution Data URL for the QR code
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      width: 480,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    res.status(201).json({
      session: {
        id: sessionId,
        teacher_id: teacherId,
        subject_id: subjectId,
        class_id: classId,
        subject_name: subject.subject_name,
        subject_code: subject.subject_code,
        class_name: cls?.class_name,
        start_time: startTime,
        expiry_time: expiryTime,
        status: 'ACTIVE',
        duration_minutes: duration,
      },
      token: rawToken,
      qrDataUrl,
      attendanceUrl,
      qrPayload,
    });
  } catch (err: any) {
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Failed to create attendance session' });
  }
});

// 8. Teacher: Get Session Live Status & Realtime Attendees
app.get('/api/sessions/:id/live', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const sessionId = Number(req.params.id);
    const session = queryOne<any>(
      `SELECT s.*, c.class_name, sub.subject_name, sub.subject_code, u.name as teacher_name
       FROM AttendanceSessions s
       JOIN Classes c ON s.class_id = c.id
       JOIN Subjects sub ON s.subject_id = sub.id
       JOIN Users u ON s.teacher_id = u.id
       WHERE s.id = ?`,
      [sessionId]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const nowIso = new Date().toISOString();
    let currentStatus = session.status;
    if (currentStatus === 'ACTIVE' && session.expiry_time <= nowIso) {
      currentStatus = 'EXPIRED';
      runQuery("UPDATE AttendanceSessions SET status = 'EXPIRED' WHERE id = ?", [sessionId]);
      session.status = 'EXPIRED';
    }

    // Fetch attended students
    const records = queryAll<any>(
      `SELECT ar.id, ar.marked_at, ar.status, u.id as student_id, u.name as student_name, u.email as student_email, u.roll_number
       FROM AttendanceRecords ar
       JOIN Users u ON ar.student_id = u.id
       WHERE ar.session_id = ?
       ORDER BY ar.marked_at DESC`,
      [sessionId]
    );

    // Fetch total students enrolled in this session's class
    const enrolledStudents = queryAll<any>(
      `SELECT u.id, u.name, u.email, u.roll_number
       FROM Users u
       JOIN StudentClasses sc ON u.id = sc.student_id
       WHERE sc.class_id = ? AND u.role = 'student'
       ORDER BY u.roll_number ASC, u.name ASC`,
      [session.class_id]
    );

    const attendedIds = new Set(records.map(r => r.student_id));
    const absentStudents = enrolledStudents.filter(s => !attendedIds.has(s.id));

    res.json({
      session,
      records,
      presentCount: records.length,
      totalEnrolled: enrolledStudents.length,
      absentStudents,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch session live data' });
  }
});

// 9. Teacher: Close Attendance Session
app.post('/api/sessions/:id/close', authenticateToken, requireRole('teacher', 'admin'), (req: AuthenticatedRequest, res) => {
  try {
    const sessionId = Number(req.params.id);
    const session = queryOne<any>('SELECT * FROM AttendanceSessions WHERE id = ?', [sessionId]);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.teacher_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only the session organizer can close this session' });
    }

    runQuery("UPDATE AttendanceSessions SET status = 'CLOSED' WHERE id = ?", [sessionId]);
    res.json({ success: true, message: 'Attendance session closed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to close session' });
  }
});

// 10. Student: Submit Attendance (Strict Server-Side Validation)
app.post('/api/attendance/mark', authenticateToken, requireRole('student', 'admin'), (req: AuthenticatedRequest, res) => {
  try {
    const studentId = req.user!.id;
    const { sessionId, token } = req.body;

    if (!sessionId || !token) {
      return res.status(400).json({ error: 'Session ID and QR token are required' });
    }

    const session = queryOne<any>(
      `SELECT s.*, c.class_name, sub.subject_name, sub.subject_code, u.name as teacher_name
       FROM AttendanceSessions s
       JOIN Classes c ON s.class_id = c.id
       JOIN Subjects sub ON s.subject_id = sub.id
       JOIN Users u ON s.teacher_id = u.id
       WHERE s.id = ?`,
      [Number(sessionId)]
    );

    // 1. Session exists check
    if (!session) {
      return res.status(404).json({ error: 'Invalid attendance session. Session does not exist.' });
    }

    // 2. Expiry check
    const now = new Date();
    const expiry = new Date(session.expiry_time);

    if (now > expiry || session.status === 'EXPIRED') {
      runQuery("UPDATE AttendanceSessions SET status = 'EXPIRED' WHERE id = ?", [session.id]);
      return res.status(400).json({
        error: 'This attendance QR code has expired. Please contact your teacher.',
        code: 'SESSION_EXPIRED',
      });
    }

    // 3. Status active check
    if (session.status === 'CLOSED') {
      return res.status(400).json({
        error: 'This attendance session has been closed by the teacher.',
        code: 'SESSION_CLOSED',
      });
    }

    // 4. Token hash verification
    const computedHash = hashToken(token.trim());
    if (computedHash !== session.token_hash) {
      return res.status(400).json({
        error: 'Invalid QR code token. Tampering or invalid QR detected.',
        code: 'INVALID_TOKEN',
      });
    }

    // 5. Student enrolled in class check
    const enrollment = queryOne(
      'SELECT * FROM StudentClasses WHERE student_id = ? AND class_id = ?',
      [studentId, session.class_id]
    );

    if (!enrollment && req.user!.role !== 'admin') {
      return res.status(403).json({
        error: `You are not enrolled in class "${session.class_name}". You cannot mark attendance for this lecture.`,
        code: 'NOT_ENROLLED',
      });
    }

    // 6. Duplicate attendance check (database constraint will also catch it)
    const existingRecord = queryOne(
      'SELECT id, marked_at FROM AttendanceRecords WHERE session_id = ? AND student_id = ?',
      [session.id, studentId]
    );

    if (existingRecord) {
      return res.status(409).json({
        error: 'Duplicate attendance: You have already marked your attendance for this session!',
        markedAt: existingRecord.marked_at,
        code: 'DUPLICATE_ATTENDANCE',
      });
    }

    // 7. Insert record into database
    const markedAt = now.toISOString();
    runQuery(
      `INSERT INTO AttendanceRecords (session_id, student_id, marked_at, status)
       VALUES (?, ?, ?, 'PRESENT')`,
      [session.id, studentId, markedAt]
    );

    res.status(200).json({
      success: true,
      message: 'Attendance recorded successfully!',
      details: {
        studentName: req.user!.name,
        rollNumber: req.user!.roll_number,
        subjectName: session.subject_name,
        subjectCode: session.subject_code,
        className: session.class_name,
        teacherName: session.teacher_name,
        markedAt,
      },
    });
  } catch (err: any) {
    console.error('Mark attendance error:', err);
    res.status(500).json({ error: 'Failed to record attendance due to server error' });
  }
});

// 11. Student: Dashboard Details (Subject-wise percentage & History)
app.get('/api/student/dashboard', authenticateToken, requireRole('student', 'admin'), (req: AuthenticatedRequest, res) => {
  try {
    const studentId = req.user!.id;

    // Get student's enrolled classes
    const classes = queryAll<any>(
      `SELECT c.* FROM Classes c
       JOIN StudentClasses sc ON sc.class_id = c.id
       WHERE sc.student_id = ?`,
      [studentId]
    );

    const classIds = classes.map(c => c.id);
    if (classIds.length === 0) {
      return res.json({
        profile: req.user,
        classes: [],
        subjectPercentages: [],
        overallPercentage: 0,
        totalEligibleSessions: 0,
        totalAttendedSessions: 0,
        recentHistory: [],
      });
    }

    // Get all subjects belonging to enrolled classes
    const placeholders = classIds.map(() => '?').join(',');
    const subjects = queryAll<any>(
      `SELECT s.*, c.class_name 
       FROM Subjects s
       JOIN Classes c ON s.class_id = c.id
       WHERE s.class_id IN (${placeholders})
       ORDER BY s.subject_name ASC`,
      classIds
    );

    // For each subject, calculate total sessions conducted vs sessions attended by student
    const subjectPercentages = subjects.map(sub => {
      // Total sessions conducted for this subject
      const totalSessionsRow = queryOne<any>(
        'SELECT COUNT(*) as count FROM AttendanceSessions WHERE subject_id = ?',
        [sub.id]
      );
      const totalSessions = totalSessionsRow?.count || 0;

      // Sessions attended by this student for this subject
      const attendedSessionsRow = queryOne<any>(
        `SELECT COUNT(*) as count 
         FROM AttendanceRecords ar
         JOIN AttendanceSessions s ON ar.session_id = s.id
         WHERE s.subject_id = ? AND ar.student_id = ?`,
        [sub.id, studentId]
      );
      const attendedSessions = attendedSessionsRow?.count || 0;

      const percentage = totalSessions > 0
        ? Math.round((attendedSessions / totalSessions) * 100 * 10) / 10
        : 100; // If no session conducted yet, nominal 100%

      return {
        subjectId: sub.id,
        subjectName: sub.subject_name,
        subjectCode: sub.subject_code,
        className: sub.class_name,
        totalSessions,
        attendedSessions,
        percentage,
        isDefaulter: percentage < 75 && totalSessions > 0, // Standard 75% college criterion
      };
    });

    // Overall attendance calculation
    const totalConducted = subjectPercentages.reduce((sum, item) => sum + item.totalSessions, 0);
    const totalAttended = subjectPercentages.reduce((sum, item) => sum + item.attendedSessions, 0);
    const overallPercentage = totalConducted > 0
      ? Math.round((totalAttended / totalConducted) * 100 * 10) / 10
      : 100;

    // Recent 10 attendance records
    const recentHistory = queryAll<any>(
      `SELECT ar.id, ar.marked_at, ar.status, s.id as session_id,
              sub.subject_name, sub.subject_code, c.class_name, u.name as teacher_name
       FROM AttendanceRecords ar
       JOIN AttendanceSessions s ON ar.session_id = s.id
       JOIN Subjects sub ON s.subject_id = sub.id
       JOIN Classes c ON s.class_id = c.id
       JOIN Users u ON s.teacher_id = u.id
       WHERE ar.student_id = ?
       ORDER BY ar.marked_at DESC
       LIMIT 10`,
      [studentId]
    );

    res.json({
      profile: req.user,
      classes,
      subjectPercentages,
      overallPercentage,
      totalEligibleSessions: totalConducted,
      totalAttendedSessions: totalAttended,
      recentHistory,
    });
  } catch (err: any) {
    console.error('Student dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch student dashboard details' });
  }
});

// 12. Student: Full Attendance History with Filters
app.get('/api/student/history', authenticateToken, requireRole('student', 'admin'), (req: AuthenticatedRequest, res) => {
  try {
    const studentId = req.user!.id;
    const { subjectId } = req.query;

    let sql = `
      SELECT ar.id, ar.marked_at, ar.status, s.id as session_id, s.start_time,
             sub.subject_name, sub.subject_code, c.class_name, u.name as teacher_name
      FROM AttendanceRecords ar
      JOIN AttendanceSessions s ON ar.session_id = s.id
      JOIN Subjects sub ON s.subject_id = sub.id
      JOIN Classes c ON s.class_id = c.id
      JOIN Users u ON s.teacher_id = u.id
      WHERE ar.student_id = ?
    `;
    const params: any[] = [studentId];

    if (subjectId) {
      sql += ' AND s.subject_id = ?';
      params.push(Number(subjectId));
    }

    sql += ' ORDER BY ar.marked_at DESC';

    const records = queryAll(sql, params);
    res.json({ records });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// 13. Reports: Teacher Multi-Criteria Attendance Reports
app.get('/api/reports/teacher', authenticateToken, requireRole('teacher', 'admin'), (req: AuthenticatedRequest, res) => {
  try {
    const { classId, subjectId, date } = req.query;

    let sql = `
      SELECT s.id as session_id, s.start_time, s.expiry_time, s.status as session_status,
             c.id as class_id, c.class_name,
             sub.id as subject_id, sub.subject_name, sub.subject_code,
             u.name as teacher_name,
             (SELECT COUNT(*) FROM AttendanceRecords ar WHERE ar.session_id = s.id) as present_count,
             (SELECT COUNT(*) FROM StudentClasses sc WHERE sc.class_id = s.class_id) as total_enrolled
      FROM AttendanceSessions s
      JOIN Classes c ON s.class_id = c.id
      JOIN Subjects sub ON s.subject_id = sub.id
      JOIN Users u ON s.teacher_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (classId) {
      sql += ' AND s.class_id = ?';
      params.push(Number(classId));
    }

    if (subjectId) {
      sql += ' AND s.subject_id = ?';
      params.push(Number(subjectId));
    }

    if (date) {
      sql += " AND date(s.start_time) = date(?)";
      params.push(date as string);
    }

    sql += ' ORDER BY s.id DESC';

    const sessions = queryAll<any>(sql, params);

    // Summary statistics
    const totalSessions = sessions.length;
    const totalPresentCumulative = sessions.reduce((sum, s) => sum + s.present_count, 0);
    const totalEnrolledCumulative = sessions.reduce((sum, s) => sum + s.total_enrolled, 0);
    const averagePercentage = totalEnrolledCumulative > 0
      ? Math.round((totalPresentCumulative / totalEnrolledCumulative) * 100 * 10) / 10
      : 0;

    res.json({
      sessions,
      summary: {
        totalSessions,
        totalPresentCumulative,
        totalEnrolledCumulative,
        averagePercentage,
      },
    });
  } catch (err: any) {
    console.error('Reports error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance reports' });
  }
});

// 14. Reports: Export Attendance Records as CSV
app.get('/api/reports/export-csv', authenticateToken, requireRole('teacher', 'admin'), (req: AuthenticatedRequest, res) => {
  try {
    const { classId, subjectId, sessionId } = req.query;

    let sql = `
      SELECT ar.id, ar.marked_at, ar.status,
             u.name as student_name, u.email as student_email, u.roll_number,
             sub.subject_name, sub.subject_code,
             c.class_name,
             t.name as teacher_name,
             s.id as session_id, s.start_time
      FROM AttendanceRecords ar
      JOIN AttendanceSessions s ON ar.session_id = s.id
      JOIN Users u ON ar.student_id = u.id
      JOIN Subjects sub ON s.subject_id = sub.id
      JOIN Classes c ON s.class_id = c.id
      JOIN Users t ON s.teacher_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (sessionId) {
      sql += ' AND s.id = ?';
      params.push(Number(sessionId));
    } else {
      if (classId) {
        sql += ' AND s.class_id = ?';
        params.push(Number(classId));
      }
      if (subjectId) {
        sql += ' AND s.subject_id = ?';
        params.push(Number(subjectId));
      }
    }

    sql += ' ORDER BY s.id DESC, ar.marked_at ASC';

    const records = queryAll<any>(sql, params);

    // Generate CSV string
    const headers = [
      'Record ID',
      'Session ID',
      'Date & Time',
      'Student Roll No',
      'Student Name',
      'Student Email',
      'Class',
      'Subject Code',
      'Subject Name',
      'Teacher Name',
      'Attendance Status',
    ];

    const escapeCsv = (val: any) => {
      const str = val === null || val === undefined ? '' : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = records.map(r => [
      r.id,
      r.session_id,
      new Date(r.marked_at).toLocaleString(),
      r.roll_number || 'N/A',
      r.student_name,
      r.student_email,
      r.class_name,
      r.subject_code,
      r.subject_name,
      r.teacher_name,
      r.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.map(escapeCsv).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_report_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    console.error('Export CSV error:', err);
    res.status(500).json({ error: 'Failed to export CSV report' });
  }
});

// 15. Helper: Verify QR token metadata without logging in (for scan preview)
app.get('/api/sessions/preview', (req, res) => {
  try {
    const { sessionId, token } = req.query;
    if (!sessionId || !token) {
      return res.status(400).json({ error: 'Session ID and token are required' });
    }

    const session = queryOne<any>(
      `SELECT s.id, s.start_time, s.expiry_time, s.status, s.class_id, s.subject_id,
              c.class_name, sub.subject_name, sub.subject_code, u.name as teacher_name
       FROM AttendanceSessions s
       JOIN Classes c ON s.class_id = c.id
       JOIN Subjects sub ON s.subject_id = sub.id
       JOIN Users u ON s.teacher_id = u.id
       WHERE s.id = ?`,
      [Number(sessionId)]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const now = new Date();
    const isExpired = now > new Date(session.expiry_time) || session.status === 'EXPIRED';

    res.json({
      session: {
        id: session.id,
        className: session.class_name,
        subjectName: session.subject_name,
        subjectCode: session.subject_code,
        teacherName: session.teacher_name,
        expiryTime: session.expiry_time,
        isExpired,
        status: isExpired ? 'EXPIRED' : session.status,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to preview session' });
  }
});

// ---------------- VITE MIDDLEWARE & SERVER START ---------------- //

async function startServer() {
  // Initialize Database
  await getDb();

  const isProduction = process.env.NODE_ENV === 'production';
  const disableHmr = process.env.DISABLE_HMR === 'true';

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: disableHmr ? false : undefined,
        watch: disableHmr ? null : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
