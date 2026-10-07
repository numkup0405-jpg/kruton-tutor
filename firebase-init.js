// ===== Firebase config + Google Drive auth + shared init =====
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

const GOOGLE_CLIENT_ID = '426629568710-ljt1a1ac70lgdm846ieer4hpieg3kj50.apps.googleusercontent.com';
const GOOGLE_API_KEY = 'AIzaSyBMeOJFJ5xgRnb_LKd2deOTWLGlARcFg7M';

let tokenClient;
let driveAccessToken = null;

window.onload = function () {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/drive.file',
    callback: (tokenResponse) => {
      if (tokenResponse && tokenResponse.access_token) {
        driveAccessToken = tokenResponse.access_token;
        document.getElementById('driveStatus').innerText = "✅ เชื่อมต่อแล้ว (พร้อมอัปโหลดไฟล์นักเรียน)";
        document.getElementById('driveStatus').style.color = "#16a34a";
        document.getElementById('btnGoogleAuth').style.display = "none";
      }
    },
  });
  initBannerListener();
  initStudentsListener();
  initPromoListener();
  initNotificationListener();
};

function requestDriveAccess() {
  if (!tokenClient) return alert('ระบบกำลังโหลด กรุณารอสักครู่');
  tokenClient.requestAccessToken({prompt: 'consent'});
}

async function uploadFileToDrive(file) {
  if (!driveAccessToken) {
    throw new Error('กรุณากดปุ่ม "ล็อกอินเชื่อมต่อ Drive" ที่ด้านบนก่อนอัปโหลดไฟล์ครับ');
  }
  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.readAsDataURL(file);
    reader.onload = async function() {
      const base64Data = reader.result.split(',')[1];
      const metadata = { 'name': file.name, 'mimeType': file.type };
      const multipartRequestBody =
        delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) +
        delimiter + 'Content-Type: ' + file.type + '\r\nContent-Transfer-Encoding: base64\r\n\r\n' + base64Data + close_delim;

      try {
        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + driveAccessToken, 'Content-Type': 'multipart/related; boundary=' + boundary },
          body: multipartRequestBody
        });
        const data = await res.json();
        if(data.error) throw new Error(data.error.message);

        await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions?key=${GOOGLE_API_KEY}`, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + driveAccessToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'reader', type: 'anyone' })
        });
        resolve(data.webViewLink);
      } catch(e) { reject(e); }
    };
  });
}
