// ===== Banner / ประกาศ (อ่านอย่างเดียว) =====
function initBannerListener() {
  db.collection('bannerSlides').onSnapshot(snapshot => {
    const slides = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    slides.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    const bannerImg = document.getElementById('bannerImg');
    const textContent = document.getElementById('bannerTextContent');
    if (slides.length > 0) {
      const latest = slides[slides.length - 1];
      // ถ้าโหลดรูปไม่สำเร็จ ให้ซ่อนรูปแล้วโชว์ข้อความต้อนรับแทน แทนที่จะโชว์ไอคอนรูปพัง
      bannerImg.onerror = function () {
        bannerImg.style.display = 'none';
        textContent.style.display = 'block';
      };
      bannerImg.src = latest.imageUrl;
      bannerImg.style.display = 'block';
      textContent.style.display = 'none';
    } else {
      bannerImg.style.display = 'none';
      bannerImg.removeAttribute('src');
      textContent.style.display = 'block';
    }
  });
}
