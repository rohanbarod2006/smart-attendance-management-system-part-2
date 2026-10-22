"""
Smart Attendance Management System Using QR Code
Flask REST API Backend
"""

import os
import io
import base64
import hashlib
import secrets
import sqlite3
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import qrcode

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

DB_PATH = os.environ.get('SQLITE_DB_PATH', os.path.join(os.path.dirname(__file__), 'attendance.db'))
JWT_SECRET = os.environ.get('JWT_SECRET', 'smart-qr-attendance-sec-key-2026')
APP_URL = os.environ.get('APP_URL', 'http://localhost:3000').rstrip('/')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()

# Auth Middleware Decorators
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'error': 'Authentication token is missing'}), 401
        
        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            current_user = data
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired, please log in again'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid authentication token'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

def roles_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(current_user, *args, **kwargs):
            if current_user.get('role') not in allowed_roles:
                return jsonify({'error': f"Access forbidden. Requires one of: {', '.join(allowed_roles)}"}), 403
            return f(current_user, *args, **kwargs)
        return decorated_function
    return decorator


# 1. Auth: Login
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM Users WHERE email = ?', (email,)).fetchone()
    conn.close()

    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'Invalid email or password'}), 401

    payload = {
        'id': user['id'],
        'name': user['name'],
        'email': user['email'],
        'role': user['role'],
        'roll_number': user['roll_number'],
        'exp': datetime.utcnow() + timedelta(days=7)
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')

    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'role': user['role'],
            'roll_number': user['roll_number']
        }
    })


# 2. Auth: Register
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', 'student')
    roll_number = data.get('rollNumber', '').strip() or None
    class_ids = data.get('classIds', [])

    if not name or not email or not password:
        return jsonify({'error': 'Name, email, and password are required'}), 400

    if role not in ['teacher', 'student', 'admin']:
        return jsonify({'error': 'Invalid user role specified'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    existing = cursor.execute('SELECT id FROM Users WHERE email = ?', (email,)).fetchone()
    if existing:
        conn.close()
        return jsonify({'error': 'An account with this email already exists'}), 409

    pwd_hash = generate_password_hash(password, method='pbkdf2:sha256')
    now = datetime.utcnow().isoformat()

    cursor.execute(
        'INSERT INTO Users (name, email, password_hash, role, roll_number, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        (name, email, pwd_hash, role, roll_number, now)
    )
    user_id = cursor.lastrowid

    if role == 'student' and isinstance(class_ids, list):
        for cid in class_ids:
            cursor.execute('INSERT OR IGNORE INTO StudentClasses (student_id, class_id) VALUES (?, ?)', (user_id, cid))

    conn.commit()
    conn.close()

    payload = {
        'id': user_id,
        'name': name,
        'email': email,
        'role': role,
        'roll_number': roll_number,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')

    return jsonify({
        'token': token,
        'user': {
            'id': user_id,
            'name': name,
            'email': email,
            'role': role,
            'roll_number': roll_number
        }
    }), 201


# 3. Auth: Current Profile
@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    conn = get_db_connection()
    user = conn.execute(
        'SELECT id, name, email, role, roll_number, created_at FROM Users WHERE id = ?',
        (current_user['id'],)
    ).fetchone()

    if not user:
        conn.close()
        return jsonify({'error': 'User not found'}), 404

    enrolled_classes = []
    if user['role'] == 'student':
        rows = conn.execute('''
            SELECT c.* FROM Classes c
            JOIN StudentClasses sc ON sc.class_id = c.id
            WHERE sc.student_id = ?
        ''', (user['id'],)).fetchall()
        enrolled_classes = [dict(r) for r in rows]

    conn.close()
    return jsonify({
        'user': dict(user),
        'enrolledClasses': enrolled_classes
    })


# 4. Classes & Subjects
@app.route('/api/classes', methods=['GET'])
@token_required
def list_classes(current_user):
    conn = get_db_connection()
    classes = [dict(r) for r in conn.execute('SELECT * FROM Classes ORDER BY class_name ASC').fetchall()]
    subjects = [dict(r) for r in conn.execute('SELECT * FROM Subjects ORDER BY subject_name ASC').fetchall()]
    conn.close()
    return jsonify({'classes': classes, 'subjects': subjects})


# 5. Teacher: Dashboard Stats
@app.route('/api/teacher/dashboard-stats', methods=['GET'])
@token_required
@roles_required('teacher', 'admin')
def teacher_dashboard_stats(current_user):
    teacher_id = current_user['id']
    conn = get_db_connection()
    cursor = conn.cursor()

    now_iso = datetime.utcnow().isoformat()
    cursor.execute("UPDATE AttendanceSessions SET status = 'EXPIRED' WHERE status = 'ACTIVE' AND expiry_time <= ?", (now_iso,))
    conn.commit()

    total_students = cursor.execute("SELECT COUNT(*) FROM Users WHERE role = 'student'").fetchone()[0]

    active_sessions = [dict(r) for r in cursor.execute('''
        SELECT s.*, c.class_name, sub.subject_name, sub.subject_code
        FROM AttendanceSessions s
        JOIN Classes c ON s.class_id = c.id
        JOIN Subjects sub ON s.subject_id = sub.id
        WHERE s.teacher_id = ? AND s.status = 'ACTIVE'
        ORDER BY s.id DESC
    ''', (teacher_id,)).fetchall()]

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_count = cursor.execute('''
        SELECT COUNT(DISTINCT ar.id)
        FROM AttendanceRecords ar
        JOIN AttendanceSessions s ON ar.session_id = s.id
        WHERE s.teacher_id = ? AND ar.marked_at >= ?
    ''', (teacher_id, today_start)).fetchone()[0]

    recent_sessions = [dict(r) for r in cursor.execute('''
        SELECT s.*, c.class_name, sub.subject_name, sub.subject_code,
               (SELECT COUNT(*) FROM AttendanceRecords ar WHERE ar.session_id = s.id) as present_count,
               (SELECT COUNT(*) FROM StudentClasses sc WHERE sc.class_id = s.class_id) as total_enrolled
        FROM AttendanceSessions s
        JOIN Classes c ON s.class_id = c.id
        JOIN Subjects sub ON s.subject_id = sub.id
        WHERE s.teacher_id = ?
        ORDER BY s.id DESC
        LIMIT 10
    ''', (teacher_id,)).fetchall()]

    conn.close()

    return jsonify({
        'totalStudents': total_students,
        'activeSessionsCount': len(active_sessions),
        'activeSessions': active_sessions,
        'todayAttendanceCount': today_count,
        'recentSessions': recent_sessions
    })


# 6. Teacher: Create Attendance Session & Generate QR Code
@app.route('/api/sessions/create', methods=['POST'])
@token_required
@roles_required('teacher', 'admin')
def create_session(current_user):
    data = request.get_json() or {}
    class_id = data.get('classId')
    subject_id = data.get('subjectId')
    duration_minutes = int(data.get('durationMinutes', 5))

    if not class_id or not subject_id:
        return jsonify({'error': 'Class ID and Subject ID are required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    subject = cursor.execute('SELECT * FROM Subjects WHERE id = ? AND class_id = ?', (subject_id, class_id)).fetchone()
    if not subject:
        conn.close()
        return jsonify({'error': 'Subject does not belong to selected class'}), 400

    cls = cursor.execute('SELECT * FROM Classes WHERE id = ?', (class_id,)).fetchone()

    raw_token = secrets.token_hex(24)
    token_h = hash_token(raw_token)

    start_time = datetime.utcnow()
    expiry_time = start_time + timedelta(minutes=duration_minutes)

    cursor.execute('''
        INSERT INTO AttendanceSessions (teacher_id, subject_id, class_id, token_hash, start_time, expiry_time, status)
        VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
    ''', (current_user['id'], subject_id, class_id, token_h, start_time.isoformat(), expiry_time.isoformat()))

    session_id = cursor.lastrowid
    conn.commit()
    conn.close()

    attendance_url = f"{APP_URL}/#scan?sessionId={session_id}&token={raw_token}"

    qr_payload = {
        'type': 'SMART_ATTENDANCE_QR',
        'sessionId': session_id,
        'token': raw_token,
        'subjectCode': subject['subject_code'],
        'className': cls['class_name'],
        'expiryTime': expiry_time.isoformat(),
        'url': attendance_url
    }

    # Generate QR Code image in memory using Python qrcode
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    import json
    qr.add_data(json.dumps(qr_payload))
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0f172a", back_color="#ffffff")

    buf = io.BytesIO()
    img.save(buf, format='PNG')
    qr_data_url = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode('utf-8')

    return jsonify({
        'session': {
            'id': session_id,
            'teacher_id': current_user['id'],
            'subject_id': subject_id,
            'class_id': class_id,
            'subject_name': subject['subject_name'],
            'subject_code': subject['subject_code'],
            'class_name': cls['class_name'],
            'start_time': start_time.isoformat(),
            'expiry_time': expiry_time.isoformat(),
            'status': 'ACTIVE',
            'duration_minutes': duration_minutes
        },
        'token': raw_token,
        'qrDataUrl': qr_data_url,
        'attendanceUrl': attendance_url
    }), 201


# 7. Live Attendance Attendees
@app.route('/api/sessions/<int:session_id>/live', methods=['GET'])
@token_required
def get_session_live(current_user, session_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    session = cursor.execute('''
        SELECT s.*, c.class_name, sub.subject_name, sub.subject_code, u.name as teacher_name
        FROM AttendanceSessions s
        JOIN Classes c ON s.class_id = c.id
        JOIN Subjects sub ON s.subject_id = sub.id
        JOIN Users u ON s.teacher_id = u.id
        WHERE s.id = ?
    ''', (session_id,)).fetchone()

    if not session:
        conn.close()
        return jsonify({'error': 'Session not found'}), 404

    session_dict = dict(session)
    now_iso = datetime.utcnow().isoformat()
    if session_dict['status'] == 'ACTIVE' and session_dict['expiry_time'] <= now_iso:
        session_dict['status'] = 'EXPIRED'
        cursor.execute("UPDATE AttendanceSessions SET status = 'EXPIRED' WHERE id = ?", (session_id,))
        conn.commit()

    records = [dict(r) for r in cursor.execute('''
        SELECT ar.id, ar.marked_at, ar.status, u.id as student_id, u.name as student_name, u.email as student_email, u.roll_number
        FROM AttendanceRecords ar
        JOIN Users u ON ar.student_id = u.id
        WHERE ar.session_id = ?
        ORDER BY ar.marked_at DESC
    ''', (session_id,)).fetchall()]

    enrolled = [dict(r) for r in cursor.execute('''
        SELECT u.id, u.name, u.email, u.roll_number
        FROM Users u
        JOIN StudentClasses sc ON u.id = sc.student_id
        WHERE sc.class_id = ? AND u.role = 'student'
        ORDER BY u.roll_number ASC
    ''', (session_dict['class_id'],)).fetchall()]

    conn.close()

    present_ids = {r['student_id'] for r in records}
    absent = [s for s in enrolled if s['id'] not in present_ids]

    return jsonify({
        'session': session_dict,
        'records': records,
        'presentCount': len(records),
        'totalEnrolled': len(enrolled),
        'absentStudents': absent
    })


# 8. Student: Submit Attendance with Verification
@app.route('/api/attendance/mark', methods=['POST'])
@token_required
@roles_required('student', 'admin')
def mark_attendance(current_user):
    data = request.get_json() or {}
    session_id = data.get('sessionId')
    token = data.get('token')

    if not session_id or not token:
        return jsonify({'error': 'Session ID and QR token are required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    session = cursor.execute('''
        SELECT s.*, c.class_name, sub.subject_name, sub.subject_code, u.name as teacher_name
        FROM AttendanceSessions s
        JOIN Classes c ON s.class_id = c.id
        JOIN Subjects sub ON s.subject_id = sub.id
        JOIN Users u ON s.teacher_id = u.id
        WHERE s.id = ?
    ''', (session_id,)).fetchone()

    if not session:
        conn.close()
        return jsonify({'error': 'Attendance session not found'}), 404

    now_iso = datetime.utcnow().isoformat()
    if session['expiry_time'] < now_iso or session['status'] == 'EXPIRED':
        cursor.execute("UPDATE AttendanceSessions SET status = 'EXPIRED' WHERE id = ?", (session_id,))
        conn.commit()
        conn.close()
        return jsonify({'error': 'This attendance QR code has expired.'}), 400

    if session['status'] == 'CLOSED':
        conn.close()
        return jsonify({'error': 'This session has been closed by the teacher.'}), 400

    if hash_token(token.strip()) != session['token_hash']:
        conn.close()
        return jsonify({'error': 'Invalid QR token. Verification failed.'}), 400

    # Class enrollment check
    enrollment = cursor.execute(
        'SELECT * FROM StudentClasses WHERE student_id = ? AND class_id = ?',
        (current_user['id'], session['class_id'])
    ).fetchone()

    if not enrollment and current_user['role'] != 'admin':
        conn.close()
        return jsonify({'error': f"You are not enrolled in class '{session['class_name']}'."}), 403

    # Duplicate check
    existing = cursor.execute(
        'SELECT id, marked_at FROM AttendanceRecords WHERE session_id = ? AND student_id = ?',
        (session['id'], current_user['id'])
    ).fetchone()

    if existing:
        conn.close()
        return jsonify({'error': 'Attendance already marked for this session!'}), 409

    cursor.execute('''
        INSERT INTO AttendanceRecords (session_id, student_id, marked_at, status)
        VALUES (?, ?, ?, 'PRESENT')
    ''', (session['id'], current_user['id'], now_iso))

    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message': 'Attendance recorded successfully!',
        'details': {
            'studentName': current_user['name'],
            'rollNumber': current_user.get('roll_number'),
            'subjectName': session['subject_name'],
            'subjectCode': session['subject_code'],
            'className': session['class_name'],
            'teacherName': session['teacher_name'],
            'markedAt': now_iso
        }
    })


# 9. Student: Dashboard & Percentages
@app.route('/api/student/dashboard', methods=['GET'])
@token_required
@roles_required('student', 'admin')
def student_dashboard(current_user):
    student_id = current_user['id']
    conn = get_db_connection()
    cursor = conn.cursor()

    classes = [dict(r) for r in cursor.execute('''
        SELECT c.* FROM Classes c
        JOIN StudentClasses sc ON sc.class_id = c.id
        WHERE sc.student_id = ?
    ''', (student_id,)).fetchall()]

    class_ids = [c['id'] for c in classes]
    if not class_ids:
        conn.close()
        return jsonify({
            'profile': current_user,
            'classes': [],
            'subjectPercentages': [],
            'overallPercentage': 0,
            'recentHistory': []
        })

    placeholders = ','.join('?' for _ in class_ids)
    subjects = [dict(r) for r in cursor.execute(f'''
        SELECT s.*, c.class_name FROM Subjects s
        JOIN Classes c ON s.class_id = c.id
        WHERE s.class_id IN ({placeholders})
        ORDER BY s.subject_name ASC
    ''', class_ids).fetchall()]

    subject_percentages = []
    total_conducted = 0
    total_attended = 0

    for sub in subjects:
        conducted = cursor.execute('SELECT COUNT(*) FROM AttendanceSessions WHERE subject_id = ?', (sub['id'],)).fetchone()[0]
        attended = cursor.execute('''
            SELECT COUNT(*) FROM AttendanceRecords ar
            JOIN AttendanceSessions s ON ar.session_id = s.id
            WHERE s.subject_id = ? AND ar.student_id = ?
        ''', (sub['id'], student_id)).fetchone()[0]

        pct = round((attended / conducted * 100), 1) if conducted > 0 else 100.0
        total_conducted += conducted
        total_attended += attended

        subject_percentages.append({
            'subjectId': sub['id'],
            'subjectName': sub['subject_name'],
            'subjectCode': sub['subject_code'],
            'className': sub['class_name'],
            'totalSessions': conducted,
            'attendedSessions': attended,
            'percentage': pct,
            'isDefaulter': pct < 75.0 and conducted > 0
        })

    overall_pct = round((total_attended / total_conducted * 100), 1) if total_conducted > 0 else 100.0

    recent_history = [dict(r) for r in cursor.execute('''
        SELECT ar.id, ar.marked_at, ar.status, s.id as session_id,
               sub.subject_name, sub.subject_code, c.class_name, u.name as teacher_name
        FROM AttendanceRecords ar
        JOIN AttendanceSessions s ON ar.session_id = s.id
        JOIN Subjects sub ON s.subject_id = sub.id
        JOIN Classes c ON s.class_id = c.id
        JOIN Users u ON s.teacher_id = u.id
        WHERE ar.student_id = ?
        ORDER BY ar.marked_at DESC
        LIMIT 10
    ''', (student_id,)).fetchall()]

    conn.close()

    return jsonify({
        'profile': current_user,
        'classes': classes,
        'subjectPercentages': subject_percentages,
        'overallPercentage': overall_pct,
        'totalEligibleSessions': total_conducted,
        'totalAttendedSessions': total_attended,
        'recentHistory': recent_history
    })


# 10. Reports: Export CSV
@app.route('/api/reports/export-csv', methods=['GET'])
@token_required
@roles_required('teacher', 'admin')
def export_csv(current_user):
    class_id = request.args.get('classId')
    subject_id = request.args.get('subjectId')
    session_id = request.args.get('sessionId')

    conn = get_db_connection()
    cursor = conn.cursor()

    query = '''
        SELECT ar.id, ar.marked_at, ar.status,
               u.name as student_name, u.email as student_email, u.roll_number,
               sub.subject_name, sub.subject_code,
               c.class_name,
               t.name as teacher_name,
               s.id as session_id
        FROM AttendanceRecords ar
        JOIN AttendanceSessions s ON ar.session_id = s.id
        JOIN Users u ON ar.student_id = u.id
        JOIN Subjects sub ON s.subject_id = sub.id
        JOIN Classes c ON s.class_id = c.id
        JOIN Users t ON s.teacher_id = t.id
        WHERE 1=1
    '''
    params = []

    if session_id:
        query += ' AND s.id = ?'
        params.append(session_id)
    else:
        if class_id:
            query += ' AND s.class_id = ?'
            params.append(class_id)
        if subject_id:
            query += ' AND s.subject_id = ?'
            params.append(subject_id)

    query += ' ORDER BY s.id DESC, ar.marked_at ASC'
    records = [dict(r) for r in cursor.execute(query, params).fetchall()]
    conn.close()

    output = io.StringIO()
    output.write("Record ID,Session ID,Marked At,Roll Number,Student Name,Email,Class,Subject Code,Subject Name,Teacher,Status\n")
    for r in records:
        output.write(f'"{r["id"]}","{r["session_id"]}","{r["marked_at"]}","{r["roll_number"] or ""}","{r["student_name"]}","{r["student_email"]}","{r["class_name"]}","{r["subject_code"]}","{r["subject_name"]}","{r["teacher_name"]}","{r["status"]}"\n')

    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = f"attachment; filename=attendance_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    response.headers["Content-type"] = "text/csv"
    return response

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
