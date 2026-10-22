const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('smart_attendance_jwt');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('smart_attendance_jwt', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('smart_attendance_jwt');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Server error occurred');
    }
    return data as T;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Server error occurred');
  }

  return response as unknown as T;
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (payload: any) =>
    request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getCurrentUser: () =>
    request<{ user: any; enrolledClasses: any[] }>('/auth/me'),

  resetDemoDatabase: () =>
    request<{ success: boolean; message: string }>('/auth/reset-demo', {
      method: 'POST',
    }),

  // Classes & Subjects
  getClassesAndSubjects: () =>
    request<{ classes: any[]; subjects: any[] }>('/classes'),

  // Teacher Endpoints
  getTeacherStats: () =>
    request<any>('/teacher/dashboard-stats'),

  createSession: (data: { classId: number; subjectId: number; durationMinutes: number }) =>
    request<{ session: any; token: string; qrDataUrl: string; attendanceUrl: string; qrPayload: string }>('/sessions/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSessionLive: (sessionId: number) =>
    request<{
      session: any;
      records: any[];
      presentCount: number;
      totalEnrolled: number;
      absentStudents: any[];
    }>(`/sessions/${sessionId}/live`),

  closeSession: (sessionId: number) =>
    request<{ success: boolean; message: string }>(`/sessions/${sessionId}/close`, {
      method: 'POST',
    }),

  // Student Endpoints
  getStudentDashboard: () =>
    request<any>('/student/dashboard'),

  getStudentHistory: (subjectId?: number) =>
    request<{ records: any[] }>(`/student/history${subjectId ? `?subjectId=${subjectId}` : ''}`),

  markAttendance: (payload: { sessionId: number; token: string }) =>
    request<{
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
    }>('/attendance/mark', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  previewSession: (sessionId: number, token: string) =>
    request<{ session: any }>(`/sessions/preview?sessionId=${sessionId}&token=${encodeURIComponent(token)}`),

  // Reports
  getTeacherReports: (params: { classId?: number; subjectId?: number; date?: string }) => {
    const query = new URLSearchParams();
    if (params.classId) query.append('classId', params.classId.toString());
    if (params.subjectId) query.append('subjectId', params.subjectId.toString());
    if (params.date) query.append('date', params.date);
    return request<{ sessions: any[]; summary: any }>(`/reports/teacher?${query.toString()}`);
  },

  getExportCsvUrl: (params: { classId?: number; subjectId?: number; sessionId?: number }) => {
    const query = new URLSearchParams();
    if (params.sessionId) query.append('sessionId', params.sessionId.toString());
    if (params.classId) query.append('classId', params.classId.toString());
    if (params.subjectId) query.append('subjectId', params.subjectId.toString());
    return `${API_BASE}/reports/export-csv?${query.toString()}`;
  },
};
