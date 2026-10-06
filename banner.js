// ===== Banner / ประกาศ =====
let bannerSlides = [];

function initBannerListener() {
  db.collection('bannerSlides').onSnapshot(snapshot => {
    bannerSlides = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    bannerSlides.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    renderMainBanner();
    renderSlideManageList();
  });
}

function renderMainBanner() {
  const bannerImg = document.getElementById('bannerImg');
  const textContent = document.getElementById('bannerTextContent');
  if (bannerSlides.length > 0) {
    const latestSlide = bannerSlides[bannerSlides.length - 1];
    bannerImg.src = formatImageUrl(latestSlide.imageUrl);
    bannerImg.style.display = 'block';Q
    textContent.style.display = 'none';
  } else {
    bannerImg.style.display = 'none';
    bannerImg.removeAttribute('src');
    textContent.style.display = 'block';
  }
}

async function promptBannerUrl() {
  const url = prompt('วางลิงก์รูปภาพประกาศที่นี่ (เช่น ลิงก์รูปภาพตรง หรือลิงก์ Google Drive):');
  if (!url) return;
  try {
    await db.collection('bannerSlides').add({ imageUrl: url.trim(), createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    alert('เพิ่มรูปประกาศสำเร็จ!');
  } catch (err) { alert('บันทึกไม่สำเร็จ: ' + err.message); }
}

function openManageSlidesModal() { renderSlideManageList(); document.getElementById('manageSlidesModal').style.display = 'flex'; }
function closeManageSlidesModal() { document.getElementById('manageSlidesModal').style.display = 'none'; }
function renderSlideManageList() {
  const list = document.getElementById('slideManageList');
  if (!list) return;
  if (bannerSlides.length === 0) { list.innerHTML = '<div style="text-align:center; color: var(--text-muted); padding: 16px 0;">ยังไม่มีรูปประกาศ</div>'; return; }
  list.innerHTML = bannerSlides.map((s, i) => `
    <div class="slide-manage-item">
      <img src="${formatImageUrl(s.imageUrl)}" alt="slide">
      <div style="flex:1; font-size: 0.85rem; color: var(--text-muted);">รูปที่ ${i + 1}</div>
      <button class="btn btn-danger" style="font-size:0.75rem; padding: 4px 10px;" onclick="deleteBannerSlide('${s.id}')">🗑️ ลบ</button>
    </div>`).join('');
}
async function deleteBannerSlide(id) { if (!confirm('ยืนยันลบรูปประกาศนี้?')) return; await db.collection('bannerSlides').doc(id).delete(); }
