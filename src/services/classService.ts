import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, firebaseConfigError } from '../lib/firebase.ts';
import { TeacherClass } from '../types.ts';

export interface CreateTeacherClassPayload {
  className: string;
  subjectName: string;
  subjectCode: string;
  department: string;
  academicYear: string;
  semester: string;
}

export async function fetchTeacherClasses(teacherUid: string): Promise<TeacherClass[]> {
  if (!db) {
    throw new Error(firebaseConfigError || 'Cloud Firestore is not initialized.');
  }

  const classesQuery = query(
    collection(db, 'classes'),
    where('teacherUid', '==', teacherUid)
  );
  const snap = await getDocs(classesQuery);

  const items: TeacherClass[] = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      className: typeof data.className === 'string' ? data.className : '',
      subjectName: typeof data.subjectName === 'string' ? data.subjectName : '',
      subjectCode: typeof data.subjectCode === 'string' ? data.subjectCode : '',
      department: typeof data.department === 'string' ? data.department : '',
      academicYear: typeof data.academicYear === 'string' ? data.academicYear : '',
      semester: typeof data.semester === 'string' ? data.semester : '',
      teacherUid: typeof data.teacherUid === 'string' ? data.teacherUid : teacherUid,
      teacherName: typeof data.teacherName === 'string' ? data.teacherName : '',
      createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
    };
  });

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return items;
}

export async function createTeacherClass(
  teacherUid: string,
  teacherName: string,
  payload: CreateTeacherClassPayload
): Promise<TeacherClass> {
  if (!db) {
    throw new Error(firebaseConfigError || 'Cloud Firestore is not initialized.');
  }

  const cleanClassName = payload.className.trim();
  const cleanSubjectName = payload.subjectName.trim();
  const cleanSubjectCode = payload.subjectCode.trim().toUpperCase();
  const cleanDepartment = payload.department.trim();
  const cleanAcademicYear = payload.academicYear.trim();
  const cleanSemester = payload.semester.trim();
  const cleanTeacherName = teacherName.trim() || 'Faculty';

  if (
    !cleanClassName ||
    !cleanSubjectName ||
    !cleanSubjectCode ||
    !cleanDepartment ||
    !cleanAcademicYear ||
    !cleanSemester
  ) {
    throw new Error('All class fields are required.');
  }

  const nowIso = new Date().toISOString();
  const newDoc = {
    className: cleanClassName.slice(0, 100),
    subjectName: cleanSubjectName.slice(0, 120),
    subjectCode: cleanSubjectCode.slice(0, 30),
    department: cleanDepartment.slice(0, 120),
    academicYear: cleanAcademicYear.slice(0, 30),
    semester: cleanSemester.slice(0, 30),
    teacherUid,
    teacherName: cleanTeacherName.slice(0, 120),
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const ref = await addDoc(collection(db, 'classes'), newDoc);
  return {
    id: ref.id,
    ...newDoc,
  };
}

export async function updateTeacherClass(
  classId: string,
  teacherName: string,
  payload: CreateTeacherClassPayload
): Promise<void> {
  if (!db) {
    throw new Error(firebaseConfigError || 'Cloud Firestore is not initialized.');
  }

  const cleanClassName = payload.className.trim();
  const cleanSubjectName = payload.subjectName.trim();
  const cleanSubjectCode = payload.subjectCode.trim().toUpperCase();
  const cleanDepartment = payload.department.trim();
  const cleanAcademicYear = payload.academicYear.trim();
  const cleanSemester = payload.semester.trim();

  if (
    !cleanClassName ||
    !cleanSubjectName ||
    !cleanSubjectCode ||
    !cleanDepartment ||
    !cleanAcademicYear ||
    !cleanSemester
  ) {
    throw new Error('All class fields are required.');
  }

  await updateDoc(doc(db, 'classes', classId), {
    className: cleanClassName.slice(0, 100),
    subjectName: cleanSubjectName.slice(0, 120),
    subjectCode: cleanSubjectCode.slice(0, 30),
    department: cleanDepartment.slice(0, 120),
    academicYear: cleanAcademicYear.slice(0, 30),
    semester: cleanSemester.slice(0, 30),
    teacherName: (teacherName.trim() || 'Faculty').slice(0, 120),
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTeacherClass(classId: string): Promise<void> {
  if (!db) {
    throw new Error(firebaseConfigError || 'Cloud Firestore is not initialized.');
  }

  await deleteDoc(doc(db, 'classes', classId));
}
