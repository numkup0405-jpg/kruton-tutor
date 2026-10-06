// ===== คอร์สโปรโมท =====
let promoCourses = [];
let currentPromoId = null;

function initPromoListener() {
  db.collection('promoCourses').onSnapshot(snapshot => {
    promoCourses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    promoCourses.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    renderCourseCards(currentFilterGrade);
  });
}

let isAddingPromo = false;
async function openAddPromo() {
  if (isAddingPromo) return;
  isAddingPromo = true;
  try {
    const title = prompt('ชื่อคอร์สที่จะโปรโมท:');
    if (!title) { isAddingPromo = false; return; }
    const description = prompt('คำอธิบายคอร์ส:') || '';
    const location = prompt('สถานที่เรียน:') || '';
    const format = prompt('รูปแบบการเรียน พิมพ์ "online" หรือ "onsite":', 'onsite') || '';
    const videoUrl = prompt('ลิงก์วิดีโอแนะนำ:') || '';
    await db.collection('promoCourses').add({ title, description, videoUrl, location, format, coverImageUrl: null, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    currentFilterGrade = 'ทั้งหมด';
    document.getElementById('courseListTitle').innerText = 'คอร์สที่ปรากฏ (ทั้งหมด)';
    switchView('dashboardView', document.getElementById('menu-dashboard'));
  } catch (err) { alert('เพิ่มไม่สำเร็จ: ' + err.message); }
  isAddingPromo = false;
}

function getYoutubeEmbedUrl(url) {
  if (!url) return null;
  const patterns = [ /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/ ];
  for (const p of patterns) { const m = url.match(p); if (m) return `https://www.youtube.com/embed/${m[1]}`; }
  return null;
}

function openPromoDetail(id) {
  currentPromoId = id;
  const p = promoCourses.find(x => x.id === id);
  if (!p) return;
  document.getElementById('promoDetailTitle').innerText = p.title;
  document.getElementById('promoDetailDesc').innerText = p.description || '';
  const typeBox = document.getElementById('promoDetailType');
  if (p.format) { const isOnline = p.format.toLowerCase().includes('online'); typeBox.innerHTML = `<span class="promo-type-tag ${isOnline ? 'online' : 'onsite'}">${isOnline ? '💻' : '📍'} ${p.format}${p.location ? ' · ' + p.location : ''}</span>`; } else { typeBox.innerHTML = ''; }
  const coverImg = document.getElementById('promoDetailCover');
  if (p.coverImageUrl) { coverImg.src = formatImageUrl(p.coverImageUrl); coverImg.style.display = 'block'; } else { coverImg.style.display = 'none'; }
  const videoBox = document.getElementById('promoDetailVideoBox');
  const embedUrl = getYoutubeEmbedUrl(p.videoUrl);
  if (embedUrl) { videoBox.innerHTML = `<iframe class="promo-video-frame" src="${embedUrl}" allowfullscreen></iframe>`; } else if (p.videoUrl) { videoBox.innerHTML = `<a href="${p.videoUrl}" target="_blank" class="btn btn-outline" style="display:inline-block; margin-bottom:16px;">🔗 เปิดลิงก์ที่เกี่ยวข้อง</a>`; } else { videoBox.innerHTML = ''; }
  document.getElementById('promoDetailModal').style.display = 'flex';
}
function closePromoDetailModal() { document.getElementById('promoDetailModal').style.display = 'none'; document.getElementById('promoDetailVideoBox').innerHTML = ''; }

async function promptPromoUrl() {
  const url = prompt('วางลิงก์รูปภาพปกคอร์สที่นี่:');
  if (!url || !currentPromoId) return;
  try {
    await db.collection('promoCourses').doc(currentPromoId).update({ coverImageUrl: url.trim() });
    document.getElementById('promoDetailCover').src = formatImageUrl(url.trim());
    document.getElementById('promoDetailCover').style.display = 'block';
    alert('เปลี่ยนรูปปกสำเร็จ!');
  } catch (err) { alert('อัปเดตไม่สำเร็จ: ' + err.message); }
}

async function editPromoCourse() {
  const p = promoCourses.find(x => x.id === currentPromoId);
  if (!p) return;
  const title = prompt('แก้ไขชื่อคอร์ส:', p.title);
  if (!title) return;
  const description = prompt('แก้ไขคำอธิบาย:', p.description || '');
  const location = prompt('แก้ไขสถานที่เรียน:', p.location || '');
  const format = prompt('แก้ไขรูปแบบการเรียน (online/onsite):', p.format || '');
  const videoUrl = prompt('แก้ไขลิงก์วิดีโอ/ลิงก์ที่เกี่ยวข้อง:', p.videoUrl || '');
  await db.collection('promoCourses').doc(currentPromoId).update({ title, description, location, format, videoUrl });
  openPromoDetail(currentPromoId);
}
async function deletePromoCourse() {
  const p = promoCourses.find(x => x.id === currentPromoId);
  if (!confirm(`ยืนยันลบคอร์สโปรโมท "${p ? p.title : ''}" ใช่หรือไม่?`)) return;
  await db.collection('promoCourses').doc(currentPromoId).delete();
  closePromoDetailModal();
}
