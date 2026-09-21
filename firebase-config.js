/* =====================================================================
   Konfigurasi project Firebase kamu (aplikasi-blast-wa).

   CATATAN: apiKey dan nilai lain di sini AMAN untuk terlihat publik,
   termasuk di repo GitHub public. Ini beda dengan password — Firebase
   memang didesain begini. Keamanan data sesungguhnya diatur lewat
   Firebase Authentication dan Firestore Security Rules (firestore.rules),
   bukan dengan menyembunyikan config ini.

   PENTING: file ini dipakai lewat <script> tag biasa (bukan npm/import),
   jadi JANGAN tambahkan baris "import ..." atau "initializeApp(...)" di
   sini — itu sudah dipanggil di script.js.
   ===================================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyASlJUJzittrV9YvwmspwheAIEODlDZpNg",
  authDomain: "aplikasi-blast-wa.firebaseapp.com",
  projectId: "aplikasi-blast-wa",
  storageBucket: "aplikasi-blast-wa.firebasestorage.app",
  messagingSenderId: "815384392772",
  appId: "1:815384392772:web:e6188162b303a4f43df811"
};

/* =====================================================================
   Email akun ADMIN kamu. Harus SAMA PERSIS (kapitalisasi tidak masalah,
   sudah ditoleransi oleh kode) dengan:
   - Akun yang kamu buat di Firebase Console (Authentication > Users)
   - Email admin di dalam file firestore.rules
   ===================================================================== */
const ADMIN_EMAIL = "dpermana3008@gmail.com";

/* =====================================================================
   Konfigurasi EmailJS — dipakai untuk mengirim email otomatis ke
   pendaftar saat akunnya kamu setujui. Kalau belum diisi (masih
   "GANTI_..."), fitur email otomatis ini akan dilewati begitu saja
   (tidak error, cuma tidak mengirim email).

   Cara dapatkan nilai-nilai ini: daftar gratis di https://www.emailjs.com
   lalu lihat instruksi lengkap di README.md.
   ===================================================================== */
const EMAILJS_PUBLIC_KEY = "GANTI_DENGAN_PUBLIC_KEY_EMAILJS";
const EMAILJS_SERVICE_ID = "GANTI_DENGAN_SERVICE_ID_EMAILJS";
const EMAILJS_TEMPLATE_ID = "GANTI_DENGAN_TEMPLATE_ID_EMAILJS";
