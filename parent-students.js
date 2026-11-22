// ===== นักเรียน / คอร์สเรียน (อ่านอย่างเดียว) =====
// ประกอบด้วย: ค้นหา/เรียงลำดับ, สลับมุมมองการ์ด-รายการ, กระดิ่งแจ้งเตือนข้อความใหม่จากคุณครู, Quick Stats
let allStudents = [];
let currentStudentId = null;
let currentFilterGrade = 'ทั้งหมด';
let parentNotifications = {};   // student_id -> true  (ใช้กับจุดแดงบนการ์ด)
let unreadByStudent = {};       // student_id -> { count, message, seconds }  (ใช้กับกระดิ่ง + Quick Stats)
let searchQuery = '';
let sortMode = 'newest';
let viewMode = 'grid';          // 'grid' = การ์ด, 'list' = รายการ
try { viewMode = localStorage.getItem('parentCourseViewMode') === 'list' ? 'list' : 'grid'; } catch (e) {}

// เรียกทุกครั้งที่พิมพ์ในช่องค้นหา หรือเปลี่ยนตัวเลือกเรียงลำดับ
function onCourseFilterChange() {
  searchQuery = document.getElementById('courseSearchInput').value.trim().toLowerCase();
  sortMode = document.getElementById('courseSortSelect').value;
  renderCourseCards(currentFilterGrade);
}

// ===== สลับมุมมอง การ์ด / รายการ =====
function setViewMode(mode) {
  viewMode = mode === 'list' ? 'list' : 'grid';
  try { localStorage.setItem('parentCourseViewMode', viewMode); } catch (e) {}
  updateViewToggleButtons();
  renderCourseCards(currentFilterGrade);
}
function updateViewToggleButtons() {
  const g = document.getElementById('viewGridBtn');
  const l = document.getElementById('viewListBtn');
  if (g) g.classList.toggle('active', viewMode === 'grid');
  if (l) l.classList.toggle('active', viewMode === 'list');
}
updateViewToggleButtons();

// ===== กระดิ่งแจ้งเตือน =====
function toggleBellPanel() {
  const p = document.getElementById('bellPanel');
  if (p) p.classList.toggle('open');
}
function closeBell() {
  const p = document.getElementById('bellPanel');
  if (p) p.classList.remove('open');
}
function openBellItem(studentId) {
  closeBell();
  openDetailView(studentId);
}
document.addEventListener('click', e => {
  const wrap = document.querySelector('.bell-wrap');
  if (wrap && !wrap.contains(e.target)) closeBell();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeBell(); });

// รายการนักเรียนที่มีข้อความใหม่จากคุณครู (ใหม่สุดก่อน) ใช้ร่วมกันทั้งกระดิ่งและ Quick Stats
function getUnreadEntries() {
  return Object.entries(unreadByStudent)
    .map(([sid, u]) => ({ sid, u, st: allStudents.find(x => x.id === sid) }))
    .filter(e => e.st)
    .sort((a, b) => b.u.seconds - a.u.seconds);
}

// ===== Quick Stats (แถบตัวเลขสรุปบนหน้าแรก) =====
function renderQuickStats() {
  const unread = getUnreadEntries().length;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('statStudents', allStudents.length);
  set('statUnread', unread);
  set('statPromo', promoCourses.length);
  const card = document.getElementById('statUnreadCard');
  if (card) card.classList.toggle('stat-alert', unread > 0);
}

// กดการ์ด "ข้อความใหม่" → เรียงคนที่มีข้อความใหม่ไว้บนสุด แล้วเลื่อนลงไปดูรายการ
function showUnreadFirst() {
  const sel = document.getElementById('courseSortSelect');
  if (sel) sel.value = 'unread';
  onCourseFilterChange();
  const grid = document.getElementById('courseGrid');
  if (grid && grid.scrollIntoView) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderBell() {
  const panel = document.getElementById('bellPanel');
  const badge = document.getElementById('bellBadge');
  if (!panel || !badge) return;
  const entries = getUnreadEntries();
  const n = entries.length;
  badge.style.display = n ? 'flex' : 'none';
  badge.textContent = n > 9 ? '9+' : String(n);
  document.title = (n ? `(${n}) ` : '') + 'Kruton Tutor - สำหรับผู้ปกครอง';

  const items = entries.map(({ sid, u, st }) => {
    const when = u.seconds ? new Date(u.seconds * 1000).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    const msg = u.message.length > 70 ? u.message.slice(0, 70) + '…' : u.message;
    return `
      <div class="bell-item" onclick="openBellItem('${sid}')">
        <div class="bell-item-top">
          <span>👤 น้อง${escapeHtml(st.nickname)} · ${escapeHtml(st.course_title || 'ทั่วไป')}</span>
          ${u.count > 1 ? `<span class="bell-count">${u.count}</span>` : ''}
        </div>
        <div class="bell-item-msg">${escapeHtml(msg)}</div>
        <div class="bell-item-time">${when}</div>
      </div>`;
  }).join('');
  panel.innerHTML = '<div class="bell-head">🔔 ข้อความใหม่จากคุณครู</div>' +
    (n ? items : '<div class="bell-empty">ไม่มีข้อความใหม่ 🎉</div>');
}

// แจ้งเตือนจุดแดงเมื่อติวเตอร์ส่งข้อความใหม่ที่ผู้ปกครองยังไม่ได้อ่าน
// (เรียกจาก parent-firebase-init.js หลังจาก Firebase พร้อมใช้งานแล้วเท่านั้น)
function initNotificationListener() {
  db.collection('comments').where('sender_role', '==', 'tutor').where('readByParent', '==', false).onSnapshot(snapshot => {
    parentNotifications = {};
    unreadByStudent = {};
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const sid = data.student_id;
      parentNotifications[sid] = true;
      const secs = data.createdAt?.seconds || 0;
      const u = unreadByStudent[sid] || (unreadByStudent[sid] = { count: 0, message: '', seconds: -1 });
      u.count++;
      if (secs >= u.seconds) { u.seconds = secs; u.message = data.message || ''; }   // เก็บข้อความล่าสุดไว้โชว์
    });
    renderCourseCards(currentFilterGrade);
    renderBell();
  });
}

function initStudentsListener() {
  db.collection('students').onSnapshot(snapshot => {
    allStudents = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    allStudents.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));   // เพิ่มล่าสุดก่อน
    renderCourseCards(currentFilterGrade); renderHistoryTable(); renderBell();
  });
}

function filterByGrade(grade) {
  currentFilterGrade = grade;
  switchView('dashboardView', document.getElementById('menu-dashboard'));
  document.getElementById('courseListTitle').innerText = grade === 'ทั้งหมด' ? 'คอร์สที่ปรากฏ (ทั้งหมด)' : `คอร์สที่ปรากฏ (ระดับชั้น ${grade})`;
  renderCourseCards(grade);
}

function promoRowHtml(p) {
  const isOnline = (p.format || '').toLowerCase().includes('online');
  const tag = p.format ? `<span class="promo-type-tag ${isOnline ? 'online' : 'onsite'}" style="margin-top:0;">${isOnline ? '💻' : '📍'} ${escapeHtml(p.format)}${p.location ? ' · ' + escapeHtml(p.location) : ''}</span>` : '';
  return `
    <div class="course-row promo-row" onclick="openPromoDetail('${p.id}')">
      <span class="row-badge">✨ โปรโมท</span>
      <div class="row-main">
        <div class="row-title">${escapeHtml(p.title || 'คอร์สโปรโมท')}</div>
        <div class="row-sub">${escapeHtml(p.description || '')}</div>
      </div>
      ${tag}
    </div>`;
}

function studentRowHtml(st, hasNotif) {
  return `
    <div class="course-row" onclick="openDetailView('${st.id}')">
      <div class="row-main">
        <div class="row-title">${escapeHtml(st.course_title || 'คอร์สเรียนทั่วไป')}${hasNotif}</div>
        <div class="row-sub">👤 น้อง${escapeHtml(st.nickname)} (${escapeHtml(st.full_name)})</div>
      </div>
      <span class="row-grade">ชั้น: ${escapeHtml(st.grade_level || '-')}</span>
      <span class="row-go">ดูรายละเอียด ➜</span>
    </div>`;
}

function renderCourseCards(grade = 'ทั้งหมด') {
  const grid = document.getElementById('courseGrid');
  grid.className = viewMode === 'list' ? 'course-list' : 'course-grid';
  renderQuickStats();

  let filteredStudents = allStudents;
  if (grade !== 'ทั้งหมด') filteredStudents = allStudents.filter(st => st.grade_level && st.grade_level.includes(grade));

  // ค้นหา: ชื่อเล่น / ชื่อ-นามสกุล / ชื่อคอร์ส / ระดับชั้น
  const matches = (...vals) => vals.some(v => v && String(v).toLowerCase().includes(searchQuery));
  if (searchQuery) filteredStudents = filteredStudents.filter(st => matches(st.nickname, st.full_name, st.course_title, st.grade_level));

  // เรียงลำดับ (ค่าเริ่มต้น 'newest' คือเรียงตามที่ดึงมาแล้ว = เพิ่มล่าสุดก่อน)
  filteredStudents = [...filteredStudents];
  if (sortMode === 'unread') {
    filteredStudents.sort((a, b) => (parentNotifications[b.id] ? 1 : 0) - (parentNotifications[a.id] ? 1 : 0));
  } else if (sortMode === 'name') {
    filteredStudents.sort((a, b) => (a.nickname || '').localeCompare(b.nickname || '', 'th'));
  }

  const visiblePromos = searchQuery ? promoCourses.filter(p => matches(p.title, p.description)) : promoCourses;
  const showPromo = grade === 'ทั้งหมด' && visiblePromos.length > 0;
  const promoHtml = showPromo ? visiblePromos.map(p => viewMode === 'list' ? promoRowHtml(p) : `
    <div class="course-card promo-card" style="position:relative;" onclick="openPromoDetail('${p.id}')">
      <span class="promo-badge-inline">✨ โปรโมท</span>
      ${p.coverImageUrl ? `<img class="promo-cover" src="${escapeHtml(p.coverImageUrl)}">` : `<div class="promo-cover-placeholder">📣</div>`}
      <div class="promo-body">
        <div class="course-title">${escapeHtml(p.title)}</div>
        <div style="font-size: 0.85rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${escapeHtml(p.description || '')}</div>
        ${p.format ? `<span class="promo-type-tag ${p.format.toLowerCase().includes('online') ? 'online' : 'onsite'}">${p.format.toLowerCase().includes('online') ? '💻' : '📍'} ${escapeHtml(p.format)}${p.location ? ' · ' + escapeHtml(p.location) : ''}</span>` : ''}
      </div>
    </div>`).join('') : '';

  if (filteredStudents.length === 0 && !showPromo) {
    grid.innerHTML = '<div style="grid-column: 1/-1;" class="empty-state">' + (searchQuery ? 'ไม่พบนักเรียนหรือคอร์สที่ค้นหา' : 'ยังไม่มีข้อมูลคอร์สเรียนในหมวดหมู่นี้') + '</div>';
    return;
  }
  const studentHtml = filteredStudents.map(st => {
    const hasNotif = parentNotifications[st.id] ? '<span class="notif-dot" title="มีข้อความใหม่"></span>' : '';
    if (viewMode === 'list') return studentRowHtml(st, hasNotif);
    return `
    <div class="course-card" onclick="openDetailView('${st.id}')">
      <div class="course-title">${escapeHtml(st.course_title || 'คอร์สเรียนทั่วไป')}${hasNotif}</div>
      <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 12px;">👤 น้อง${escapeHtml(st.nickname)} (${escapeHtml(st.full_name)})</div>
      <div style="font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid #f1f5f9;">
        <span style="background: #f1f5f9; padding: 4px 8px; border-radius: 6px;">ชั้น: ${escapeHtml(st.grade_level || '-')}</span>
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
