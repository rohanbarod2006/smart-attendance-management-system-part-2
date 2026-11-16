import QRCode from 'qrcode';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, firebaseConfigError } from '../lib/firebase.ts';
import {
  AttendanceRecord,
  AttendanceSession,
  SessionLiveDetails,
  StudentDashboardData,
  SubjectAttendanceStat,
  TeacherClass,
  TeacherDashboardStats,
  TeacherReportsResult,
  User,
} from '../types.ts';
import { fetchTeacherClasses } from './classService.ts';

const VALID_FIRESTORE_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function logFirestoreDiagnostic(error: unknown, operationType: OperationType, path: string) {
  const currentUser = auth?.currentUser;
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    code:
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : undefined,
    operationType,
    path,
    authInfo: {
      userId: currentUser?.uid ?? null,
      email: currentUser?.email ?? null,
      emailVerified: currentUser?.emailVerified ?? null,
      isAnonymous: currentUser?.isAnonymous ?? null,
    },
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
}

function getFirestoreErrorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : '';
}

async function sha256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', buf);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getEffectiveSessionStatus(
  rawStatus: unknown,
  expiryTimeIso: string
): 'ACTIVE' | 'CLOSED' | 'EXPIRED' {
  if (rawStatus === 'CLOSED') return 'CLOSED';
  if (rawStatus === 'EXPIRED') return 'EXPIRED';
  if (expiryTimeIso && new Date(expiryTimeIso).getTime() <= Date.now()) {
    return 'EXPIRED';
  }
  return 'ACTIVE';
}

export function mapSessionDoc(
  id: string,
  data: Record<string, unknown>,
  presentCount?: number
): AttendanceSession {
  const expiryTime = typeof data.expiryTime === 'string' ? data.expiryTime : new Date().toISOString();
  return {
    id,
    teacherUid: typeof data.teacherUid === 'string' ? data.teacherUid : '',
    teacherName: typeof data.teacherName === 'string' ? data.teacherName : 'Faculty',
    classId: typeof data.classId === 'string' ? data.classId : '',
    className: typeof data.className === 'string' ? data.className : '',
    subjectName: typeof data.subjectName === 'string' ? data.subjectName : '',
    subjectCode: typeof data.subjectCode === 'string' ? data.subjectCode : '',
    department: typeof data.department === 'string' ? data.department : '',
    startTime: typeof data.startTime === 'string' ? data.startTime : '',
    expiryTime,
    durationMinutes: typeof data.durationMinutes === 'number' ? data.durationMinutes : 5,
    status: getEffectiveSessionStatus(data.status, expiryTime),
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
    presentCount,
  };
}

export function mapAttendanceDoc(id: string, data: Record<string, unknown>): AttendanceRecord {
  return {
    id,
    sessionId: typeof data.sessionId === 'string' ? data.sessionId : '',
    classId: typeof data.classId === 'string' ? data.classId : '',
    className: typeof data.className === 'string' ? data.className : '',
    subjectName: typeof data.subjectName === 'string' ? data.subjectName : '',
    subjectCode: typeof data.subjectCode === 'string' ? data.subjectCode : '',
    teacherUid: typeof data.teacherUid === 'string' ? data.teacherUid : '',
    teacherName: typeof data.teacherName === 'string' ? data.teacherName : 'Faculty',
    studentUid: typeof data.studentUid === 'string' ? data.studentUid : '',
    studentName: typeof data.studentName === 'string' ? data.studentName : 'Student',
    studentEmail: typeof data.studentEmail === 'string' ? data.studentEmail : '',
    rollNumber: typeof data.rollNumber === 'string' ? data.rollNumber : null,
    markedAt: typeof data.markedAt === 'string' ? data.markedAt : '',
    status: 'PRESENT',
  };
}

export async function createAttendanceSession(params: {
  teacherUid: string;
  teacherName: string;
  teacherClass: TeacherClass;
  durationMinutes: number;
}): Promise<{
  session: AttendanceSession;
  token: string;
  qrDataUrl: string;
  attendanceUrl: string;
}> {
  if (!db) {
    throw new Error(firebaseConfigError || 'Cloud Firestore is not initialized.');
  }

  const { teacherUid, teacherName, teacherClass } = params;
  const duration = Math.max(1, Math.min(180, Number(params.durationMinutes) || 5));

  const randomBytes = new Uint8Array(24);
  window.crypto.getRandomValues(randomBytes);
  const rawToken = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const tokenHash = await sha256(rawToken);

  const now = new Date();
  const startTime = now.toISOString();
  const expiryDate = new Date(now.getTime() + duration * 60 * 1000);
  const expiryTime = expiryDate.toISOString();
  const expiryTimestamp = Timestamp.fromDate(expiryDate);

  const sessionRef = doc(collection(db, 'sessions'));
  const secretRef = doc(db, 'sessionSecrets', sessionRef.id);

  // Store only non-secret session metadata in `sessions/{sessionId}`.
  // The SHA-256 `tokenHash` is stored strictly in `sessionSecrets/{sessionId}`,
  // which is unreadable by students and verified server-side by Firestore Security Rules.
  const sessionPayload = {
    teacherUid,
    teacherName: (teacherName.trim() || 'Faculty').slice(0, 120),
    classId: teacherClass.id,
    className: teacherClass.className,
    subjectName: teacherClass.subjectName,
    subjectCode: teacherClass.subjectCode,
    department: teacherClass.department,
    startTime,
    expiryTime,
    expiryTimestamp,
    durationMinutes: duration,
    status: 'ACTIVE',
    createdAt: startTime,
  };

  const secretPayload = {
    sessionId: sessionRef.id,
    teacherUid,
    tokenHash,
    createdAt: startTime,
  };

  const batch = writeBatch(db);
  batch.set(sessionRef, sessionPayload);
  batch.set(secretRef, secretPayload);

  try {
    await batch.commit();
  } catch (err) {
    logFirestoreDiagnostic(err, OperationType.WRITE, `sessions/${sessionRef.id}`);
    throw err;
  }

  const session: AttendanceSession = {
    id: sessionRef.id,
    teacherUid,
    teacherName: sessionPayload.teacherName,
    classId: teacherClass.id,
    className: teacherClass.className,
    subjectName: teacherClass.subjectName,
    subjectCode: teacherClass.subjectCode,
    department: teacherClass.department,
    startTime,
    expiryTime,
    durationMinutes: duration,
    status: 'ACTIVE',
    createdAt: startTime,
    presentCount: 0,
  };

  const attendanceUrl = `${window.location.origin}/#scan?sessionId=${encodeURIComponent(
    sessionRef.id
  )}&token=${rawToken}`;

  const qrPayload = JSON.stringify({
    type: 'SMART_ATTENDANCE_QR',
    sessionId: sessionRef.id,
    token: rawToken,
    subjectCode: teacherClass.subjectCode,
    className: teacherClass.className,
    expiryTime,
    url: attendanceUrl,
  });

  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: 'M',
    width: 480,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  return {
    session,
    token: rawToken,
    qrDataUrl,
    attendanceUrl,
  };
}

export async function closeAttendanceSession(sessionId: string): Promise<void> {
  if (!db) {
    throw new Error(firebaseConfigError || 'Cloud Firestore is not initialized.');
  }

  await updateDoc(doc(db, 'sessions', sessionId), {
    status: 'CLOSED',
  });
}

export async function fetchTeacherDashboardData(
  teacherUid: string
): Promise<{ classes: TeacherClass[]; stats: TeacherDashboardStats }> {
  if (!db) {
    throw new Error(firebaseConfigError || 'Cloud Firestore is not initialized.');
  }

  const [classes, sessionsSnap, attendanceSnap] = await Promise.all([
    fetchTeacherClasses(teacherUid),
    getDocs(query(collection(db, 'sessions'), where('teacherUid', '==', teacherUid))),
    getDocs(query(collection(db, 'attendance'), where('teacherUid', '==', teacherUid))),
  ]);

  const records = attendanceSnap.docs.map((d) => mapAttendanceDoc(d.id, d.data()));
  const countBySession = new Map<string, number>();
  for (const r of records) {
    countBySession.set(r.sessionId, (countBySession.get(r.sessionId) || 0) + 1);
  }

  const sessions = sessionsSnap.docs
    .map((d) => mapSessionDoc(d.id, d.data(), countBySession.get(d.id) || 0))
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const activeSessions = sessions.filter((s) => s.status === 'ACTIVE');
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAttendanceCount = records.filter((r) => r.markedAt.startsWith(todayStr)).length;

  return {
    classes,
    stats: {
      totalClasses: classes.length,
      activeSessionsCount: activeSessions.length,
      activeSessions,
      todayAttendanceCount,
      totalSessionsCount: sessions.length,
      totalAttendanceMarks: records.length,
      recentSessions: sessions.slice(0, 12),
    },
  };
}

export async function fetchSessionLiveDetails(
  sessionId: string,
  teacherUid: string
): Promise<SessionLiveDetails> {
  if (!db) {
    throw new Error(firebaseConfigError || 'Cloud Firestore is not initialized.');
  }

  const [sessionSnap, attendanceSnap] = await Promise.all([
    getDoc(doc(db, 'sessions', sessionId)),
    getDocs(query(collection(db, 'attendance'), where('teacherUid', '==', teacherUid))),
  ]);

  if (!sessionSnap.exists()) {
    throw new Error('Attendance session not found.');
  }

  const records = attendanceSnap.docs
    .map((d) => mapAttendanceDoc(d.id, d.data()))
    .filter((r) => r.sessionId === sessionId)
    .sort((a, b) => new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime());

  const session = mapSessionDoc(sessionSnap.id, sessionSnap.data(), records.length);

  return {
    session,
    records,
    presentCount: records.length,
  };
}

export async function markStudentAttendance(params: {
  sessionId: string;
  token: string;
  student: User;
}): Promise<{
  success: boolean;
  message: string;
  details: {
    studentName: string;
    rollNumber: string;
    subjectName: string;
    subjectCode: string;
    className: string;
    teacherName: string;
    markedAt: string;
  };
}> {
  if (!db || !auth) {
    throw new Error(firebaseConfigError || 'Cloud Firestore is not initialized.');
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Your Firebase session has expired. Please sign in again as a student.');
  }

  const { student } = params;
  const cleanSessionId = params.sessionId.trim();
  const cleanToken = params.token.trim();

  if (student.role !== 'student') {
    throw new Error('Only signed-in student accounts can mark attendance.');
  }
  if (!cleanSessionId || !cleanToken) {
    throw new Error('Both Session ID and QR Token are required.');
  }
  if (!VALID_FIRESTORE_ID_REGEX.test(cleanSessionId)) {
    throw new Error('Invalid Session ID format. Please scan a valid classroom QR code.');
  }
  if (cleanToken.length < 16 || cleanToken.length > 128) {
    throw new Error('Invalid QR token format. Please scan a valid classroom QR code.');
  }

  const studentUid = currentUser.uid;
  if (student.uid && student.uid !== studentUid) {
    throw new Error('Signed-in account mismatch. Please refresh and sign in again.');
  }

  const sessionPath = `sessions/${cleanSessionId}`;
  let sessionSnap;
  try {
    sessionSnap = await getDoc(doc(db, 'sessions', cleanSessionId));
  } catch (err) {
    logFirestoreDiagnostic(err, OperationType.GET, sessionPath);
    const code = getFirestoreErrorCode(err);
    if (code === 'permission-denied') {
      throw new Error(
        'Permission denied while reading the attendance session. Verify that updated Firestore security rules are deployed.'
      );
    }
    throw err;
  }

  if (!sessionSnap.exists()) {
    throw new Error('Invalid attendance session. Session does not exist.');
  }

  const sessionData = sessionSnap.data();
  const expiryTime = typeof sessionData.expiryTime === 'string' ? sessionData.expiryTime : '';

  if (sessionData.status === 'CLOSED') {
    throw new Error('This attendance session has been closed by the teacher.');
  }
  if (sessionData.status === 'EXPIRED') {
    throw new Error('This attendance QR code has expired. Please contact your teacher.');
  }

  const recordId = `${cleanSessionId}_${studentUid}`;
  const recordPath = `attendance/${recordId}`;
  const recordRef = doc(db, 'attendance', recordId);

  // Check if the student already marked attendance for this session.
  // Note: `firestore.rules` explicitly permits `get` on non-existent `${sessionId}_${request.auth.uid}`.
  try {
    const existingSnap = await getDoc(recordRef);
    if (existingSnap.exists()) {
      throw new Error('Duplicate attendance: You have already marked your attendance for this session!');
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Duplicate attendance:')) {
      throw err;
    }
    const code = getFirestoreErrorCode(err);
    if (code !== 'permission-denied') {
      logFirestoreDiagnostic(err, OperationType.GET, recordPath);
      throw err;
    }
    // If an older ruleset denied `get` on a non-existent doc, continue to `setDoc`,
    // which will still enforce duplicate prevention & full server-side verification.
  }

  const cleanStudentName = (student.name.trim() || currentUser.displayName?.trim() || 'Student').slice(0, 120);
  const cleanStudentEmail = (currentUser.email || student.email).trim().toLowerCase();
  const cleanRollNumber =
    typeof student.roll_number === 'string' && student.roll_number.trim()
      ? student.roll_number.trim().slice(0, 50)
      : null;

  const markedAt = new Date().toISOString();
  const attendancePayload = {
    sessionId: cleanSessionId,
    classId: typeof sessionData.classId === 'string' ? sessionData.classId : '',
    className: typeof sessionData.className === 'string' ? sessionData.className : '',
    subjectName: typeof sessionData.subjectName === 'string' ? sessionData.subjectName : '',
    subjectCode: typeof sessionData.subjectCode === 'string' ? sessionData.subjectCode : '',
    teacherUid: typeof sessionData.teacherUid === 'string' ? sessionData.teacherUid : '',
    teacherName: typeof sessionData.teacherName === 'string' ? sessionData.teacherName : 'Faculty',
    studentUid,
    studentName: cleanStudentName,
    studentEmail: cleanStudentEmail,
    rollNumber: cleanRollNumber,
    qrToken: cleanToken,
    markedAt,
    markedAtTimestamp: serverTimestamp(),
    status: 'PRESENT',
  };

  try {
    await setDoc(recordRef, attendancePayload);
  } catch (err: unknown) {
    logFirestoreDiagnostic(err, OperationType.CREATE, recordPath);
    const code = getFirestoreErrorCode(err);

    if (code === 'permission-denied') {
      // Distinguish exact cause cleanly for the student without weakening security rules.
      try {
        const duplicateCheck = await getDoc(recordRef);
        if (duplicateCheck.exists()) {
          throw new Error(
            'Duplicate attendance: You have already marked your attendance for this session!'
          );
        }
      } catch (dupErr) {
        if (dupErr instanceof Error && dupErr.message.startsWith('Duplicate attendance:')) {
          throw dupErr;
        }
      }

      if (typeof sessionData.tokenHash === 'string') {
        throw new Error(
          'This QR session was created before the latest security update. Ask your teacher to generate a new QR session.'
        );
      }

      if (expiryTime && Date.now() >= new Date(expiryTime).getTime()) {
        throw new Error('This attendance QR code has expired. Please contact your teacher.');
      }

      throw new Error(
        'Attendance could not be verified by Firestore security rules. Please confirm you scanned a valid active QR code (or deploy updated Firestore security rules).'
      );
    }

    if (code === 'unavailable') {
      throw new Error('Cloud Firestore is temporarily unavailable. Check your internet connection and retry.');
    }

    throw err;
  }

  return {
    success: true,
    message: 'Attendance recorded successfully!',
    details: {
      studentName: cleanStudentName,
      rollNumber: cleanRollNumber || '',
      subjectName: attendancePayload.subjectName,
      subjectCode: attendancePayload.subjectCode,
      className: attendancePayload.className,
      teacherName: attendancePayload.teacherName,
      markedAt,
    },
  };
}

export async function fetchStudentDashboardData(student: User): Promise<StudentDashboardData> {
  if (!db) {
    throw new Error(firebaseConfigError || 'Cloud Firestore is not initialized.');
  }

  const studentUid = student.uid || student.id;
  const attendanceSnap = await getDocs(
    query(collection(db, 'attendance'), where('studentUid', '==', studentUid))
  );

  const records = attendanceSnap.docs
    .map((d) => mapAttendanceDoc(d.id, d.data()))
    .sort((a, b) => new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime());

  const classIds = Array.from(new Set(records.map((r) => r.classId).filter(Boolean)));
  const totalSessionsByClass = new Map<string, number>();

  // Firestore 'in' queries allow up to 30 values at a time
  for (let i = 0; i < classIds.length; i += 30) {
    const chunk = classIds.slice(i, i + 30);
    const sessionsSnap = await getDocs(
      query(collection(db, 'sessions'), where('classId', 'in', chunk))
    );
    sessionsSnap.docs.forEach((d) => {
      const cId = typeof d.data().classId === 'string' ? d.data().classId : '';
      if (cId) {
        totalSessionsByClass.set(cId, (totalSessionsByClass.get(cId) || 0) + 1);
      }
    });
  }

  const attendedByClass = new Map<
    string,
    { subjectName: string; subjectCode: string; className: string; count: number }
  >();

  for (const r of records) {
    const key = r.classId || `${r.subjectCode}_${r.className}`;
    const current = attendedByClass.get(key);
    if (current) {
      current.count += 1;
    } else {
      attendedByClass.set(key, {
        subjectName: r.subjectName || 'Subject',
        subjectCode: r.subjectCode || 'CODE',
        className: r.className || 'Class',
        count: 1,
      });
    }
  }

  const subjectPercentages: SubjectAttendanceStat[] = Array.from(attendedByClass.entries()).map(
    ([classId, info]) => {
      const conducted = Math.max(info.count, totalSessionsByClass.get(classId) || info.count);
      const percentage =
        conducted > 0 ? Math.round((info.count / conducted) * 100 * 10) / 10 : 0;

      return {
        classId,
        subjectName: info.subjectName,
        subjectCode: info.subjectCode,
        className: info.className,
        totalSessions: conducted,
        attendedSessions: info.count,
        percentage,
        isDefaulter: conducted > 0 && percentage < 75,
      };
    }
  );

  const totalConductedSessions = subjectPercentages.reduce(
    (sum, item) => sum + item.totalSessions,
    0
  );
  const totalAttendedSessions = records.length;
  const overallPercentage =
    totalConductedSessions > 0
      ? Math.round((totalAttendedSessions / totalConductedSessions) * 100 * 10) / 10
      : 0;

  return {
    profile: student,
    subjectPercentages,
    overallPercentage,
    totalConductedSessions,
    totalAttendedSessions,
    recentHistory: records.slice(0, 20),
  };
}

export async function fetchTeacherReports(params: {
  teacherUid: string;
  classId?: string;
  date?: string;
}): Promise<{ classes: TeacherClass[]; report: TeacherReportsResult }> {
  if (!db) {
    throw new Error(firebaseConfigError || 'Cloud Firestore is not initialized.');
  }

  const { teacherUid, classId, date } = params;

  const [classes, sessionsSnap, attendanceSnap] = await Promise.all([
    fetchTeacherClasses(teacherUid),
    getDocs(query(collection(db, 'sessions'), where('teacherUid', '==', teacherUid))),
    getDocs(query(collection(db, 'attendance'), where('teacherUid', '==', teacherUid))),
  ]);

  const recordsBySession: Record<string, AttendanceRecord[]> = {};
  for (const d of attendanceSnap.docs) {
    const rec = mapAttendanceDoc(d.id, d.data());
    if (!recordsBySession[rec.sessionId]) {
      recordsBySession[rec.sessionId] = [];
    }
    recordsBySession[rec.sessionId].push(rec);
  }

  Object.keys(recordsBySession).forEach((sid) => {
    recordsBySession[sid].sort(
      (a, b) => new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime()
    );
  });

  let sessions = sessionsSnap.docs.map((d) =>
    mapSessionDoc(d.id, d.data(), recordsBySession[d.id]?.length || 0)
  );

  if (classId) {
    sessions = sessions.filter((s) => s.classId === classId);
  }
  if (date) {
    sessions = sessions.filter((s) => s.startTime.startsWith(date));
  }

  sessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const totalSessions = sessions.length;
  const totalPresentMarks = sessions.reduce((sum, s) => sum + (s.presentCount || 0), 0);
  const activeSessions = sessions.filter((s) => s.status === 'ACTIVE').length;
  const averagePresentPerSession =
    totalSessions > 0 ? Math.round((totalPresentMarks / totalSessions) * 10) / 10 : 0;

  return {
    classes,
    report: {
      sessions,
      recordsBySession,
      summary: {
        totalSessions,
        totalPresentMarks,
        activeSessions,
        averagePresentPerSession,
      },
    },
  };
}

export function buildAttendanceCsvUrl(
  records: AttendanceRecord[]
): string {
  const headers = [
    'Record ID',
    'Session ID',
    'Marked At',
    'Student Roll No',
    'Student Name',
    'Student Email',
    'Class',
    'Subject Code',
    'Subject Name',
    'Teacher Name',
    'Attendance Status',
  ];

  const escapeCsv = (val: unknown) => {
    const str = val === null || val === undefined ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = records.map((r) => [
    r.id,
    r.sessionId,
    r.markedAt ? new Date(r.markedAt).toLocaleString() : '',
    r.rollNumber || 'N/A',
    r.studentName,
    r.studentEmail,
    r.className,
    r.subjectCode,
    r.subjectName,
    r.teacherName,
    r.status,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  return URL.createObjectURL(blob);
}
