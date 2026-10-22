export interface User {
  id: number;
  name: string;
  email: string;
  role: 'teacher' | 'student' | 'admin';
  roll_number?: string | null;
  created_at?: string;
}

export interface CollegeClass {
  id: number;
  class_name: string;
  department: string;
  academic_year: string;
}

export interface Subject {
  id: number;
  subject_name: string;
  subject_code: string;
  class_id: number;
}

export interface AttendanceSession {
  id: number;
  teacher_id: number;
  subject_id: number;
  class_id: number;
  class_name: string;
  subject_name: string;
  subject_code: string;
  teacher_name?: string;
  start_time: string;
  expiry_time: string;
  status: 'ACTIVE' | 'CLOSED' | 'EXPIRED';
  duration_minutes?: number;
  present_count?: number;
  total_enrolled?: number;
}

export interface AttendanceRecord {
  id: number;
  session_id: number;
  student_id: number;
  student_name?: string;
  student_email?: string;
  roll_number?: string | null;
  marked_at: string;
  status: string;
  subject_name?: string;
  subject_code?: string;
  class_name?: string;
  teacher_name?: string;
}

export interface SubjectAttendanceStat {
  subjectId: number;
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
  classes: CollegeClass[];
  subjectPercentages: SubjectAttendanceStat[];
  overallPercentage: number;
  totalEligibleSessions: number;
  totalAttendedSessions: number;
  recentHistory: AttendanceRecord[];
}

export interface TeacherDashboardStats {
  totalStudents: number;
  activeSessionsCount: number;
  activeSessions: AttendanceSession[];
  todayAttendanceCount: number;
  recentSessions: AttendanceSession[];
}

export interface QRPayload {
  type: string;
  sessionId: number;
  token: string;
  subjectCode: string;
  className: string;
  expiryTime: string;
  url: string;
}
