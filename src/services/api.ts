import QRCode from 'qrcode';
import { User, CollegeClass, Subject, AttendanceSession, AttendanceRecord } from '../types.ts';

// Storage Keys
const DB_STORAGE_KEY = 'smart_attendance_client_db_v3';
const AUTH_TOKEN_KEY = 'smart_attendance_jwt_user_id';

// SHA-256 Helper using browser native SubtleCrypto
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 60 Students Metadata
export const DEMO_60_STUDENTS = [
  { roll: 'SE-IT-101', name: 'Aarav Patel', email: 'student1@college.edu', classId: 1, targetPct: 89 },
  { roll: 'SE-IT-102', name: 'Diya Sharma', email: 'student2@college.edu', classId: 1, targetPct: 95 },
  { roll: 'SE-IT-103', name: 'Rohan Verma', email: 'student3@college.edu', classId: 1, targetPct: 84 },
  { roll: 'SE-IT-104', name: 'Neha Kulkarni', email: 'student4@college.edu', classId: 1, targetPct: 79 },
  { roll: 'SE-IT-105', name: 'Aditya Singh', email: 'student5@college.edu', classId: 1, targetPct: 84 },
  { roll: 'SE-IT-106', name: 'Ananya Deshmukh', email: 'student6@college.edu', classId: 1, targetPct: 92 },
  { roll: 'SE-IT-107', name: 'Aryan Joshi', email: 'student7@college.edu', classId: 1, targetPct: 79 },
  { roll: 'SE-IT-108', name: 'Ishita Mehta', email: 'student8@college.edu', classId: 1, targetPct: 89 },
  { roll: 'SE-IT-109', name: 'Siddharth Nair', email: 'student9@college.edu', classId: 1, targetPct: 84 },
  { roll: 'SE-IT-110', name: 'Tanvi Bhat', email: 'student10@college.edu', classId: 1, targetPct: 95 },
  { roll: 'SE-IT-111', name: 'Harsh Vardhan', email: 'student11@college.edu', classId: 1, targetPct: 79 },
  { roll: 'SE-IT-112', name: 'Pooja Hegde', email: 'student12@college.edu', classId: 1, targetPct: 84 },
  { roll: 'SE-IT-113', name: 'Varun Reddy', email: 'student13@college.edu', classId: 1, targetPct: 89 },
  { roll: 'SE-IT-114', name: 'Sneha Rao', email: 'student14@college.edu', classId: 1, targetPct: 95 },
  { roll: 'SE-IT-115', name: 'Rahul Gupta', email: 'student15@college.edu', classId: 1, targetPct: 84 },
  { roll: 'SE-IT-116', name: 'Riya Sen', email: 'student16@college.edu', classId: 1, targetPct: 79 },
  { roll: 'SE-IT-117', name: 'Karan Malhotra', email: 'student17@college.edu', classId: 1, targetPct: 84 },
  { roll: 'SE-IT-118', name: 'Shreya Pillai', email: 'student18@college.edu', classId: 1, targetPct: 79 },
  { roll: 'SE-IT-119', name: 'Kunal Kapoor', email: 'student19@college.edu', classId: 1, targetPct: 84 },
  { roll: 'SE-IT-120', name: 'Meera Nambiar', email: 'student20@college.edu', classId: 1, targetPct: 79 },
  { roll: 'SE-IT-121', name: 'Vivek Choudhury', email: 'student21@college.edu', classId: 1, targetPct: 84 },
  { roll: 'SE-IT-122', name: 'Divya Agarwal', email: 'student22@college.edu', classId: 1, targetPct: 79 },
  { roll: 'SE-IT-123', name: 'Gaurav Saxena', email: 'student23@college.edu', classId: 1, targetPct: 79 },
  { roll: 'SE-IT-124', name: 'Aditi Roy', email: 'student24@college.edu', classId: 1, targetPct: 84 },
  { roll: 'SE-IT-125', name: 'Nikhil Tiwari', email: 'student25@college.edu', classId: 1, targetPct: 74 },
  // Defaulters (< 75%)
  { roll: 'SE-IT-126', name: 'Prachi Shah', email: 'student26@college.edu', classId: 1, targetPct: 68 },
  { roll: 'SE-IT-127', name: 'Yash Mishra', email: 'student27@college.edu', classId: 1, targetPct: 63 },
  { roll: 'SE-IT-128', name: 'Swati Pandey', email: 'student28@college.edu', classId: 1, targetPct: 58 },
  { roll: 'SE-IT-129', name: 'Amit Kumar', email: 'student29@college.edu', classId: 1, targetPct: 63 },
  { roll: 'SE-IT-130', name: 'Natasha DSouza', email: 'student30@college.edu', classId: 1, targetPct: 68 },
  { roll: 'SE-IT-131', name: 'Ayush Bansal', email: 'student31@college.edu', classId: 1, targetPct: 42 },
  { roll: 'SE-IT-132', name: 'Kavya Menon', email: 'student32@college.edu', classId: 1, targetPct: 68 },
  { roll: 'SE-IT-133', name: 'Mohit Sharma', email: 'student33@college.edu', classId: 1, targetPct: 58 },
  { roll: 'SE-IT-134', name: 'Simran Kaur', email: 'student34@college.edu', classId: 1, targetPct: 63 },
  { roll: 'SE-IT-135', name: 'Pranav Kulkarni', email: 'student35@college.edu', classId: 1, targetPct: 74 },
  { roll: 'SE-IT-136', name: 'Pallavi Shinde', email: 'student36@college.edu', classId: 1, targetPct: 84 },
  { roll: 'SE-IT-137', name: 'Rohit Jadhav', email: 'student37@college.edu', classId: 1, targetPct: 79 },
  { roll: 'SE-IT-138', name: 'Ritu More', email: 'student38@college.edu', classId: 1, targetPct: 68 },
  { roll: 'SE-IT-139', name: 'Akshay Patil', email: 'student39@college.edu', classId: 1, targetPct: 84 },
  { roll: 'SE-IT-140', name: 'Manisha Chauhan', email: 'student40@college.edu', classId: 1, targetPct: 89 },
  // Div B Students (Class 2)
  { roll: 'SE-IT-141', name: 'Mayank Jain', email: 'student41@college.edu', classId: 2, targetPct: 75 },
  { roll: 'SE-IT-142', name: 'Apeksha Gore', email: 'student42@college.edu', classId: 2, targetPct: 100 },
  { roll: 'SE-IT-143', name: 'Chirag Bhatt', email: 'student43@college.edu', classId: 2, targetPct: 50 },
  { roll: 'SE-IT-144', name: 'Deepali Sonawane', email: 'student44@college.edu', classId: 2, targetPct: 75 },
  { roll: 'SE-IT-145', name: 'Omkar Gaikwad', email: 'student45@college.edu', classId: 2, targetPct: 50 },
  { roll: 'SE-IT-146', name: 'Sakshi Bhosale', email: 'student46@college.edu', classId: 2, targetPct: 100 },
  { roll: 'SE-IT-147', name: 'Sourabh Mane', email: 'student47@college.edu', classId: 2, targetPct: 75 },
  { roll: 'SE-IT-148', name: 'Tejaswini Pawar', email: 'student48@college.edu', classId: 2, targetPct: 50 },
  { roll: 'SE-IT-149', name: 'Vaibhav Salunkhe', email: 'student49@college.edu', classId: 2, targetPct: 75 },
  { roll: 'SE-IT-150', name: 'Komal Wagh', email: 'student50@college.edu', classId: 2, targetPct: 100 },
  { roll: 'SE-IT-151', name: 'Shubham Sawant', email: 'student51@college.edu', classId: 2, targetPct: 75 },
  { roll: 'SE-IT-152', name: 'Priyanka Chawla', email: 'student52@college.edu', classId: 2, targetPct: 50 },
  { roll: 'SE-IT-153', name: 'Chetan Soni', email: 'student53@college.edu', classId: 2, targetPct: 75 },
  { roll: 'SE-IT-154', name: 'Sanjana Das', email: 'student54@college.edu', classId: 2, targetPct: 100 },
  { roll: 'SE-IT-155', name: 'Tushar Dubey', email: 'student55@college.edu', classId: 2, targetPct: 50 },
  { roll: 'SE-IT-156', name: 'Urvashi Rawat', email: 'student56@college.edu', classId: 2, targetPct: 75 },
  { roll: 'SE-IT-157', name: 'Vicky Tripathi', email: 'student57@college.edu', classId: 2, targetPct: 50 },
  { roll: 'SE-IT-158', name: 'Vidhi Trivedi', email: 'student58@college.edu', classId: 2, targetPct: 75 },
  { roll: 'SE-IT-159', name: 'Vishal Yadav', email: 'student59@college.edu', classId: 2, targetPct: 100 },
  { roll: 'SE-IT-160', name: 'Zoya Khan', email: 'student60@college.edu', classId: 2, targetPct: 75 },
];

export const SEED_23_LECTURES = [
  { id: 1, subjectId: 1, classId: 1, daysAgo: 28, hour: 9, teacherId: 1 },
  { id: 2, subjectId: 2, classId: 1, daysAgo: 27, hour: 11, teacherId: 1 },
  { id: 3, subjectId: 3, classId: 1, daysAgo: 26, hour: 14, teacherId: 1 },
  { id: 4, subjectId: 4, classId: 1, daysAgo: 25, hour: 10, teacherId: 1 },
  { id: 5, subjectId: 5, classId: 2, daysAgo: 24, hour: 12, teacherId: 2 },
  { id: 6, subjectId: 1, classId: 1, daysAgo: 22, hour: 9, teacherId: 1 },
  { id: 7, subjectId: 2, classId: 1, daysAgo: 21, hour: 11, teacherId: 1 },
  { id: 8, subjectId: 3, classId: 1, daysAgo: 20, hour: 14, teacherId: 1 },
  { id: 9, subjectId: 4, classId: 1, daysAgo: 19, hour: 10, teacherId: 1 },
  { id: 10, subjectId: 6, classId: 2, daysAgo: 18, hour: 15, teacherId: 2 },
  { id: 11, subjectId: 1, classId: 1, daysAgo: 15, hour: 9, teacherId: 1 },
  { id: 12, subjectId: 2, classId: 1, daysAgo: 14, hour: 11, teacherId: 1 },
  { id: 13, subjectId: 3, classId: 1, daysAgo: 13, hour: 14, teacherId: 1 },
  { id: 14, subjectId: 4, classId: 1, daysAgo: 12, hour: 10, teacherId: 1 },
  { id: 15, subjectId: 5, classId: 2, daysAgo: 11, hour: 12, teacherId: 2 },
  { id: 16, subjectId: 1, classId: 1, daysAgo: 8, hour: 9, teacherId: 1 },
  { id: 17, subjectId: 2, classId: 1, daysAgo: 7, hour: 11, teacherId: 1 },
  { id: 18, subjectId: 3, classId: 1, daysAgo: 6, hour: 14, teacherId: 1 },
  { id: 19, subjectId: 4, classId: 1, daysAgo: 5, hour: 10, teacherId: 1 },
  { id: 20, subjectId: 6, classId: 2, daysAgo: 4, hour: 15, teacherId: 2 },
  { id: 21, subjectId: 1, classId: 1, daysAgo: 2, hour: 9, teacherId: 1 },
  { id: 22, subjectId: 2, classId: 1, daysAgo: 1, hour: 11, teacherId: 1 },
  { id: 23, subjectId: 3, classId: 1, daysAgo: 0, hour: 10, teacherId: 1 },
];

export interface ClientDatabase {
  users: Array<User & { password_hash: string }>;
  classes: CollegeClass[];
  subjects: Subject[];
  studentClasses: Array<{ student_id: number; class_id: number }>;
  attendanceSessions: Array<AttendanceSession & { token_hash: string; token_plain?: string }>;
  attendanceRecords: AttendanceRecord[];
}

function createInitialDatabase(): ClientDatabase {
  const now = new Date().toISOString();

  // Users: 2 Teachers, 1 Admin, 60 Students
  const users: Array<User & { password_hash: string }> = [
    {
      id: 1,
      name: 'Prof. Rajesh Sharma',
      email: 'teacher@college.edu',
      password_hash: 'password123',
      role: 'teacher',
      roll_number: null,
      created_at: now,
    },
    {
      id: 2,
      name: 'Dr. Ananya Iyer',
      email: 'teacher2@college.edu',
      password_hash: 'password123',
      role: 'teacher',
      roll_number: null,
      created_at: now,
    },
    {
      id: 3,
      name: 'College Administrator',
      email: 'admin@college.edu',
      password_hash: 'password123',
      role: 'admin',
      roll_number: null,
      created_at: now,
    },
  ];

  DEMO_60_STUDENTS.forEach((s, idx) => {
    users.push({
      id: idx + 4,
      name: s.name,
      email: s.email,
      password_hash: 'password123',
      role: 'student',
      roll_number: s.roll,
      created_at: now,
    });
  });

  // Classes
  const classes: CollegeClass[] = [
    { id: 1, class_name: 'SE-IT Div A', department: 'Information Technology', academic_year: '2025-2026' },
    { id: 2, class_name: 'SE-IT Div B', department: 'Information Technology', academic_year: '2025-2026' },
    { id: 3, class_name: 'TE-IT Div A', department: 'Information Technology', academic_year: '2025-2026' },
  ];

  // Subjects
  const subjects: Subject[] = [
    { id: 1, subject_name: 'Data Structures & Algorithms', subject_code: 'IT301', class_id: 1 },
    { id: 2, subject_name: 'Database Management Systems', subject_code: 'IT302', class_id: 1 },
    { id: 3, subject_name: 'Computer Networks', subject_code: 'IT303', class_id: 1 },
    { id: 4, subject_name: 'Web Development Technologies', subject_code: 'IT304', class_id: 1 },
    { id: 5, subject_name: 'Software Engineering', subject_code: 'IT305', class_id: 2 },
    { id: 6, subject_name: 'Operating Systems', subject_code: 'IT306', class_id: 2 },
  ];

  // Student Enrollments
  const studentClasses: Array<{ student_id: number; class_id: number }> = [];
  DEMO_60_STUDENTS.forEach((s, idx) => {
    studentClasses.push({ student_id: idx + 4, class_id: s.classId });
  });

  // 23 Lectures (Sessions)
  const nowMs = Date.now();
  const attendanceSessions: Array<AttendanceSession & { token_hash: string; token_plain?: string }> = [];

  SEED_23_LECTURES.forEach(lec => {
    const lectureDate = new Date(nowMs - lec.daysAgo * 24 * 3600 * 1000);
    lectureDate.setHours(lec.hour, 15, 0, 0);
    const startTimeIso = lectureDate.toISOString();
    const expiryDate = new Date(lectureDate.getTime() + 50 * 60 * 1000);
    const expiryTimeIso = expiryDate.toISOString();

    const sub = subjects.find(s => s.id === lec.subjectId);
    const cls = classes.find(c => c.id === lec.classId);
    const teacher = users.find(u => u.id === lec.teacherId);

    attendanceSessions.push({
      id: lec.id,
      teacher_id: lec.teacherId,
      subject_id: lec.subjectId,
      class_id: lec.classId,
      class_name: cls?.class_name || 'SE-IT Div A',
      subject_name: sub?.subject_name || 'Subject',
      subject_code: sub?.subject_code || 'IT000',
      teacher_name: teacher?.name || 'Prof. Faculty',
      start_time: startTimeIso,
      expiry_time: expiryTimeIso,
      status: 'CLOSED',
      token_hash: `token_hash_lecture_${lec.id}`,
      token_plain: `dummy_token_plain_${lec.id}`,
      duration_minutes: 50,
    });
  });

  // Mixed Attendance Records for the 23 sessions
  const attendanceRecords: AttendanceRecord[] = [];
  let recordIdCounter = 1;

  SEED_23_LECTURES.forEach(lec => {
    const lectureDate = new Date(nowMs - lec.daysAgo * 24 * 3600 * 1000);
    lectureDate.setHours(lec.hour, 20, 0, 0);
    const markedAtIso = lectureDate.toISOString();

    const sub = subjects.find(s => s.id === lec.subjectId);
    const cls = classes.find(c => c.id === lec.classId);
    const teacher = users.find(u => u.id === lec.teacherId);

    DEMO_60_STUDENTS.forEach((student, index) => {
      const studentId = index + 4;
      if (student.classId !== lec.classId) return;

      const pseudoVal = (studentId * 13 + lec.id * 37 + 19) % 100;
      if (pseudoVal < student.targetPct) {
        attendanceRecords.push({
          id: recordIdCounter++,
          session_id: lec.id,
          student_id: studentId,
          student_name: student.name,
          student_email: student.email,
          roll_number: student.roll,
          marked_at: markedAtIso,
          status: 'PRESENT',
          subject_name: sub?.subject_name,
          subject_code: sub?.subject_code,
          class_name: cls?.class_name,
          teacher_name: teacher?.name,
        });
      }
    });
  });

  return {
    users,
    classes,
    subjects,
    studentClasses,
    attendanceSessions,
    attendanceRecords,
  };
}

function getDatabase(): ClientDatabase {
  const raw = localStorage.getItem(DB_STORAGE_KEY);
  if (!raw) {
    const freshDb = createInitialDatabase();
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(freshDb));
    return freshDb;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.attendanceSessions || parsed.attendanceSessions.length < 23) {
      const freshDb = createInitialDatabase();
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(freshDb));
      return freshDb;
    }
    return parsed;
  } catch (e) {
    const freshDb = createInitialDatabase();
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(freshDb));
    return freshDb;
  }
}

function saveDatabase(db: ClientDatabase): void {
  localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function removeAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

// Client-Side API implementation
export const api = {
  // 1. Auth: Login
  login: async (credentials: { email: string; password: string }) => {
    const db = getDatabase();
    const cleanEmail = credentials.email.trim().toLowerCase();
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user || user.password_hash !== credentials.password) {
      throw new Error('Invalid email or password');
    }

    const token = `usr_${user.id}_${Date.now()}`;
    setAuthToken(token);

    const safeUser: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roll_number: user.roll_number,
      created_at: user.created_at,
    };

    return { token, user: safeUser };
  },

  // 2. Auth: Register
  register: async (payload: { name: string; email: string; password: string; role: 'teacher' | 'student'; rollNumber?: string; classIds?: number[] }) => {
    const db = getDatabase();
    const cleanEmail = payload.email.trim().toLowerCase();

    if (db.users.some(u => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('An account with this email already exists');
    }

    const newId = Math.max(...db.users.map(u => u.id), 0) + 1;
    const now = new Date().toISOString();

    const newUser = {
      id: newId,
      name: payload.name.trim(),
      email: cleanEmail,
      password_hash: payload.password,
      role: payload.role,
      roll_number: payload.role === 'student' ? (payload.rollNumber?.trim() || `SE-IT-${100 + newId}`) : null,
      created_at: now,
    };

    db.users.push(newUser);

    if (payload.role === 'student') {
      const cids = payload.classIds && payload.classIds.length > 0 ? payload.classIds : [1];
      cids.forEach(cid => {
        db.studentClasses.push({ student_id: newId, class_id: cid });
      });
    }

    saveDatabase(db);

    const token = `usr_${newId}_${Date.now()}`;
    setAuthToken(token);

    return {
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        roll_number: newUser.roll_number,
      },
    };
  },

  // 3. Auth: Current User Profile
  getCurrentUser: async () => {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const match = token.match(/^usr_(\d+)_/);
    const userId = match ? Number(match[1]) : null;
    if (!userId) throw new Error('Invalid token');

    const db = getDatabase();
    const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');

    const enrolledClassIds = db.studentClasses.filter(sc => sc.student_id === userId).map(sc => sc.class_id);
    const enrolledClasses = db.classes.filter(c => enrolledClassIds.includes(c.id));

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roll_number: user.roll_number,
        created_at: user.created_at,
      },
      enrolledClasses,
    };
  },

  // 4. Reset Demo Database
  resetDemoDatabase: async () => {
    const freshDb = createInitialDatabase();
    saveDatabase(freshDb);
    return { success: true, message: 'Database reset to clean demo state with 23 lectures and 60 students!' };
  },

  // 5. Classes and Subjects
  getClassesAndSubjects: async () => {
    const db = getDatabase();
    return {
      classes: db.classes,
      subjects: db.subjects,
    };
  },

  // 6. Teacher: Dashboard Stats
  getTeacherStats: async () => {
    const db = getDatabase();
    const token = getAuthToken();
    const match = token?.match(/^usr_(\d+)_/);
    const teacherId = match ? Number(match[1]) : 1;

    // Auto-expire sessions past expiry
    const nowIso = new Date().toISOString();
    db.attendanceSessions.forEach(s => {
      if (s.status === 'ACTIVE' && s.expiry_time <= nowIso) {
        s.status = 'EXPIRED';
      }
    });
    saveDatabase(db);

    const totalStudents = db.users.filter(u => u.role === 'student').length;
    const activeSessions = db.attendanceSessions.filter(s => s.teacher_id === teacherId && s.status === 'ACTIVE');

    // Count present students today
    const today = new Date().toISOString().slice(0, 10);
    const todayAttendanceCount = db.attendanceRecords.filter(ar => ar.marked_at.startsWith(today)).length;

    // Recent sessions with attendee counts
    const recentSessions = [...db.attendanceSessions]
      .sort((a, b) => b.id - a.id)
      .slice(0, 12)
      .map(s => {
        const present_count = db.attendanceRecords.filter(ar => ar.session_id === s.id).length;
        const total_enrolled = db.studentClasses.filter(sc => sc.class_id === s.class_id).length;
        return {
          ...s,
          present_count,
          total_enrolled,
        };
      });

    return {
      totalStudents,
      activeSessionsCount: activeSessions.length,
      activeSessions,
      todayAttendanceCount,
      recentSessions,
    };
  },

  // 7. Teacher: Create Attendance Session & Generate QR Code
  createSession: async (data: { classId: number; subjectId: number; durationMinutes: number }) => {
    const db = getDatabase();
    const token = getAuthToken();
    const match = token?.match(/^usr_(\d+)_/);
    const teacherId = match ? Number(match[1]) : 1;

    const teacher = db.users.find(u => u.id === teacherId);
    const cls = db.classes.find(c => c.id === data.classId);
    const sub = db.subjects.find(s => s.id === data.subjectId);

    if (!cls || !sub) {
      throw new Error('Class or subject not found');
    }

    const duration = Number(data.durationMinutes) || 5;
    const now = new Date();
    const startTimeIso = now.toISOString();
    const expiryTimeIso = new Date(now.getTime() + duration * 60 * 1000).toISOString();

    // Generate random 48-char hex token
    const randomBytes = new Uint8Array(24);
    window.crypto.getRandomValues(randomBytes);
    const rawToken = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const tokenHash = await sha256(rawToken);

    const newSessionId = Math.max(...db.attendanceSessions.map(s => s.id), 0) + 1;

    const newSession: AttendanceSession & { token_hash: string; token_plain?: string } = {
      id: newSessionId,
      teacher_id: teacherId,
      subject_id: data.subjectId,
      class_id: data.classId,
      class_name: cls.class_name,
      subject_name: sub.subject_name,
      subject_code: sub.subject_code,
      teacher_name: teacher?.name || 'Prof. Faculty',
      start_time: startTimeIso,
      expiry_time: expiryTimeIso,
      status: 'ACTIVE',
      token_hash: tokenHash,
      token_plain: rawToken,
      duration_minutes: duration,
    };

    db.attendanceSessions.unshift(newSession);
    saveDatabase(db);

    const attendanceUrl = `${window.location.origin}/#scan?sessionId=${newSessionId}&token=${rawToken}`;
    const qrPayload = JSON.stringify({
      type: 'SMART_ATTENDANCE_QR',
      sessionId: newSessionId,
      token: rawToken,
      subjectCode: sub.subject_code,
      className: cls.class_name,
      expiryTime: expiryTimeIso,
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
      session: newSession,
      token: rawToken,
      qrDataUrl,
      attendanceUrl,
      qrPayload,
    };
  },

  // 8. Teacher: Get Live Attendees for Session
  getSessionLive: async (sessionId: number) => {
    const db = getDatabase();
    const session = db.attendanceSessions.find(s => s.id === sessionId);
    if (!session) throw new Error('Session not found');

    const nowIso = new Date().toISOString();
    if (session.status === 'ACTIVE' && session.expiry_time <= nowIso) {
      session.status = 'EXPIRED';
      saveDatabase(db);
    }

    const records = db.attendanceRecords
      .filter(ar => ar.session_id === sessionId)
      .sort((a, b) => new Date(b.marked_at).getTime() - new Date(a.marked_at).getTime());

    const enrolledStudentIds = db.studentClasses
      .filter(sc => sc.class_id === session.class_id)
      .map(sc => sc.student_id);

    const enrolledStudents = db.users.filter(u => enrolledStudentIds.includes(u.id) && u.role === 'student');
    const attendedIds = new Set(records.map(r => r.student_id));
    const absentStudents = enrolledStudents.filter(s => !attendedIds.has(s.id));

    return {
      session,
      records,
      presentCount: records.length,
      totalEnrolled: enrolledStudents.length,
      absentStudents,
    };
  },

  // 9. Teacher: Close Attendance Session
  closeSession: async (sessionId: number) => {
    const db = getDatabase();
    const session = db.attendanceSessions.find(s => s.id === sessionId);
    if (!session) throw new Error('Session not found');

    session.status = 'CLOSED';
    saveDatabase(db);
    return { success: true, message: 'Session closed successfully' };
  },

  // 10. Student: Mark Attendance with Full 7-Point Verification
  markAttendance: async (payload: { sessionId: number; token: string }) => {
    const db = getDatabase();
    const token = getAuthToken();
    const match = token?.match(/^usr_(\d+)_/);
    const studentId = match ? Number(match[1]) : null;

    if (!studentId) {
      throw new Error('You must be logged in as a student to mark attendance.');
    }

    const student = db.users.find(u => u.id === studentId);
    if (!student) {
      throw new Error('Student account not found.');
    }

    const session = db.attendanceSessions.find(s => s.id === Number(payload.sessionId));
    if (!session) {
      throw new Error('Invalid attendance session. Session does not exist.');
    }

    const now = new Date();
    const expiry = new Date(session.expiry_time);
    if (now > expiry || session.status === 'EXPIRED') {
      session.status = 'EXPIRED';
      saveDatabase(db);
      throw new Error('This attendance QR code has expired. Please contact your teacher.');
    }

    if (session.status === 'CLOSED') {
      throw new Error('This attendance session has been closed by the teacher.');
    }

    const cleanInputToken = payload.token.trim();
    const computedHash = await sha256(cleanInputToken);

    const matchesHash = session.token_hash === computedHash || session.token_plain === cleanInputToken;
    if (!matchesHash) {
      throw new Error('Invalid QR code token. Tampering or invalid QR detected.');
    }

    // Enrollment check
    const isEnrolled = db.studentClasses.some(sc => sc.student_id === studentId && sc.class_id === session.class_id);
    if (!isEnrolled && student.role !== 'admin') {
      throw new Error(`You are not enrolled in class "${session.class_name}". You cannot mark attendance for this lecture.`);
    }

    // Duplicate check
    const existing = db.attendanceRecords.find(ar => ar.session_id === session.id && ar.student_id === studentId);
    if (existing) {
      throw new Error('Duplicate attendance: You have already marked your attendance for this session!');
    }

    // Record attendance
    const markedAt = now.toISOString();
    const newRecord: AttendanceRecord = {
      id: Math.max(...db.attendanceRecords.map(r => r.id), 0) + 1,
      session_id: session.id,
      student_id: studentId,
      student_name: student.name,
      student_email: student.email,
      roll_number: student.roll_number,
      marked_at: markedAt,
      status: 'PRESENT',
      subject_name: session.subject_name,
      subject_code: session.subject_code,
      class_name: session.class_name,
      teacher_name: session.teacher_name,
    };

    db.attendanceRecords.unshift(newRecord);
    saveDatabase(db);

    return {
      success: true,
      message: 'Attendance recorded successfully!',
      details: {
        studentName: student.name,
        rollNumber: student.roll_number || '',
        subjectName: session.subject_name,
        subjectCode: session.subject_code,
        className: session.class_name,
        teacherName: session.teacher_name || 'Faculty',
        markedAt,
      },
    };
  },

  // 11. Student: Dashboard Details (Subject-wise percentage & History)
  getStudentDashboard: async () => {
    const db = getDatabase();
    const token = getAuthToken();
    const match = token?.match(/^usr_(\d+)_/);
    const studentId = match ? Number(match[1]) : 4; // default to first student Aarav if not set

    const student = db.users.find(u => u.id === studentId) || db.users[3];
    const enrolledClassIds = db.studentClasses.filter(sc => sc.student_id === studentId).map(sc => sc.class_id);
    const classes = db.classes.filter(c => enrolledClassIds.includes(c.id));
    const subjects = db.subjects.filter(s => enrolledClassIds.includes(s.class_id));

    const subjectPercentages = subjects.map(sub => {
      const totalSessions = db.attendanceSessions.filter(s => s.subject_id === sub.id).length;
      const attendedSessions = db.attendanceRecords.filter(ar => {
        const sess = db.attendanceSessions.find(s => s.id === ar.session_id);
        return sess?.subject_id === sub.id && ar.student_id === studentId;
      }).length;

      const percentage = totalSessions > 0
        ? Math.round((attendedSessions / totalSessions) * 100 * 10) / 10
        : 100;

      return {
        subjectId: sub.id,
        subjectName: sub.subject_name,
        subjectCode: sub.subject_code,
        className: classes.find(c => c.id === sub.class_id)?.class_name || 'Class',
        totalSessions,
        attendedSessions,
        percentage,
        isDefaulter: percentage < 75 && totalSessions > 0,
      };
    });

    const totalConducted = subjectPercentages.reduce((sum, item) => sum + item.totalSessions, 0);
    const totalAttended = subjectPercentages.reduce((sum, item) => sum + item.attendedSessions, 0);
    const overallPercentage = totalConducted > 0
      ? Math.round((totalAttended / totalConducted) * 100 * 10) / 10
      : 100;

    const recentHistory = db.attendanceRecords
      .filter(ar => ar.student_id === studentId)
      .sort((a, b) => new Date(b.marked_at).getTime() - new Date(a.marked_at).getTime())
      .slice(0, 15);

    return {
      profile: student,
      classes,
      subjectPercentages,
      overallPercentage,
      totalEligibleSessions: totalConducted,
      totalAttendedSessions: totalAttended,
      recentHistory,
    };
  },

  // 12. Student: History
  getStudentHistory: async (subjectId?: number) => {
    const db = getDatabase();
    const token = getAuthToken();
    const match = token?.match(/^usr_(\d+)_/);
    const studentId = match ? Number(match[1]) : 4;

    let records = db.attendanceRecords.filter(ar => ar.student_id === studentId);
    if (subjectId) {
      records = records.filter(ar => {
        const sess = db.attendanceSessions.find(s => s.id === ar.session_id);
        return sess?.subject_id === Number(subjectId);
      });
    }

    records.sort((a, b) => new Date(b.marked_at).getTime() - new Date(a.marked_at).getTime());
    return { records };
  },

  // 13. Reports: Teacher Multi-Criteria Attendance Reports
  getTeacherReports: async (params: { classId?: number; subjectId?: number; date?: string }) => {
    const db = getDatabase();

    let sessions = [...db.attendanceSessions];
    if (params.classId) {
      sessions = sessions.filter(s => s.class_id === Number(params.classId));
    }
    if (params.subjectId) {
      sessions = sessions.filter(s => s.subject_id === Number(params.subjectId));
    }
    if (params.date) {
      sessions = sessions.filter(s => s.start_time.startsWith(params.date!));
    }

    sessions.sort((a, b) => b.id - a.id);

    const sessionReportList = sessions.map(s => {
      const present_count = db.attendanceRecords.filter(ar => ar.session_id === s.id).length;
      const total_enrolled = db.studentClasses.filter(sc => sc.class_id === s.class_id).length;
      return {
        session_id: s.id,
        start_time: s.start_time,
        expiry_time: s.expiry_time,
        session_status: s.status,
        class_id: s.class_id,
        class_name: s.class_name,
        subject_id: s.subject_id,
        subject_name: s.subject_name,
        subject_code: s.subject_code,
        teacher_name: s.teacher_name,
        present_count,
        total_enrolled,
      };
    });

    const totalSessions = sessionReportList.length;
    const totalPresentCumulative = sessionReportList.reduce((sum, s) => sum + s.present_count, 0);
    const totalEnrolledCumulative = sessionReportList.reduce((sum, s) => sum + s.total_enrolled, 0);
    const averagePercentage = totalEnrolledCumulative > 0
      ? Math.round((totalPresentCumulative / totalEnrolledCumulative) * 100 * 10) / 10
      : 0;

    return {
      sessions: sessionReportList,
      summary: {
        totalSessions,
        totalPresentCumulative,
        totalEnrolledCumulative,
        averagePercentage,
      },
    };
  },

  // 14. Export CSV
  getExportCsvUrl: (params: { classId?: number; subjectId?: number; sessionId?: number }) => {
    const db = getDatabase();
    let records = [...db.attendanceRecords];

    if (params.sessionId) {
      records = records.filter(r => r.session_id === Number(params.sessionId));
    } else {
      if (params.classId) {
        const sessionIds = db.attendanceSessions.filter(s => s.class_id === Number(params.classId)).map(s => s.id);
        records = records.filter(r => sessionIds.includes(r.session_id));
      }
      if (params.subjectId) {
        const sessionIds = db.attendanceSessions.filter(s => s.subject_id === Number(params.subjectId)).map(s => s.id);
        records = records.filter(r => sessionIds.includes(r.session_id));
      }
    }

    records.sort((a, b) => b.session_id - a.session_id);

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
      r.student_name || 'Student',
      r.student_email || '',
      r.class_name || 'Class',
      r.subject_code || '',
      r.subject_name || '',
      r.teacher_name || 'Faculty',
      r.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.map(escapeCsv).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    return URL.createObjectURL(blob);
  },

  // 15. Preview Session
  previewSession: async (sessionId: number, token: string) => {
    const db = getDatabase();
    const session = db.attendanceSessions.find(s => s.id === Number(sessionId));
    if (!session) throw new Error('Session not found');

    const now = new Date();
    const isExpired = now > new Date(session.expiry_time) || session.status === 'EXPIRED';

    return {
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
    };
  },
};
