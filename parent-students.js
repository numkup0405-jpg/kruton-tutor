// ===== นักเรียน / คอร์สเรียน (อ่านอย่างเดียว) + แจ้งเตือนข้อความใหม่ =====
let allStudents = [];
let currentStudentId = null;
let currentFilterGrade = 'ทั้งหมด';
let parentNotifications = {};

// แจ้งเตือนจุดแดงเมื่อติวเตอร์ส่งข้อความใหม่ที่ผู้ปกครองยังไม่ได้อ่าน
db.collection('comments').where('sender_role', '==', 'tutor').where('readByParent', '==', false).onSnapshot(snapshot => {
  parentNotifications = {};
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    parentNotifications[data.student_id] = true;
  });
  renderCourseCards(currentFilterGrade);
});

function initStudentsListener() {
  db.collection('students').onSnapshot(snapshot => {
    allStudents = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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
  const promoHtml = showPromo ? promoCourses.map(p => `
    <div class="course-card promo-card" style="position:relative;" onclick="openPromoDetail('${p.id}')">
      <span class="promo-badge-inline">✨ โปรโมท</span>
      ${p.coverImageUrl ? `<img class="promo-cover" src="${p.coverImageUrl}">` : `<div class="promo-cover-placeholder">📣</div>`}
      <div class="promo-body">
        <div class="course-title">${p.title}</div>
        <div style="font-size: 0.85rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${p.description || ''}</div>
        ${p.format ? `<span class="promo-type-tag ${p.format.toLowerCase().includes('online') ? 'online' : 'onsite'}">${p.format.toLowerCase().includes('online') ? '💻' : '📍'} ${p.format}${p.location ? ' · ' + p.location : ''}</span>` : ''}
      </div>
    </div>`).join('') : '';

  if (filteredStudents.length === 0 && !showPromo) {
    grid.innerHTML = '<div style="grid-column: 1/-1;" class="empty-state">ยังไม่มีข้อมูลคอร์สเรียนในหมวดหมู่นี้</div>';
    return;
  }
  const studentHtml = filteredStudents.map(st => {
    const hasNotif = parentNotifications[st.id] ? '<span class="notif-dot" title="มีข้อความใหม่"></span>' : '';
    return `
    <div class="course-card" onclick="openDetailView('${st.id}')">
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
  if (allStudents.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">ไม่มีข้อมูล</td></tr>'; return; }
  tbody.innerHTML = allStudents.map(st => `
    <tr onclick="openDetailView('${st.id}')">
      <td>${st.full_name}</td><td>น้อง${st.nickname}</td><td>${st.grade_level || '-'}</td><td>${st.course_title || 'ทั่วไป'}</td>
    </tr>`).join('');
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
  switchView('detailView');
  document.getElementById('chatTitleLabel').innerHTML = '💬 พูดคุยกับคุณครู';

  if (unsubTopics) unsubTopics();
  if (unsubSessions) unsubSessions();
  if (unsubComments) unsubComments();
  expandedTopics = new Set();
  loadProgress(); loadChat();
}
