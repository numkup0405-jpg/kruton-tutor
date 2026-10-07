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
  document.getElementById(viewId).classList.add('active');
}

function toggleSubmenu(element) {
  element.classList.toggle('open');
  const submenu = document.getElementById('gradeSubmenu');
  submenu.style.display = submenu.style.display === 'block' ? 'none' : 'block';
}

function statusLabel(s) {
  if (s === 'completed') return 'ผ่านเกณฑ์';
  if (s === 'in_progress') return 'กำลังเรียน';
  return 'รอดำเนินการ';
}
