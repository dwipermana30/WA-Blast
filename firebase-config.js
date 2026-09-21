/* =====================================================================
   Ganti nilai-nilai di bawah ini dengan firebaseConfig dari project
   Firebase kamu sendiri (Project Settings > Your apps > ikon web </>).

   CATATAN: apiKey dan nilai lain di sini AMAN untuk terlihat publik,
   termasuk di repo GitHub public. Ini beda dengan password — Firebase
   memang didesain begini. Keamanan data sesungguhnya diatur lewat
   Firebase Authentication (siapa yang boleh login) dan Firestore
   Security Rules (lihat file firestore.rules), bukan dengan
   menyembunyikan config ini.
   ===================================================================== */
const firebaseConfig = {
  apiKey: "GANTI_DENGAN_API_KEY",
  authDomain: "GANTI-PROJECT.firebaseapp.com",
  projectId: "GANTI-PROJECT-ID",
  storageBucket: "GANTI-PROJECT.appspot.com",
  messagingSenderId: "GANTI_SENDER_ID",
  appId: "GANTI_APP_ID"
};

/* =====================================================================
   Email akun ADMIN (kamu). Akun dengan email ini:
   - Otomatis bisa masuk tanpa perlu persetujuan
   - Melihat panel "Kelola Pendaftar" untuk menyetujui/menolak akun baru

   Harus SAMA PERSIS dengan email yang kamu buat di Firebase Console
   (Authentication > Users), dan harus sama persis dengan email admin
   yang ditulis di file firestore.rules.
   ===================================================================== */
const ADMIN_EMAIL = "GANTI_DENGAN_EMAIL_ADMIN_KAMU@gmail.com";
