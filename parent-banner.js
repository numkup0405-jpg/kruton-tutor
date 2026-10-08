// ===== Banner / ประกาศ (อ่านอย่างเดียว, สไลด์โชว์เลื่อนอัตโนมัติ) =====
let bannerSlides = [];
let currentBannerIndex = 0;
let bannerIntervalId = null;

function initBannerListener() {
  db.collection('bannerSlides').onSnapshot(snapshot => {
    bannerSlides = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    bannerSlides.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    if (currentBannerIndex >= bannerSlides.length) currentBannerIndex = 0;
    renderMainBanner();
    startBannerAutoplay();
  });
}

// เลื่อนสไลด์อัตโนมัติทุก 5 วินาที เมื่อมีรูปมากกว่า 1 รูป
function startBannerAutoplay() {
  if (bannerIntervalId) clearInterval(bannerIntervalId);
  if (bannerSlides.length > 1) {
    bannerIntervalId = setInterval(() => {
      currentBannerIndex = (currentBannerIndex + 1) % bannerSlides.length;
      renderMainBanner();
    }, 5000);
  }
}

function prevBannerSlide() {
  if (bannerSlides.length < 2) return;
  currentBannerIndex = (currentBannerIndex - 1 + bannerSlides.length) % bannerSlides.length;
  renderMainBanner();
  startBannerAutoplay();
}
function nextBannerSlide() {
  if (bannerSlides.length < 2) return;
  currentBannerIndex = (currentBannerIndex + 1) % bannerSlides.length;
  renderMainBanner();
  startBannerAutoplay();
}
function goToBannerSlide(i) {
  currentBannerIndex = i;
  renderMainBanner();
  startBannerAutoplay();
}

function renderMainBanner() {
  const bannerImg = document.getElementById('bannerImg');
  const textContent = document.getElementById('bannerTextContent');
  const dotsBox = document.getElementById('bannerDots');
  const prevBtn = document.getElementById('bannerPrevBtn');
  const nextBtn = document.getElementById('bannerNextBtn');
  const showNav = bannerSlides.length > 1 ? 'flex' : 'none';
  if (prevBtn) prevBtn.style.display = showNav;
  if (nextBtn) nextBtn.style.display = showNav;

  if (bannerSlides.length > 0) {
    const slide = bannerSlides[currentBannerIndex];
    // ถ้าโหลดรูปไม่สำเร็จ ให้ซ่อนรูปแล้วโชว์ข้อความต้อนรับแทน แทนที่จะโชว์ไอคอนรูปพัง
    bannerImg.onerror = function () {
      bannerImg.style.display = 'none';
      textContent.style.display = 'block';
    };
    bannerImg.src = slide.imageUrl;
    bannerImg.style.display = 'block';
    textContent.style.display = 'none';
    if (dotsBox) {
      if (bannerSlides.length > 1) {
        dotsBox.style.display = 'flex';
        dotsBox.innerHTML = bannerSlides.map((s, i) => `<span class="banner-dot ${i === currentBannerIndex ? 'active' : ''}" onclick="event.stopPropagation(); goToBannerSlide(${i})"></span>`).join('');
      } else {
        dotsBox.style.display = 'none';
        dotsBox.innerHTML = '';
      }
    }
  } else {
    bannerImg.style.display = 'none';
    bannerImg.removeAttribute('src');
    textContent.style.display = 'block';
    if (dotsBox) { dotsBox.style.display = 'none'; dotsBox.innerHTML = ''; }
  }
}
