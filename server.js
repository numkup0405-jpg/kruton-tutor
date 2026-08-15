require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ตรวจสอบและสร้างโฟลเดอร์ uploads อัตโนมัติ
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// อัปเกรดตารางให้รองรับ student_id ใน topics และ course_title ใน students อัตโนมัติ
(async () => {
  try {
    await pool.query(`
      ALTER TABLE topics ADD COLUMN IF NOT EXISTS student_id UUID;
      ALTER TABLE topics ALTER COLUMN course_id DROP NOT NULL;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS course_title VARCHAR(255);
    `);
  } catch (e) {
    console.error('Setup column check:', e.message);
  }
})();

// ตั้งค่าที่เก็บไฟล์
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({ storage });

// ==================== API สำหรับจัดการนักเรียน ====================

// 1. ดึงรายชื่อนักเรียนทั้งหมด
app.get('/api/students', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. เพิ่มนักเรียนใหม่
app.post('/api/students', async (req, res) => {
  try {
    const { fullName, nickname, gradeLevel, courseTitle } = req.body;
    const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const studentRes = await pool.query(
      'INSERT INTO students (full_name, nickname, grade_level, course_title, parent_access_code) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [fullName, nickname, gradeLevel, courseTitle || 'วิชาเรียนทั่วไป', accessCode]
    );

    res.json({ success: true, student: studentRes.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. แก้ไขข้อมูลนักเรียน / ชื่อวิชา
app.put('/api/students/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { fullName, nickname, gradeLevel, courseTitle } = req.body;

    const result = await pool.query(
      'UPDATE students SET full_name = $1, nickname = $2, grade_level = $3, course_title = $4 WHERE id = $5 RETURNING *',
      [fullName, nickname, gradeLevel, courseTitle, studentId]
    );
    res.json({ success: true, student: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. ลบนักเรียน
app.delete('/api/students/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    await pool.query('DELETE FROM topics WHERE student_id = $1', [studentId]);
    await pool.query('DELETE FROM student_progress WHERE student_id = $1', [studentId]);
    await pool.query('DELETE FROM students WHERE id = $1', [studentId]);
    res.json({ success: true, message: 'ลบนักเรียนเรียบร้อย' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== API สำหรับจัดการบทเรียน ====================

// 5. ดึงบทเรียนเฉพาะของนักเรียนคนนั้น
app.get('/api/students/:studentId/progress', async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await pool.query('SELECT * FROM students WHERE id = $1', [studentId]);
    if (!student.rows.length) return res.status(404).json({ success: false, error: 'ไม่พบนักเรียน' });

    const topics = await pool.query(`
      SELECT 
        t.id AS topic_id,
        t.title,
        t.sequence_order,
        sp.id AS progress_id,
        COALESCE(sp.status, 'pending') AS status,
        sp.tutor_notes,
        sp.completed_at,
        COALESCE(
          json_agg(
            json_build_object('id', a.id, 'file_url', a.file_url, 'file_type', a.file_type, 'file_name', a.file_name)
          ) FILTER (WHERE a.id IS NOT NULL), '[]'
        ) AS attachments
      FROM topics t
      LEFT JOIN student_progress sp ON t.id = sp.topic_id AND sp.student_id = $1
      LEFT JOIN attachments a ON sp.id = a.progress_id
      WHERE t.student_id = $1
      GROUP BY t.id, t.title, t.sequence_order, sp.id, sp.status, sp.tutor_notes, sp.completed_at
      ORDER BY t.sequence_order ASC
    `, [studentId]);

    res.json({ success: true, student: student.rows[0], topics: topics.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. เพิ่มบทเรียนให้นักเรียนคนนี้โดยเฉพาะ
app.post('/api/topics', async (req, res) => {
  try {
    const { title, studentId } = req.body;
    const countRes = await pool.query('SELECT COUNT(*) FROM topics WHERE student_id = $1', [studentId]);
    const nextOrder = parseInt(countRes.rows[0].count) + 1;

    const result = await pool.query(
      'INSERT INTO topics (title, sequence_order, student_id) VALUES ($1, $2, $3) RETURNING *',
      [title, nextOrder, studentId]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. แก้ไขชื่อบทเรียน
app.put('/api/topics/:topicId', async (req, res) => {
  try {
    const { topicId } = req.params;
    const { title } = req.body;
    const result = await pool.query('UPDATE topics SET title = $1 WHERE id = $2 RETURNING *', [title, topicId]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. ลบบทเรียน
app.delete('/api/topics/:topicId', async (req, res) => {
  try {
    const { topicId } = req.params;
    await pool.query('DELETE FROM student_progress WHERE topic_id = $1', [topicId]);
    await pool.query('DELETE FROM topics WHERE id = $1', [topicId]);
    res.json({ success: true, message: 'ลบหัวข้อเรียบร้อย' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. บันทึกผลการสอน + รูป/วิดีโอ/ไฟล์
app.patch('/api/progress/:studentId/:topicId', upload.array('files', 5), async (req, res) => {
  const client = await pool.connect();
  try {
    const { studentId, topicId } = req.params;
    const { status, tutorNotes } = req.body;
    await client.query('BEGIN');

    const completedAt = status === 'completed' ? new Date() : null;

    const progRes = await client.query(`
      INSERT INTO student_progress (student_id, topic_id, status, tutor_notes, completed_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (student_id, topic_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        tutor_notes = COALESCE(EXCLUDED.tutor_notes, student_progress.tutor_notes),
        completed_at = CASE WHEN EXCLUDED.status = 'completed' THEN NOW() ELSE NULL END
      RETURNING id;
    `, [studentId, topicId, status, tutorNotes, completedAt]);

    const progressId = progRes.rows[0].id;

    if (req.files && req.files.length > 0) {
      for (const f of req.files) {
        let type = 'link';
        if (f.mimetype.startsWith('image/')) type = 'image';
        else if (f.mimetype.startsWith('video/')) type = 'video';
        else if (f.mimetype.includes('pdf')) type = 'pdf';

        await client.query(
          'INSERT INTO attachments (progress_id, file_type, file_url, file_name) VALUES ($1, $2, $3, $4)',
          [progressId, type, `/uploads/${f.filename}`, f.originalname]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'บันทึกสำเร็จ' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ==================== API สำหรับผู้ปกครอง ====================
app.get('/api/parent/view/:accessCode', async (req, res) => {
  try {
    const { accessCode } = req.params;
    const sRes = await pool.query('SELECT * FROM students WHERE parent_access_code = $1', [accessCode]);
    if (!sRes.rows.length) return res.status(404).json({ success: false, error: 'รหัสติดตามไม่ถูกต้อง' });

    const student = sRes.rows[0];
    const topics = await pool.query(`
      SELECT 
        t.title,
        t.sequence_order,
        COALESCE(sp.status, 'pending') AS status,
        sp.tutor_notes,
        sp.completed_at,
        COALESCE(
          json_agg(
            json_build_object('url', a.file_url, 'type', a.file_type, 'name', a.file_name)
          ) FILTER (WHERE a.id IS NOT NULL), '[]'
        ) AS attachments
      FROM topics t
      LEFT JOIN student_progress sp ON t.id = sp.topic_id AND sp.student_id = $1
      LEFT JOIN attachments a ON sp.id = a.progress_id
      WHERE t.student_id = $1
      GROUP BY t.id, t.title, t.sequence_order, sp.status, sp.tutor_notes, sp.completed_at
      ORDER BY t.sequence_order ASC
    `, [student.id]);

    res.json({ success: true, student, topics: topics.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ระบบทำงานที่ http://localhost:${PORT}`));