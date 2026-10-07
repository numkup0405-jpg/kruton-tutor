// ===== นักเรียน / คอร์สเรียน =====
let currentStudentId = null;
let allStudents = [];
let currentFilterGrade = 'ทั้งหมด';
let tutorNotifications = {};

// แจ้งเตือนจุดแดงเมื่อผู้ปกครองส่งข้อความใหม่ที่ติวเตอร์ยังไม่ได้อ่าน
// (เรียกจาก firebase-init.js หลังจาก Firebase พร้อมใช้งานแล้วเท่านั้น)
function initNotificationListener() {
  db.collection('comments').where('sender_role', '==', 'parent').where('readByTutor', '==', false).onSnapshot(snapshot => {
    tutorNotifications = {};
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      tutorNotifications[data.student_id] = true;
    });
    renderCourseCards(currentFilterGrade);
  });
}

function initStudentsListener() {
  db.collection('students').onSnapshot(snapshot => {
    allStudents = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    allStudents.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    renderCourseCards(currentFilterGrade); renderHistoryTable();
  });
}

function filterByGrade(grade) {
  currentFilterGrade = grade;
  switchView('dashboardView', document.getElementById('menu-dashboard'));
  document.getElementById('courseListTitle').innerText = grade === 'ทั้งหมด' ? 'คอร์สที่ปรากฏ (ทั้งหมด)' : `คอร์สที่ปรากฏ (ระดับชั้น ${grade})`;
  renderCourseCards(grade);
}

function renderCourseCards(grade = 'ทั้งหมด') {
  const grid = document.getElementById('courseGrid');
  let filteredStudents = allStudents;
  if (grade !== 'ทั้งหมด') filteredStudents = allStudents.filter(st => st.grade_level && st.grade_level.includes(grade));

  const showPromo = grade === 'ทั้งหมด' && promoCourses.length > 0;
  let promoHtml = showPromo ? promoCourses.map(p => `
    <div class="course-card promo-card" style="position:relative;" onclick="openPromoDetail('${p.id}')">
      <span class="promo-badge-inline">✨ โปรโมท</span>
      ${p.coverImageUrl ? `<img class="promo-cover" src="${formatImageUrl(p.coverImageUrl)}">` : `<div class="promo-cover-placeholder">📣</div>`}
      <div class="promo-body">
        <div class="course-title">${p.title || 'คอร์สโปรโมท'}</div>
        <div style="font-size: 0.85rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${p.description || ''}</div>
        ${p.format ? `<span class="promo-type-tag ${p.format.toLowerCase().includes('online') ? 'online' : 'onsite'}">${p.format.toLowerCase().includes('online') ? '💻' : '📍'} ${p.format}${p.location ? ' · ' + p.location : ''}</span>` : ''}
      </div>
    </div>`).join('') : '';

  if (filteredStudents.length === 0 && !showPromo) {
    grid.innerHTML = '<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-muted); background: white; border-radius: 16px;">ยังไม่มีข้อมูลคอร์สเรียน</div>';
    return;
  }
  const studentHtml = filteredStudents.map(st => {
    const hasNotif = tutorNotifications[st.id] ? '<span class="notif-dot" title="มีข้อความใหม่จากผู้ปกครอง"></span>' : '';
    return `
    <div class="course-card" style="position:relative;" onclick="openDetailView('${st.id}')">
      <button class="quick-edit-btn" onclick="event.stopPropagation(); quickEditStudent('${st.id}')" title="แก้ไขด่วน">✏️</button>
      <div class="course-title">${st.course_title || 'คอร์สเรียนทั่วไป'}${hasNotif}</div>
      <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 12px;">👤 น้อง${st.nickname} (${st.full_name})</div>
      <div style="font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid #f1f5f9;">
        <span style="background: #f1f5f9; padding: 4px 8px; border-radius: 6px;">ชั้น: ${st.grade_level || '-'}</span>
        <span style="color: var(--primary); font-weight: 600;">ดูรายละเอียด ➜</span>
      </div>
    </div>`;
  }).join('');
  grid.innerHTML = promoHtml + studentHtml;
}

function renderHistoryTable() {
  const tbody = document.getElementById('historyTableBody');
  if (allStudents.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">ไม่มีข้อมูล</td></tr>'; return; }
  tbody.innerHTML = allStudents.map(st => `
    <tr onclick="openDetailView('${st.id}')">
      <td style="font-weight: 600; color: var(--primary);">${st.parent_access_code}</td>
      <td>${st.full_name}</td><td>น้อง${st.nickname}</td><td>${st.grade_level || '-'}</td><td>${st.course_title || 'ทั่วไป'}</td>
      <td><button class="btn btn-outline" style="font-size: 0.75rem; padding: 4px 8px;">ดูข้อมูล</button></td>
    </tr>`).join('');
}

async function quickEditStudent(id) {
  const st = allStudents.find(s => s.id === id);
  if (!st) return;
  const nickname = prompt('แก้ไขชื่อเล่น:', st.nickname);
  const fullName = prompt('แก้ไขชื่อ-นามสกุล:', st.full_name);
  const gradeLevel = prompt('แก้ไขระดับชั้น:', st.grade_level);
  const courseTitle = prompt('แก้ไขวิชาคอร์ส:', st.course_title);
  if (nickname) { await db.collection('students').doc(id).update({ nickname, full_name: fullName, grade_level: gradeLevel, course_title: courseTitle }); }
}

async function openAddStudent() {
  const nickname = prompt('ชื่อเล่นนักเรียน:');
  if (!nickname) return;
  const fullName = prompt('ชื่อ-นามสกุลจริง:');
  const gradeLevel = prompt('ระดับชั้น (เช่น ป.1, ม.3):');
  const courseTitle = prompt('ชื่อคอร์สที่เรียน (เช่น คณิตศาสตร์ ป.3):');
  const docRef = await db.collection('students').add({ nickname, full_name: fullName || nickname, grade_level: gradeLevel || 'ทั่วไป', course_title: courseTitle || 'คอร์สเรียนทั่วไป', parent_access_code: generateAccessCode(), createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  openDetailView(docRef.id);
}

function openDetailView(id) {
  if (!id) return;
  currentStudentId = id;
  const st = allStudents.find(s => s.id === id);
  if (!st) return;
  document.getElementById('stAvatar').innerText = st.nickname.charAt(0);
  document.getElementById('stFullName').innerText = `${st.full_name} (น้อง${st.nickname})`;
  document.getElementById('stGrade').innerText = st.grade_level || '-';
  document.getElementById('stCourse').innerText = st.course_title || 'ทั่วไป';
  document.getElementById('stCode').innerText = st.parent_access_code;
  switchView('detailView');
  if (unsubTopics) unsubTopics();
  if (unsubSessions) unsubSessions();
  if (unsubComments) unsubComments();
  expandedTopics = new Set();
  loadProgress(); loadTutorChat();
}

async function editCurrentStudent() {
  const st = allStudents.find(s => s.id === currentStudentId);
  if (!st) return;
  const nickname = prompt('แก้ไขชื่อเล่น:', st.nickname);
  const fullName = prompt('แก้ไขชื่อ-นามสกุล:', st.full_name);
  const gradeLevel = prompt('แก้ไขระดับชั้น:', st.grade_level);
  const courseTitle = prompt('แก้ไขวิชาคอร์ส:', st.course_title);
  if (nickname) { await db.collection('students').doc(currentStudentId).update({ nickname, full_name: fullName, grade_level: gradeLevel, course_title: courseTitle }); openDetailView(currentStudentId); }
}

async function deleteCurrentStudent() {
  if (!confirm('ยืนยันการลบคอร์ส/นักเรียนคนนี้พร้อมข้อมูลทั้งหมดหรือไม่?')) return;
  const topicsSnap = await db.collection('topics').where('student_id', '==', currentStudentId).get();
  const sessionsSnap = await db.collection('topicSessions').where('student_id', '==', currentStudentId).get();
  const commentsSnap = await db.collection('comments').where('student_id', '==', currentStudentId).get();
  const batch = db.batch();
  topicsSnap.forEach(d => batch.delete(d.ref));
  sessionsSnap.forEach(d => batch.delete(d.ref));
  commentsSnap.forEach(d => batch.delete(d.ref));
  batch.delete(db.collection('students').doc(currentStudentId));
  await batch.commit();
  switchView('dashboardView', document.getElementById('menu-dashboard'));
}
