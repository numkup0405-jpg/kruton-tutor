// ===== แผนการเรียนรู้ & ความคืบหน้า (อ่านอย่างเดียว) =====
let currentTopics = [];
let currentSessions = [];
let expandedTopics = new Set();
let unsubTopics = null;
let unsubSessions = null;

function loadProgress() {
  unsubTopics = db.collection('topics').where('student_id', '==', currentStudentId).onSnapshot(snapshot => {
    currentTopics = snapshot.docs.map(d => ({ topic_id: d.id, ...d.data() }));
    currentTopics.sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));
    renderTopicList();
  });
  unsubSessions = db.collection('topicSessions').where('student_id', '==', currentStudentId).onSnapshot(snapshot => {
    currentSessions = snapshot.docs.map(d => ({ session_id: d.id, ...d.data() }));
    currentSessions.sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));
    renderTopicList();
  });
}

function toggleTopicExpand(id) { if (expandedTopics.has(id)) expandedTopics.delete(id); else expandedTopics.add(id); renderTopicList(); }

function renderTopicList() {
  const list = document.getElementById('topicList');
  if (currentTopics.length === 0) { list.innerHTML = '<div class="empty-state">ยังไม่มีข้อมูลแผนการเรียน</div>'; return; }
  list.innerHTML = currentTopics.map(t => {
    const sessions = currentSessions.filter(s => s.topic_id === t.topic_id);
    const isOpen = expandedTopics.has(t.topic_id);
    const doneCount = sessions.filter(s => s.status === 'completed').length;
    const sessionsHtml = sessions.map(s => {
      const status = s.status || 'pending';
      const filesHtml = (s.attachments && s.attachments.length > 0) ? '<div style="margin-top:8px;">' + s.attachments.map(a => `<a href="${a.file_url}" target="_blank" style="font-size:0.78rem; padding:4px 10px; background:#eff6ff; color:var(--primary); border-radius:6px; text-decoration:none; margin-right:6px; display:inline-block; margin-top:4px;">${a.file_type === 'pdf' ? '📄' : '🖼️'} ${a.file_name}</a>`).join('') + '</div>' : '';

      let dateHtml = s.updatedAt ? `<span class="note-date">${s.updatedAt}</span>` : '';
      let noteHtml = s.tutor_notes || dateHtml ? `
        <div class="note-box-container">
          <div class="note-box-header" onclick="toggleNoteBox(this)">
            <span>📝 บันทึกจากคุณครู (คลิกเพื่อพับ/ขยาย)</span>
            <span class="note-arrow" style="transition: transform 0.2s;">▶</span>
          </div>
          <div class="note-box-content">${dateHtml}${s.tutor_notes}</div>
        </div>` : '';

      return `<div class="session-item">
        <div style="display:flex; align-items:center; flex-wrap:wrap; gap:8px;">
          <b style="font-size:0.92rem;">${s.title}</b><span class="status-pill ${status}">${statusLabel(status)}</span>
        </div>${noteHtml}${filesHtml}</div>`;
    }).join('') || '<div class="session-item" style="color:var(--text-muted); font-size:0.85rem;">ยังไม่มีบทเรียนย่อยในหัวข้อนี้</div>';
    return `<div class="topic-folder">
      <div class="topic-folder-header" onclick="toggleTopicExpand('${t.topic_id}')">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="display:inline-block; transform: rotate(${isOpen ? '90deg' : '0deg'});">▶</span>
          <b>📁 ${t.title}</b><span class="tag" style="margin:0;">${doneCount}/${sessions.length} บทเรียน</span>
        </div>
      </div>
      ${isOpen ? `<div>${sessionsHtml}</div>` : ''}
    </div>`;
  }).join('');
}
