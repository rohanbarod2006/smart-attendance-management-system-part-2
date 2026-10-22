import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_FILE_PATH = path.resolve(process.cwd(), 'attendance.db');

let dbInstance: Database | null = null;

// Full list of 60 students
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
  { roll: 'SE-IT-125', name: 'Nikhil Tiwari', email: 'student25@college.edu', classId: 1, targetPct: 74 }, // On the brink
  // Defaulters (< 75% for college warning list)
  { roll: 'SE-IT-126', name: 'Prachi Shah', email: 'student26@college.edu', classId: 1, targetPct: 68 }, // Defaulter
  { roll: 'SE-IT-127', name: 'Yash Mishra', email: 'student27@college.edu', classId: 1, targetPct: 63 }, // Defaulter
  { roll: 'SE-IT-128', name: 'Swati Pandey', email: 'student28@college.edu', classId: 1, targetPct: 58 }, // Defaulter
  { roll: 'SE-IT-129', name: 'Amit Kumar', email: 'student29@college.edu', classId: 1, targetPct: 63 }, // Defaulter
  { roll: 'SE-IT-130', name: 'Natasha DSouza', email: 'student30@college.edu', classId: 1, targetPct: 68 }, // Defaulter
  { roll: 'SE-IT-131', name: 'Ayush Bansal', email: 'student31@college.edu', classId: 1, targetPct: 53 }, // Critical Defaulter
  { roll: 'SE-IT-132', name: 'Kavya Menon', email: 'student32@college.edu', classId: 1, targetPct: 68 }, // Defaulter
  { roll: 'SE-IT-133', name: 'Mohit Sharma', email: 'student33@college.edu', classId: 1, targetPct: 58 }, // Defaulter
  { roll: 'SE-IT-134', name: 'Simran Kaur', email: 'student34@college.edu', classId: 1, targetPct: 63 }, // Defaulter
  { roll: 'SE-IT-135', name: 'Pranav Kulkarni', email: 'student35@college.edu', classId: 1, targetPct: 74 }, // Borderline
  { roll: 'SE-IT-136', name: 'Pallavi Shinde', email: 'student36@college.edu', classId: 1, targetPct: 84 },
  { roll: 'SE-IT-137', name: 'Rohit Jadhav', email: 'student37@college.edu', classId: 1, targetPct: 79 },
  { roll: 'SE-IT-138', name: 'Ritu More', email: 'student38@college.edu', classId: 1, targetPct: 68 }, // Defaulter
  { roll: 'SE-IT-139', name: 'Akshay Patil', email: 'student39@college.edu', classId: 1, targetPct: 84 },
  { roll: 'SE-IT-140', name: 'Manisha Chauhan', email: 'student40@college.edu', classId: 1, targetPct: 89 },
  // Div B Students (Class 2)
  { roll: 'SE-IT-141', name: 'Mayank Jain', email: 'student41@college.edu', classId: 2, targetPct: 75 },
  { roll: 'SE-IT-142', name: 'Apeksha Gore', email: 'student42@college.edu', classId: 2, targetPct: 100 },
  { roll: 'SE-IT-143', name: 'Chirag Bhatt', email: 'student43@college.edu', classId: 2, targetPct: 50 }, // Defaulter
  { roll: 'SE-IT-144', name: 'Deepali Sonawane', email: 'student44@college.edu', classId: 2, targetPct: 75 },
  { roll: 'SE-IT-145', name: 'Omkar Gaikwad', email: 'student45@college.edu', classId: 2, targetPct: 50 }, // Defaulter
  { roll: 'SE-IT-146', name: 'Sakshi Bhosale', email: 'student46@college.edu', classId: 2, targetPct: 100 },
  { roll: 'SE-IT-147', name: 'Sourabh Mane', email: 'student47@college.edu', classId: 2, targetPct: 75 },
  { roll: 'SE-IT-148', name: 'Tejaswini Pawar', email: 'student48@college.edu', classId: 2, targetPct: 50 }, // Defaulter
  { roll: 'SE-IT-149', name: 'Vaibhav Salunkhe', email: 'student49@college.edu', classId: 2, targetPct: 75 },
  { roll: 'SE-IT-150', name: 'Komal Wagh', email: 'student50@college.edu', classId: 2, targetPct: 100 },
  { roll: 'SE-IT-151', name: 'Shubham Sawant', email: 'student51@college.edu', classId: 2, targetPct: 75 },
  { roll: 'SE-IT-152', name: 'Priyanka Chawla', email: 'student52@college.edu', classId: 2, targetPct: 50 }, // Defaulter
  { roll: 'SE-IT-153', name: 'Chetan Soni', email: 'student53@college.edu', classId: 2, targetPct: 75 },
  { roll: 'SE-IT-154', name: 'Sanjana Das', email: 'student54@college.edu', classId: 2, targetPct: 100 },
  { roll: 'SE-IT-155', name: 'Tushar Dubey', email: 'student55@college.edu', classId: 2, targetPct: 50 }, // Defaulter
  { roll: 'SE-IT-156', name: 'Urvashi Rawat', email: 'student56@college.edu', classId: 2, targetPct: 75 },
  { roll: 'SE-IT-157', name: 'Vicky Tripathi', email: 'student57@college.edu', classId: 2, targetPct: 50 },
  { roll: 'SE-IT-158', name: 'Vidhi Trivedi', email: 'student58@college.edu', classId: 2, targetPct: 75 },
  { roll: 'SE-IT-159', name: 'Vishal Yadav', email: 'student59@college.edu', classId: 2, targetPct: 100 },
  { roll: 'SE-IT-160', name: 'Zoya Khan', email: 'student60@college.edu', classId: 2, targetPct: 75 },
];

// Complete 23 lectures schedule
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
  { id: 23, subjectId: 3, classId: 1, daysAgo: 0, hour: 10, teacherId: 1 }, // today's lecture
];

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const SQL = await initSqlJs();

  // If a saved database file exists, check if it has 23 sessions and 60 students
  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE_PATH);
      const testDb = new SQL.Database(fileBuffer);
      const sessionCountRes = testDb.exec("SELECT COUNT(*) FROM AttendanceSessions");
      const sessionCount = sessionCountRes[0]?.values[0]?.[0] as number;
      if (sessionCount >= 23) {
        dbInstance = testDb;
        console.log(`Loaded existing SQLite database from ${DB_FILE_PATH} with ${sessionCount} sessions`);
        return dbInstance;
      }
    } catch (err) {
      console.warn('Failed to load existing DB file or outdated session count, re-initializing:', err);
    }
  }

  dbInstance = new SQL.Database();
  console.log('Initializing fresh SQLite database with 23 lectures and mixed attendance for 60 students...');
  await initSchemaAndSeed(dbInstance);
  saveDb();
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE_PATH, buffer);
  } catch (err) {
    console.error('Failed to persist SQLite database to disk:', err);
  }
}

export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return rows;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function runQuery(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);
  const res = dbInstance.exec('SELECT last_insert_rowid() AS id, changes() AS changes;');
  const lastInsertRowid = (res[0]?.values[0]?.[0] as number) || 0;
  const changes = (res[0]?.values[0]?.[1] as number) || 0;
  saveDb();
  return { changes, lastInsertRowid };
}

export async function resetDatabase(): Promise<void> {
  const SQL = await initSqlJs();
  dbInstance = new SQL.Database();
  await initSchemaAndSeed(dbInstance);
  saveDb();
  console.log('Database successfully reset and reseeded with 23 lectures and mixed attendance.');
}

async function initSchemaAndSeed(db: Database) {
  // Create tables according to project specifications
  db.run(`
    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('teacher', 'student', 'admin')),
      roll_number TEXT,
      created_at TEXT NOT NULL
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
      start_time TEXT NOT NULL,
      expiry_time TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'CLOSED', 'EXPIRED')),
      FOREIGN KEY (teacher_id) REFERENCES Users(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES Subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES Classes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS AttendanceRecords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      marked_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PRESENT',
      UNIQUE (session_id, student_id),
      FOREIGN KEY (session_id) REFERENCES AttendanceSessions(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE
    );
  `);

  // Hash standard demo password: 'password123'
  const demoHash = bcrypt.hashSync('password123', 10);
  const now = new Date().toISOString();

  // Seed Faculty / Teachers and Admin
  db.run(`
    INSERT INTO Users (id, name, email, password_hash, role, roll_number, created_at) VALUES
    (1, 'Prof. Rajesh Sharma', 'teacher@college.edu', '${demoHash}', 'teacher', NULL, '${now}'),
    (2, 'Dr. Ananya Iyer', 'teacher2@college.edu', '${demoHash}', 'teacher', NULL, '${now}'),
    (3, 'College Administrator', 'admin@college.edu', '${demoHash}', 'admin', NULL, '${now}');
  `);

  // Seed 60 Students (starting from id = 4 to 63)
  const studentInsertValues = DEMO_60_STUDENTS.map((s, index) => {
    const id = index + 4;
    return `(${id}, '${s.name}', '${s.email}', '${demoHash}', 'student', '${s.roll}', '${now}')`;
  }).join(',\n');

  db.run(`
    INSERT INTO Users (id, name, email, password_hash, role, roll_number, created_at) VALUES
    ${studentInsertValues};
  `);

  // Seed Classes
  db.run(`
    INSERT INTO Classes (id, class_name, department, academic_year) VALUES
    (1, 'SE-IT Div A', 'Information Technology', '2025-2026'),
    (2, 'SE-IT Div B', 'Information Technology', '2025-2026'),
    (3, 'TE-IT Div A', 'Information Technology', '2025-2026');
  `);

  // Seed Subjects
  db.run(`
    INSERT INTO Subjects (id, subject_name, subject_code, class_id) VALUES
    (1, 'Data Structures & Algorithms', 'IT301', 1),
    (2, 'Database Management Systems', 'IT302', 1),
    (3, 'Computer Networks', 'IT303', 1),
    (4, 'Web Development Technologies', 'IT304', 1),
    (5, 'Software Engineering', 'IT305', 2),
    (6, 'Operating Systems', 'IT306', 2);
  `);

  // Enroll Students:
  // First 40 students (id 4 to 43) in SE-IT Div A (Class 1)
  // Remaining 20 students (id 44 to 63) in SE-IT Div B (Class 2)
  const enrollmentValues = DEMO_60_STUDENTS.map((s, index) => {
    const studentId = index + 4;
    return `(${studentId}, ${s.classId})`;
  }).join(',\n');

  db.run(`
    INSERT INTO StudentClasses (student_id, class_id) VALUES
    ${enrollmentValues};
  `);

  // Seed 23 Attendance Sessions across the past 4 weeks
  const nowMs = Date.now();
  const sessionInsertValues = SEED_23_LECTURES.map(lec => {
    const lectureDate = new Date(nowMs - lec.daysAgo * 24 * 3600 * 1000);
    lectureDate.setHours(lec.hour, 15, 0, 0);
    const startTimeIso = lectureDate.toISOString();
    const expiryDate = new Date(lectureDate.getTime() + 50 * 60 * 1000); // 50 min lecture duration
    const expiryTimeIso = expiryDate.toISOString();
    return `(${lec.id}, ${lec.teacherId}, ${lec.subjectId}, ${lec.classId}, 'token_hash_lecture_${lec.id}', '${startTimeIso}', '${expiryTimeIso}', 'CLOSED')`;
  }).join(',\n');

  db.run(`
    INSERT INTO AttendanceSessions (id, teacher_id, subject_id, class_id, token_hash, start_time, expiry_time, status) VALUES
    ${sessionInsertValues};
  `);

  // Generate Realistic Mixed Attendance Records
  // For each session, only students enrolled in that class are eligible
  // Using pseudo-random but deterministic hash: (studentId * 13 + sessionId * 37 + 19) % 100
  // If the computed value is < targetPct, the student was present!
  const attendanceRecordValues: string[] = [];

  for (const lec of SEED_23_LECTURES) {
    const lectureDate = new Date(nowMs - lec.daysAgo * 24 * 3600 * 1000);
    lectureDate.setHours(lec.hour, 20, 0, 0); // marked 5 mins after lecture start
    const markedAtIso = lectureDate.toISOString();

    for (let index = 0; index < DEMO_60_STUDENTS.length; index++) {
      const student = DEMO_60_STUDENTS[index];
      const studentId = index + 4;

      // Check if student belongs to this lecture's class
      if (student.classId !== lec.classId) {
        continue;
      }

      // Deterministic pseudo-random number generator between 0 and 99
      const pseudoVal = (studentId * 13 + lec.id * 37 + 19) % 100;

      // If pseudoVal is within target percentage, student was PRESENT
      if (pseudoVal < student.targetPct) {
        attendanceRecordValues.push(`(${lec.id}, ${studentId}, '${markedAtIso}', 'PRESENT')`);
      }
    }
  }

  // Insert all attendance records into SQLite
  db.run(`
    INSERT INTO AttendanceRecords (session_id, student_id, marked_at, status) VALUES
    ${attendanceRecordValues.join(',\n')};
  `);

  console.log(`SQLite database successfully seeded with 23 lectures and ${attendanceRecordValues.length} mixed attendance records for 60 students.`);
}
