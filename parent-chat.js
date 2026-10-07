// ===== พูดคุยกับคุณครู =====
let unsubComments = null;

function loadChat() {
  unsubComments = db.collection('comments').where('student_id', '==', currentStudentId).onSnapshot(snapshot => {
    const comments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    comments.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    renderChat(comments);

    comments.forEach(c => {
      if (c.sender_role === 'tutor' && c.readByParent === false) {
        db.collection('comments').doc(c.id).update({ readByParent: true });
      }
    });
  });
}
function renderChat(comments) {
  const box = document.getElementById('tutorChatBox');
  if (comments.length === 0) { box.innerHTML = '<div class="empty-state" style="padding:12px 0;">ยังไม่มีข้อความ</div>'; return; }
  box.innerHTML = comments.map(c => `
    <div class="chat-msg ${c.sender_role === 'tutor' ? 'tutor' : 'parent'}">
      <div style="font-size:0.72rem; font-weight:600; margin-bottom:2px; opacity:0.8;">${c.sender_name}</div>
      <div>${c.message}</div>
    </div>`).join('');
  box.scrollTop = box.scrollHeight;
}
async function sendParentComment() {
  const input = document.getElementById('tutorMsgInput');
  const msg = input.value.trim();
  if (!msg || !currentStudentId) return;
  await db.collection('comments').add({
    student_id: currentStudentId, sender_role: 'parent', sender_name: 'ผู้ปกครอง',
    message: msg,
    readByParent: true,
    readByTutor: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  input.value = '';
}
