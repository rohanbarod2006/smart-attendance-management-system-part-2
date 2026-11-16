export type UserRole = 'teacher' | 'student';

export interface User {
  id: string;
  uid?: string;
  name: string;
  email: string;
  role: UserRole;
  roll_number?: string | null;
  created_at?: string;
  createdAt?: string;
  collegeName?: string;
  department?: string;
  facultyId?: string;
  designation?: string;
}

export interface TeacherClass {
  id: string;
  className: string;
  subjectName: string;
  subjectCode: string;
  department: string;
  academicYear: string;
  semester: string;
  teacherUid: string;
  teacherName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceSession {
  id: string;
  teacherUid: string;
  teacherName: string;
  classId: string;
  className: string;
  subjectName: string;
  subjectCode: string;
  department: string;
  startTime: string;
  expiryTime: string;
  durationMinutes: number;
  status: 'ACTIVE' | 'CLOSED' | 'EXPIRED';
  createdAt: string;
  presentCount?: number;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  classId: string;
  className: string;
  subjectName: string;
  subjectCode: string;
  teacherUid: string;
  teacherName: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  rollNumber?: string | null;
  markedAt: string;
  status: 'PRESENT';
}

export interface SubjectAttendanceStat {
  classId: string;
  subjectName: string;
  subjectCode: string;
  className: string;
  totalSessions: number;
  attendedSessions: number;
  percentage: number;
  isDefaulter: boolean;
}

export interface StudentDashboardData {
  profile: User;
  subjectPercentages: SubjectAttendanceStat[];
  overallPercentage: number;
  totalConductedSessions: number;
  totalAttendedSessions: number;
  recentHistory: AttendanceRecord[];
}

export interface TeacherDashboardStats {
  totalClasses: number;
  activeSessionsCount: number;
  activeSessions: AttendanceSession[];
  todayAttendanceCount: number;
  totalSessionsCount: number;
  totalAttendanceMarks: number;
  recentSessions: AttendanceSession[];
}

export interface SessionLiveDetails {
  session: AttendanceSession;
  records: AttendanceRecord[];
  presentCount: number;
}

export interface TeacherReportsResult {
  sessions: AttendanceSession[];
  recordsBySession: Record<string, AttendanceRecord[]>;
  summary: {
    totalSessions: number;
    totalPresentMarks: number;
    activeSessions: number;
    averagePresentPerSession: number;
  };
}

export interface QRPayload {
  type: string;
  sessionId: string;
  token: string;
  subjectCode: string;
  className: string;
  expiryTime: string;
  url: string;
}
