"""
Database Initialization & 23 Lectures Demo Seeding Script for Flask Backend
Run this script to initialize SQLite database with 60 students and 23 lectures with mixed attendance.
Command: python init_db.py
"""

import sqlite3
import os
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
from models import SCHEMA_SQL

DB_PATH = os.path.join(os.path.dirname(__file__), 'attendance.db')

DEMO_60_STUDENTS = [
    ('Aarav Patel', 'student1@college.edu', 'SE-IT-101', 1, 89),
    ('Diya Sharma', 'student2@college.edu', 'SE-IT-102', 1, 95),
    ('Rohan Verma', 'student3@college.edu', 'SE-IT-103', 1, 84),
    ('Neha Kulkarni', 'student4@college.edu', 'SE-IT-104', 1, 79),
    ('Aditya Singh', 'student5@college.edu', 'SE-IT-105', 1, 84),
    ('Ananya Deshmukh', 'student6@college.edu', 'SE-IT-106', 1, 92),
    ('Aryan Joshi', 'student7@college.edu', 'SE-IT-107', 1, 79),
    ('Ishita Mehta', 'student8@college.edu', 'SE-IT-108', 1, 89),
    ('Siddharth Nair', 'student9@college.edu', 'SE-IT-109', 1, 84),
    ('Tanvi Bhat', 'student10@college.edu', 'SE-IT-110', 1, 95),
    ('Harsh Vardhan', 'student11@college.edu', 'SE-IT-111', 1, 79),
    ('Pooja Hegde', 'student12@college.edu', 'SE-IT-112', 1, 84),
    ('Varun Reddy', 'student13@college.edu', 'SE-IT-113', 1, 89),
    ('Sneha Rao', 'student14@college.edu', 'SE-IT-114', 1, 95),
    ('Rahul Gupta', 'student15@college.edu', 'SE-IT-115', 1, 84),
    ('Riya Sen', 'student16@college.edu', 'SE-IT-116', 1, 79),
    ('Karan Malhotra', 'student17@college.edu', 'SE-IT-117', 1, 84),
    ('Shreya Pillai', 'student18@college.edu', 'SE-IT-118', 1, 79),
    ('Kunal Kapoor', 'student19@college.edu', 'SE-IT-119', 1, 84),
    ('Meera Nambiar', 'student20@college.edu', 'SE-IT-120', 1, 79),
    ('Vivek Choudhury', 'student21@college.edu', 'SE-IT-121', 1, 84),
    ('Divya Agarwal', 'student22@college.edu', 'SE-IT-122', 1, 79),
    ('Gaurav Saxena', 'student23@college.edu', 'SE-IT-123', 1, 79),
    ('Aditi Roy', 'student24@college.edu', 'SE-IT-124', 1, 84),
    ('Nikhil Tiwari', 'student25@college.edu', 'SE-IT-125', 1, 74),
    ('Prachi Shah', 'student26@college.edu', 'SE-IT-126', 1, 68),
    ('Yash Mishra', 'student27@college.edu', 'SE-IT-127', 1, 63),
    ('Swati Pandey', 'student28@college.edu', 'SE-IT-128', 1, 58),
    ('Amit Kumar', 'student29@college.edu', 'SE-IT-129', 1, 63),
    ('Natasha DSouza', 'student30@college.edu', 'SE-IT-130', 1, 68),
    ('Ayush Bansal', 'student31@college.edu', 'SE-IT-131', 1, 53),
    ('Kavya Menon', 'student32@college.edu', 'SE-IT-132', 1, 68),
    ('Mohit Sharma', 'student33@college.edu', 'SE-IT-133', 1, 58),
    ('Simran Kaur', 'student34@college.edu', 'SE-IT-134', 1, 63),
    ('Pranav Kulkarni', 'student35@college.edu', 'SE-IT-135', 1, 74),
    ('Pallavi Shinde', 'student36@college.edu', 'SE-IT-136', 1, 84),
    ('Rohit Jadhav', 'student37@college.edu', 'SE-IT-137', 1, 79),
    ('Ritu More', 'student38@college.edu', 'SE-IT-138', 1, 68),
    ('Akshay Patil', 'student39@college.edu', 'SE-IT-139', 1, 84),
    ('Manisha Chauhan', 'student40@college.edu', 'SE-IT-140', 1, 89),
    ('Mayank Jain', 'student41@college.edu', 'SE-IT-141', 2, 75),
    ('Apeksha Gore', 'student42@college.edu', 'SE-IT-142', 2, 100),
    ('Chirag Bhatt', 'student43@college.edu', 'SE-IT-143', 2, 50),
    ('Deepali Sonawane', 'student44@college.edu', 'SE-IT-144', 2, 75),
    ('Omkar Gaikwad', 'student45@college.edu', 'SE-IT-145', 2, 50),
    ('Sakshi Bhosale', 'student46@college.edu', 'SE-IT-146', 2, 100),
    ('Sourabh Mane', 'student47@college.edu', 'SE-IT-147', 2, 75),
    ('Tejaswini Pawar', 'student48@college.edu', 'SE-IT-148', 2, 50),
    ('Vaibhav Salunkhe', 'student49@college.edu', 'SE-IT-149', 2, 75),
    ('Komal Wagh', 'student50@college.edu', 'SE-IT-150', 2, 100),
    ('Shubham Sawant', 'student51@college.edu', 'SE-IT-151', 2, 75),
    ('Priyanka Chawla', 'student52@college.edu', 'SE-IT-152', 2, 50),
    ('Chetan Soni', 'student53@college.edu', 'SE-IT-153', 2, 75),
    ('Sanjana Das', 'student54@college.edu', 'SE-IT-154', 2, 100),
    ('Tushar Dubey', 'student55@college.edu', 'SE-IT-155', 2, 50),
    ('Urvashi Rawat', 'student56@college.edu', 'SE-IT-156', 2, 75),
    ('Vicky Tripathi', 'student57@college.edu', 'SE-IT-157', 2, 50),
    ('Vidhi Trivedi', 'student58@college.edu', 'SE-IT-158', 2, 75),
    ('Vishal Yadav', 'student59@college.edu', 'SE-IT-159', 2, 100),
    ('Zoya Khan', 'student60@college.edu', 'SE-IT-160', 2, 75),
]

SEED_23_LECTURES = [
    (1, 1, 1, 28, 9, 1),
    (2, 2, 1, 27, 11, 1),
    (3, 3, 1, 26, 14, 1),
    (4, 4, 1, 25, 10, 1),
    (5, 5, 2, 24, 12, 2),
    (6, 1, 1, 22, 9, 1),
    (7, 2, 1, 21, 11, 1),
    (8, 3, 1, 20, 14, 1),
    (9, 4, 1, 19, 10, 1),
    (10, 6, 2, 18, 15, 2),
    (11, 1, 1, 15, 9, 1),
    (12, 2, 1, 14, 11, 1),
    (13, 3, 1, 13, 14, 1),
    (14, 4, 1, 12, 10, 1),
    (15, 5, 2, 11, 12, 2),
    (16, 1, 1, 8, 9, 1),
    (17, 2, 1, 7, 11, 1),
    (18, 3, 1, 6, 14, 1),
    (19, 4, 1, 5, 10, 1),
    (20, 6, 2, 4, 15, 2),
    (21, 1, 1, 2, 9, 1),
    (22, 2, 1, 1, 11, 1),
    (23, 3, 1, 0, 10, 1),
]

def init_database():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("PRAGMA foreign_keys = ON;")
    cursor.executescript(SCHEMA_SQL)

    cursor.execute("DELETE FROM AttendanceRecords;")
    cursor.execute("DELETE FROM AttendanceSessions;")
    cursor.execute("DELETE FROM StudentClasses;")
    cursor.execute("DELETE FROM Subjects;")
    cursor.execute("DELETE FROM Classes;")
    cursor.execute("DELETE FROM Users;")

    hashed_pwd = generate_password_hash('password123', method='pbkdf2:sha256')
    now = datetime.utcnow().isoformat()

    # 1. Teachers
    cursor.execute("""
        INSERT INTO Users (id, name, email, password_hash, role, roll_number, created_at)
        VALUES 
        (1, 'Prof. Rajesh Sharma', 'teacher@college.edu', ?, 'teacher', NULL, ?),
        (2, 'Dr. Ananya Iyer', 'teacher2@college.edu', ?, 'teacher', NULL, ?),
        (3, 'College Administrator', 'admin@college.edu', ?, 'admin', NULL, ?)
    """, (hashed_pwd, now, hashed_pwd, now, hashed_pwd, now))

    # 2. 60 Students
    for idx, (name, email, roll, class_id, _) in enumerate(DEMO_60_STUDENTS):
        user_id = idx + 4
        cursor.execute("""
            INSERT INTO Users (id, name, email, password_hash, role, roll_number, created_at)
            VALUES (?, ?, ?, ?, 'student', ?, ?)
        """, (user_id, name, email, hashed_pwd, roll, now))

    # 3. Classes
    cursor.execute("""
        INSERT INTO Classes (id, class_name, department, academic_year)
        VALUES 
        (1, 'SE-IT Div A', 'Information Technology', '2025-2026'),
        (2, 'SE-IT Div B', 'Information Technology', '2025-2026'),
        (3, 'TE-IT Div A', 'Information Technology', '2025-2026')
    """)

    # 4. Subjects
    cursor.execute("""
        INSERT INTO Subjects (id, subject_name, subject_code, class_id)
        VALUES 
        (1, 'Data Structures & Algorithms', 'IT301', 1),
        (2, 'Database Management Systems', 'IT302', 1),
        (3, 'Computer Networks', 'IT303', 1),
        (4, 'Web Development Technologies', 'IT304', 1),
        (5, 'Software Engineering', 'IT305', 2),
        (6, 'Operating Systems', 'IT306', 2)
    """)

    # 5. Enroll Students
    for idx, (_, _, _, class_id, _) in enumerate(DEMO_60_STUDENTS):
        student_id = idx + 4
        cursor.execute("INSERT INTO StudentClasses (student_id, class_id) VALUES (?, ?)", (student_id, class_id))

    # 6. Seed 23 Sessions
    now_dt = datetime.utcnow()
    for (sid, sub_id, cls_id, days_ago, hour, teacher_id) in SEED_23_LECTURES:
        lec_dt = (now_dt - timedelta(days=days_ago)).replace(hour=hour, minute=15, second=0, microsecond=0)
        exp_dt = lec_dt + timedelta(minutes=50)
        cursor.execute("""
            INSERT INTO AttendanceSessions (id, teacher_id, subject_id, class_id, token_hash, start_time, expiry_time, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'CLOSED')
        """, (sid, teacher_id, sub_id, cls_id, f'token_hash_lecture_{sid}', lec_dt.isoformat(), exp_dt.isoformat()))

    # 7. Generate Mixed Attendance
    for (sid, _, cls_id, days_ago, hour, _) in SEED_23_LECTURES:
        lec_dt = (now_dt - timedelta(days=days_ago)).replace(hour=hour, minute=20, second=0, microsecond=0)
        marked_iso = lec_dt.isoformat()

        for idx, (_, _, _, student_class_id, target_pct) in enumerate(DEMO_60_STUDENTS):
            student_id = idx + 4
            if student_class_id != cls_id:
                continue
            
            pseudo_val = (student_id * 13 + sid * 37 + 19) % 100
            if pseudo_val < target_pct:
                cursor.execute("""
                    INSERT INTO AttendanceRecords (session_id, student_id, marked_at, status)
                    VALUES (?, ?, ?, 'PRESENT')
                """, (sid, student_id, marked_iso))

    conn.commit()
    print("Database seeded with 60 students, 23 lectures, and mixed attendance.")
    conn.close()

if __name__ == '__main__':
    init_database()
