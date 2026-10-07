// ===== ช่องทางติดต่อผู้ปกครอง (แชท) =====
let unsubComments = null;

function loadTutorChat() {
  if (!currentStudentId) return;
  unsubComments = db.collection('comments').where('student_id', '==', currentStudentId).onSnapshot(snapshot => {
    const comments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    comments.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    renderChat(comments);

    // มาร์คข้อความจากผู้ปกครองว่าติวเตอร์อ่านแล้ว เมื่อเปิดหน้าแชทของนักเรียนคนนี้
    comments.forEach(c => {
      if (c.sender_role === 'parent' && c.readByTutor === false) {
        db.collection('comments').doc(c.id).update({ readByTutor: true });
      }
    });
  });
}
function renderChat(comments) {
  const box = document.getElementById('tutorChatBox');
  if (comments.length === 0) { box.innerHTML = '<div style="text-align:center; color: var(--text-muted); padding: 10px 0;">ยังไม่มีข้อความ</div>'; return; }
  box.innerHTML = comments.map(c => `<div class="chat-msg ${c.sender_role}"><div style="font-size:0.75rem; font-weight:600; margin-bottom:2px;">${c.sender_name}</div><div>${c.message}</div></div>`).join('');
  box.scrollTop = box.scrollHeight;
}
async function sendTutorComment() {
  const input = document.getElementById('tutorMsgInput');
  const msg = input.value.trim();
  if (!msg || !currentStudentId) return;
  await db.collection('comments').add({ student_id: currentStudentId, sender_role: 'tutor', sender_name: 'คุณครู', message: msg, readByParent: false, readByTutor: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  input.value = '';
}
