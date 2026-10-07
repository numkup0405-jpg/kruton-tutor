// ===== คอร์สโปรโมท (อ่านอย่างเดียว) =====
let promoCourses = [];
let currentPromoId = null;

function initPromoListener() {
  db.collection('promoCourses').onSnapshot(snapshot => {
    promoCourses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCourseCards(currentFilterGrade);
  });
}

function openPromoDetail(id) {
  currentPromoId = id;
  const p = promoCourses.find(x => x.id === id);
  if (!p) return;
  document.getElementById('promoDetailTitle').innerText = p.title;
  document.getElementById('promoDetailDesc').innerText = p.description || '';
  const typeBox = document.getElementById('promoDetailType');
  if (p.format) {
    const isOnline = p.format.toLowerCase().includes('online');
    typeBox.innerHTML = `<span class="promo-type-tag ${isOnline ? 'online' : 'onsite'}">${isOnline ? '💻' : '📍'} ${p.format}${p.location ? ' · ' + p.location : ''}</span>`;
  } else typeBox.innerHTML = '';
  const coverImg = document.getElementById('promoDetailCover');
  if (p.coverImageUrl) { coverImg.src = p.coverImageUrl; coverImg.style.display = 'block'; } else coverImg.style.display = 'none';
  const videoBox = document.getElementById('promoDetailVideoBox');
  const embedUrl = p.videoUrl ? p.videoUrl.replace('watch?v=', 'embed/') : null;
  if (embedUrl) videoBox.innerHTML = `<iframe class="promo-video-frame" src="${embedUrl}" allowfullscreen></iframe>`;
  else if (p.videoUrl) videoBox.innerHTML = `<a href="${p.videoUrl}" target="_blank" class="btn btn-outline" style="display:inline-block; margin-bottom:16px;">🔗 เปิดลิงก์ที่เกี่ยวข้อง</a>`;
  else videoBox.innerHTML = '';
  document.getElementById('promoDetailModal').style.display = 'flex';
}
function closePromoDetailModal() {
  document.getElementById('promoDetailModal').style.display = 'none';
  document.getElementById('promoDetailVideoBox').innerHTML = '';
}
