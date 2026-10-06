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
    // ถ้าโหลดรูปไม่สำเร็จ (ลิงก์เสีย/โดนบล็อก) ให้ซ่อนรูปแล้วโชว์ข้อความต้อนรับแทน แทนที่จะโชว์ไอคอนรูปพัง
    bannerImg.onerror = function () {
      bannerImg.style.display = 'none';
      textContent.style.display = 'block';
    };
    bannerImg.src = formatImageUrl(latestSlide.imageUrl);
    bannerImg.style.display = 'block';
    textContent.style.display = 'none';
  } else {
    bannerImg.style.display = 'none';
    bannerImg.removeAttribute('src');
    textContent.style.display = 'block';
  }
}

// ย่อ/บีบอัดรูปในเบราว์เซอร์ก่อน แปลงเป็น base64 (data URL) แล้วส่งกลับมา - ไม่ต้องพึ่งบริการภายนอกใดๆ
function resizeImageToDataUrl(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('ไฟล์นี้ไม่ใช่รูปภาพที่รองรับ'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
          else { width = Math.round(width * maxDim / height); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// อัปโหลดรูปประกาศจากไฟล์ในเครื่องโดยตรง - ไม่ต้องล็อกอินใดๆ เก็บรูปไว้ใน Firebase ของเราเอง
async function handleBannerFileUpload(event) {
  const file = event.target.files[0];
  event.target.value = ''; // เคลียร์ค่า เผื่อเลือกไฟล์เดิมซ้ำครั้งถัดไปจะได้ trigger อีกครั้ง
  if (!file) return;
  if (!file.type.startsWith('image/')) { alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น (jpg, png ฯลฯ)'); return; }
  const btns = document.querySelectorAll('.btn-edit-banner');
  btns.forEach(b => { b.disabled = true; });
  try {
    const dataUrl = await resizeImageToDataUrl(file, 1600, 0.75);
    if (dataUrl.length > 900000) {
      alert('ไฟล์รูปนี้มีรายละเอียดเยอะเกินไป กรุณาเลือกรูปอื่นที่มีขนาดเล็กลง หรือถ่าย/บันทึกใหม่ด้วยความละเอียดที่ต่ำลง');
      return;
    }
    await db.collection('bannerSlides').add({ imageUrl: dataUrl, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    alert('อัปโหลดรูปประกาศสำเร็จ!');
  } catch (err) {
    alert('อัปโหลดไม่สำเร็จ: ' + err.message);
  }
  btns.forEach(b => { b.disabled = false; });
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
