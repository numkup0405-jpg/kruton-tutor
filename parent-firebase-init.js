// ===== Firebase config + เริ่มต้นการทำงานของหน้าผู้ปกครอง =====
const firebaseConfig = {
  apiKey: "AIzaSyCFatAoxaWxXzTCunzpx_9Etuv9OL1Ei14",
  authDomain: "kruton-tutor.firebaseapp.com",
  projectId: "kruton-tutor",
  storageBucket: "kruton-tutor.firebasestorage.app",
  messagingSenderId: "426629568710",
  appId: "1:426629568710:web:e4b584205077902429fc7"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// สคริปต์อื่นๆ ทั้งหมดถูกโหลดมาก่อนไฟล์นี้แล้ว (ดู parent.html) จึงเรียกใช้ฟังก์ชันเหล่านี้ได้ทันที
initBannerListener();
initStudentsListener();
initPromoListener();
