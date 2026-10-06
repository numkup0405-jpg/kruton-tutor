// ===== แผนการเรียนรู้ (หัวข้อหลัก + บทเรียนย่อย) =====
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

function toggleTopicExpand(topicId) { if (expandedTopics.has(topicId)) expandedTopics.delete(topicId); else expandedTopics.add(topicId); renderTopicList(); }

function renderTopicList() {
  const list = document.getElementById('topicList');
  if (currentTopics.length === 0) { list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted); border:1px dashed var(--border); border-radius:12px;">คลิกปุ่ม "+ เพิ่มหัวข้อหลัก" เพื่อเริ่มต้น</div>'; return; }
  list.innerHTML = currentTopics.map(t => {
    const sessions = currentSessions.filter(s => s.topic_id === t.topic_id);
    const isOpen = expandedTopics.has(t.topic_id);
    const doneCount = sessions.filter(s => s.status === 'completed').length;
    const sessionsHtml = sessions.map(s => {
      const status = s.status || 'pending';
      let filesHtml = (s.attachments && s.attachments.length > 0) ? '<div style="margin-top: 8px;">' + s.attachments.map(a => `<a href="${a.file_url}" target="_blank" style="font-size: 0.75rem; padding: 4px 10px; background: #f1f5f9; border-radius: 6px; text-decoration: none; color: #475569; margin-right: 4px;">${a.file_type === 'pdf' ? '📄' : '📎'} ${a.file_name}</a>`).join('') + '</div>' : '';

      let noteHtml = s.tutor_notes ? `
        <div class="note-box-container">
          <div class="note-box-header" onclick="toggleNoteBox(this)">
            <span>📝 บันทึกจากคุณครู (คลิกเพื่อพับ/ขยาย)</span>
            <span class="note-arrow" style="transition: transform 0.2s;">▶</span>
          </div>
          <div class="note-box-content">${s.tutor_notes}</div>
        </div>` : '';

      return `
        <div class="topic-card-item" style="padding-left: 8px;">
          <div class="topic-left">
            <div class="badge-num" style="background:#eff6ff; color:var(--primary);">${s.sequence_order}</div>
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 6px;">
                <b style="font-size: 0.95rem;">${s.title}</b>
                <select class="status-select-pill ${status}" onchange="changeSessionStatus('${s.session_id}', this.value)">
                  <option value="pending" ${status === 'pending' ? 'selected' : ''}>รอดำเนินการ</option>
                  <option value="in_progress" ${status === 'in_progress' ? 'selected' : ''}>กำลังเรียน</option>
                  <option value="completed" ${status === 'completed' ? 'selected' : ''}>ผ่านเกณฑ์</option>
                </select>
                <button class="action-link" onclick="editSessionName('${s.session_id}', '${s.title}')">✏️</button>
                <button class="action-link delete" onclick="deleteSession('${s.session_id}')">🗑️</button>
              </div>
              ${noteHtml}${filesHtml}
            </div>
          </div>
          <div><button class="btn btn-outline" style="font-size: 0.8rem; padding: 6px 12px;" onclick="openUpdateModal('${s.session_id}')">📝 อัปเดตผล</button></div>
        </div>`;
    }).join('') || '<div style="padding: 12px 0 12px 44px; color: var(--text-muted); font-size: 0.85rem;">ยังไม่มีบทเรียนย่อย กด "+ เพิ่มบทเรียนย่อย"</div>';

    return `
      <div style="border: 1px solid var(--border); border-radius: 12px; margin-bottom: 12px; overflow: hidden;">
        <div style="display:flex; align-items:center; justify-content:space-between; padding: 14px 16px; background:#f8fafc; cursor:pointer;" onclick="toggleTopicExpand('${t.topic_id}')">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="transition:0.2s; display:inline-block; transform: rotate(${isOpen ? '90deg' : '0deg'});">▶</span>
            <b style="font-size: 1rem;">📁 ${t.title}</b>
            <span class="tag" style="margin:0;">${doneCount}/${sessions.length} บทเรียน</span>
          </div>
          <div style="display:flex; gap:4px;" onclick="event.stopPropagation();">
            <button class="btn btn-outline" style="font-size:0.78rem; padding:5px 10px;" onclick="addSessionPrompt('${t.topic_id}')">+ เพิ่มบทเรียนย่อย</button>
            <button class="action-link" onclick="editTopicName('${t.topic_id}', '${t.title}')">✏️</button>
            <button class="action-link delete" onclick="deleteTopic('${t.topic_id}')">🗑️</button>
          </div>
        </div>
        ${isOpen ? `<div style="padding: 4px 16px;">${sessionsHtml}</div>` : ''}
      </div>`;
  }).join('');
}

async function addTopicPrompt() {
  const title = prompt('กำหนดหัวข้อหลัก (เช่น ชื่อบท/หน่วยการเรียน):');
  if (!title) return;
  const docRef = await db.collection('topics').add({ student_id: currentStudentId, title, sequence_order: currentTopics.length + 1, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  expandedTopics.add(docRef.id);
}
async function editTopicName(topicId, oldTitle) { const title = prompt('แก้ไขชื่อหัวข้อหลัก:', oldTitle); if (!title || title === oldTitle) return; await db.collection('topics').doc(topicId).update({ title }); }
async function deleteTopic(topicId) {
  if (!confirm('ยืนยันลบหัวข้อหลักนี้? บทเรียนย่อยทั้งหมดข้างในจะถูกลบไปด้วย')) return;
  const sessSnap = await db.collection('topicSessions').where('topic_id', '==', topicId).get();
  const batch = db.batch();
  sessSnap.forEach(d => batch.delete(d.ref));
  batch.delete(db.collection('topics').doc(topicId));
  await batch.commit();
}

async function addSessionPrompt(topicId) {
  const title = prompt('ชื่อบทเรียนย่อย (เช่น เนื้อหาที่เรียนวันนี้):');
  if (!title) return;
  const count = currentSessions.filter(s => s.topic_id === topicId).length;
  await db.collection('topicSessions').add({ student_id: currentStudentId, topic_id: topicId, title, status: 'pending', sequence_order: count + 1, tutor_notes: '', attachments: [], createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  expandedTopics.add(topicId);
}
async function editSessionName(sessionId, oldTitle) { const title = prompt('แก้ไขชื่อบทเรียนย่อย:', oldTitle); if (!title || title === oldTitle) return; await db.collection('topicSessions').doc(sessionId).update({ title }); }
async function deleteSession(sessionId) { if (!confirm('ยืนยันลบบทเรียนย่อยนี้?')) return; await db.collection('topicSessions').doc(sessionId).delete(); }
async function changeSessionStatus(sessionId, newStatus) { await db.collection('topicSessions').doc(sessionId).update({ status: newStatus }); }

function openUpdateModal(sessionId) {
  const s = currentSessions.find(x => x.session_id === sessionId);
  document.getElementById('modalTopicId').value = sessionId;
  document.getElementById('modalTutorNotes').value = s ? (s.tutor_notes || '') : '';
  document.getElementById('modalFiles').value = '';
  document.getElementById('updateModal').style.display = 'flex';
}
function closeUpdateModal() { document.getElementById('updateModal').style.display = 'none'; }

async function saveTopicDetails() {
  const sessionId = document.getElementById('modalTopicId').value;
  const notes = document.getElementById('modalTutorNotes').value;
  const filesInput = document.getElementById('modalFiles');
  const btn = document.getElementById('saveModalBtn');
  const s = currentSessions.find(x => x.session_id === sessionId);

  btn.disabled = true; btn.innerText = 'กำลังอัปโหลดเข้า Drive...';
  try {
    const newAttachments = [];
    for (let i = 0; i < filesInput.files.length; i++) {
      const file = filesInput.files[i];
      const url = await uploadFileToDrive(file);
      newAttachments.push({ file_name: file.name, file_url: url, file_type: file.type === 'application/pdf' ? 'pdf' : 'image' });
    }
    const updateData = { status: s ? (s.status || 'pending') : 'pending', tutor_notes: notes };
    if (newAttachments.length > 0) { updateData.attachments = firebase.firestore.FieldValue.arrayUnion(...newAttachments); }
    await db.collection('topicSessions').doc(sessionId).update(updateData);
  } catch (err) { alert('บันทึกไม่สำเร็จ: ' + err.message); }
  btn.disabled = false; btn.innerText = 'บันทึก';
  closeUpdateModal();
}
