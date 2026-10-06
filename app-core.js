// ===== Shared UI helpers (sidebar, view switching, misc utils) =====

function toggleSidebar() {
  const sidebar = document.getElementById('appSidebar');
  const mainContent = document.getElementById('mainContent');
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('mobile-open');
  } else {
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');
  }
}

function toggleNoteBox(headerEl) {
  const content = headerEl.nextElementSibling;
  const arrow = headerEl.querySelector('.note-arrow');
  content.classList.toggle('open');
  arrow.style.transform = content.classList.contains('open') ? 'rotate(90deg)' : 'rotate(0deg)';
}

function switchView(viewId, menuElement = null) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  if (menuElement) {
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    menuElement.classList.add('active');
  }
  const banner = document.getElementById('mainBanner');
  if (banner) { banner.style.display = (viewId === 'detailView') ? 'none' : 'flex'; }
  document.getElementById(viewId).classList.add('active');
}

function toggleSubmenu(element) {
  element.classList.toggle('open');
  const submenu = document.getElementById('gradeSubmenu');
  submenu.style.display = submenu.style.display === 'block' ? 'none' : 'block';
}

function generateAccessCode() { return Math.floor(100000 + Math.random() * 900000).toString(); }

// แปลงลิงก์ Google Drive ให้อัตโนมัติ หรือใช้ลิงก์ตรงได้ทันที
function formatImageUrl(url) {
  if (!url) return '';
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  return url;
}

function copyParentLink() { const link = new URL('parent.html', window.location.href).href; navigator.clipboard.writeText(link); alert(`คัดลอกลิงก์สำหรับผู้ปกครองสำเร็จ:\n${link}`); }
