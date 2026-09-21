// ---------- INISIALISASI FIREBASE ----------
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ---------- INISIALISASI EmailJS ----------
if (typeof emailjs !== 'undefined' && typeof EMAILJS_PUBLIC_KEY !== 'undefined' && !EMAILJS_PUBLIC_KEY.startsWith('GANTI_')) {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

// ---------- ELEMEN ----------
const loginScreen = document.getElementById('loginScreen');
const appScreen = document.getElementById('appScreen');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginInfo = document.getElementById('loginInfo');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const logoutBtn = document.getElementById('logoutBtn');

const confirmPasswordField = document.getElementById('confirmPasswordField');
const confirmPasswordInput = document.getElementById('confirmPassword');
const toggleModeBtn = document.getElementById('toggleModeBtn');
const toggleModeText = document.getElementById('toggleModeText');

const pendingModal = document.getElementById('pendingModal');
const pendingTitle = document.getElementById('pendingTitle');
const pendingMessage = document.getElementById('pendingMessage');
const pendingCloseBtn = document.getElementById('pendingCloseBtn');

const adminPanel = document.getElementById('adminPanel');
const adminList = document.getElementById('adminList');

const fileInput = document.getElementById('fileInput');
const fileDrop = document.getElementById('fileDrop');
const fileDropText = document.getElementById('fileDropText');
const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
const contactSummary = document.getElementById('contactSummary');
const contactTableWrap = document.getElementById('contactTableWrap');

const pembukaInput = document.getElementById('pembuka');
const penutupInput = document.getElementById('penutup');
const saveStatus = document.getElementById('saveStatus');

const sendList = document.getElementById('sendList');
const sendProgress = document.getElementById('sendProgress');
const sendProgressFill = document.getElementById('sendProgressFill');
const sendProgressText = document.getElementById('sendProgressText');

let contacts = []; // { id, nama, nomor, sent }
let unsubscribeContacts = null;
let unsubscribeAdminRequests = null;
let saveTimeout = null;
let isRegisterMode = false;

// ---------- TOGGLE MODE: MASUK <-> DAFTAR ----------
toggleModeBtn.addEventListener('click', () => {
  isRegisterMode = !isRegisterMode;
  loginError.textContent = '';
  loginInfo.textContent = '';

  if (isRegisterMode) {
    confirmPasswordField.hidden = false;
    confirmPasswordInput.required = true;
    loginSubmitBtn.textContent = 'Daftar';
    toggleModeText.textContent = 'Sudah punya akun?';
    toggleModeBtn.textContent = 'Masuk di sini';
  } else {
    confirmPasswordField.hidden = true;
    confirmPasswordInput.required = false;
    loginSubmitBtn.textContent = 'Masuk';
    toggleModeText.textContent = 'Belum punya akun?';
    toggleModeBtn.textContent = 'Daftar di sini';
  }
});

// ---------- SUBMIT FORM: MASUK ATAU DAFTAR ----------
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  loginError.textContent = '';
  loginInfo.textContent = '';

  if (isRegisterMode) {
    handleRegister(email, password);
  } else {
    handleLogin(email, password);
  }
});

function handleLogin(email, password) {
  loginSubmitBtn.disabled = true;
  loginSubmitBtn.textContent = 'Memeriksa...';

  auth.signInWithEmailAndPassword(email, password)
    .catch((err) => {
      loginError.textContent = terjemahkanErrorAuth(err.code);
    })
    .finally(() => {
      loginSubmitBtn.disabled = false;
      loginSubmitBtn.textContent = isRegisterMode ? 'Daftar' : 'Masuk';
    });
}

function handleRegister(email, password) {
  const confirmPassword = confirmPasswordInput.value;
  if (password !== confirmPassword) {
    loginError.textContent = 'Kata sandi dan ulangi kata sandi tidak sama.';
    return;
  }

  loginSubmitBtn.disabled = true;
  loginSubmitBtn.textContent = 'Mendaftarkan...';

  auth.createUserWithEmailAndPassword(email, password)
    .then((cred) => {
      return db.collection('accountRequests').doc(cred.user.uid).set({
        email: email,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(() => auth.signOut())
    .then(() => {
      loginForm.reset();
      toggleModeBtn.click(); // kembali ke mode masuk
      loginInfo.textContent = 'Pendaftaran berhasil! Akunmu menunggu persetujuan admin sebelum bisa dipakai untuk masuk.';
    })
    .catch((err) => {
      loginError.textContent = terjemahkanErrorAuth(err.code);
    })
    .finally(() => {
      loginSubmitBtn.disabled = false;
      loginSubmitBtn.textContent = isRegisterMode ? 'Daftar' : 'Masuk';
    });
}

function terjemahkanErrorAuth(code) {
  switch (code) {
    case 'auth/invalid-email': return 'Format email tidak valid.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
    case 'auth/wrong-password': return 'Email atau kata sandi salah.';
    case 'auth/too-many-requests': return 'Terlalu banyak percobaan. Coba lagi nanti.';
    case 'auth/email-already-in-use': return 'Email ini sudah terdaftar. Coba masuk, atau gunakan email lain.';
    case 'auth/weak-password': return 'Kata sandi terlalu pendek, minimal 6 karakter.';
    default: return 'Gagal memproses: ' + code;
  }
}

// ---------- SETELAH LOGIN: CEK STATUS PERSETUJUAN ----------
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    showOnlyScreen(loginScreen);
    if (unsubscribeContacts) unsubscribeContacts();
    if (unsubscribeAdminRequests) unsubscribeAdminRequests();
    contacts = [];
    adminPanel.hidden = true;
    return;
  }

  const isAdmin = isSameEmail(user.email, ADMIN_EMAIL);

  if (isAdmin) {
    showOnlyScreen(appScreen);
    adminPanel.hidden = false;
    listenToAdminRequests();
    loadTemplate(user.uid);
    listenToContacts(user.uid);
    return;
  }

  adminPanel.hidden = true;

  try {
    const reqDoc = await db.collection('accountRequests').doc(user.uid).get();

    if (!reqDoc.exists) {
      await auth.signOut();
      loginError.textContent = 'Data pendaftaran tidak ditemukan. Silakan daftar ulang.';
      return;
    }

    const status = reqDoc.data().status;

    if (status === 'approved') {
      showOnlyScreen(appScreen);
      loadTemplate(user.uid);
      listenToContacts(user.uid);
    } else if (status === 'rejected') {
      await auth.signOut();
      showPendingModal('Pendaftaran belum disetujui', 'Maaf, pendaftaran akun ini belum disetujui admin. Hubungi admin untuk informasi lebih lanjut.');
    } else {
      await auth.signOut();
      showPendingModal('Menunggu persetujuan', 'Akunmu sudah terdaftar dan sedang menunggu persetujuan admin. Kamu akan bisa masuk setelah disetujui.');
    }
  } catch (err) {
    await auth.signOut();
    loginError.textContent = 'Gagal memeriksa status akun: ' + err.message;
  }
});

// Bandingkan email tanpa peduli huruf besar/kecil atau spasi di ujung —
// mencegah admin gagal dikenali gara-gara perbedaan kapitalisasi.
function isSameEmail(a, b) {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function showOnlyScreen(target) {
  [loginScreen, appScreen].forEach((s) => { s.hidden = (s !== target); });
}

function showPendingModal(title, message) {
  pendingTitle.textContent = title;
  pendingMessage.textContent = message;
  pendingModal.hidden = false;
}

pendingCloseBtn.addEventListener('click', () => {
  pendingModal.hidden = true;
});

logoutBtn.addEventListener('click', () => auth.signOut());

// ---------- PANEL ADMIN: KELOLA PENDAFTAR ----------
function listenToAdminRequests() {
  if (unsubscribeAdminRequests) unsubscribeAdminRequests();
  unsubscribeAdminRequests = db.collection('accountRequests')
    .orderBy('createdAt', 'desc')
    .onSnapshot((snapshot) => {
      const requests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderAdminList(requests);
    });
}

function renderAdminList(requests) {
  if (!requests.length) {
    adminList.innerHTML = '<p class="empty-state">Belum ada yang mendaftar.</p>';
    return;
  }

  let html = '<table><thead><tr><th>Email</th><th>Status</th><th>Aksi</th></tr></thead><tbody>';
  requests.forEach((r) => {
    html += `<tr>
      <td>${escapeHtml(r.email || r.id)}</td>
      <td>${labelStatus(r.status)}</td>
      <td>
        ${r.status !== 'approved' ? `<button class="btn btn-primary btn-small" data-action="approve" data-id="${r.id}">Setujui</button>` : ''}
        ${r.status !== 'rejected' ? `<button class="btn btn-ghost btn-small" data-action="reject" data-id="${r.id}">Tolak</button>` : ''}
      </td>
    </tr>`;
  });
  html += '</tbody></table>';
  adminList.innerHTML = html;

  adminList.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const newStatus = btn.dataset.action === 'approve' ? 'approved' : 'rejected';
      const targetEmail = btn.closest('tr').querySelector('td').textContent;

      db.collection('accountRequests').doc(btn.dataset.id).update({ status: newStatus })
        .then(() => {
          if (newStatus === 'approved') {
            sendApprovalEmail(targetEmail);
          }
        });
    });
  });
}

// ---------- KIRIM EMAIL NOTIFIKASI VIA EmailJS ----------
function sendApprovalEmail(toEmail) {
  if (typeof emailjs === 'undefined') {
    console.warn('EmailJS belum dimuat, email tidak dikirim.');
    return;
  }
  if (!EMAILJS_SERVICE_ID || EMAILJS_SERVICE_ID.startsWith('GANTI_')) {
    console.warn('EmailJS belum dikonfigurasi (lihat firebase-config.js), email tidak dikirim.');
    return;
  }

  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_email: toEmail,
    app_name: 'Undangan Pernikahan — Pengirim WhatsApp'
  }).catch((err) => {
    console.error('Gagal mengirim email notifikasi persetujuan:', err);
  });
}

function labelStatus(status) {
  if (status === 'approved') return '✅ Disetujui';
  if (status === 'rejected') return '❌ Ditolak';
  return '⏳ Menunggu';
}

// ---------- TEMPLATE PESAN (Firestore) ----------
function loadTemplate(uid) {
  db.collection('users').doc(uid).collection('meta').doc('template').get()
    .then((doc) => {
      if (doc.exists) {
        pembukaInput.value = doc.data().pembuka || '';
        penutupInput.value = doc.data().penutup || '';
      }
    });
}

function saveTemplate() {
  const user = auth.currentUser;
  if (!user) return;
  saveStatus.textContent = 'Menyimpan...';
  db.collection('users').doc(user.uid).collection('meta').doc('template').set({
    pembuka: pembukaInput.value,
    penutup: penutupInput.value,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }).then(() => {
    saveStatus.textContent = 'Tersimpan.';
    setTimeout(() => { saveStatus.textContent = ''; }, 1500);
  });
}

function debouncedSaveTemplate() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveTemplate, 700);
}

pembukaInput.addEventListener('input', debouncedSaveTemplate);
penutupInput.addEventListener('input', debouncedSaveTemplate);

// ---------- UPLOAD EXCEL ----------
fileDrop.addEventListener('click', () => fileInput.click());
fileDrop.addEventListener('dragover', (e) => { e.preventDefault(); fileDrop.classList.add('is-dragover'); });
fileDrop.addEventListener('dragleave', () => fileDrop.classList.remove('is-dragover'));
fileDrop.addEventListener('drop', (e) => {
  e.preventDefault();
  fileDrop.classList.remove('is-dragover');
  if (e.dataTransfer.files.length) {
    fileInput.files = e.dataTransfer.files;
    handleFile(e.dataTransfer.files[0]);
  }
});
fileInput.addEventListener('change', () => {
  if (fileInput.files.length) handleFile(fileInput.files[0]);
});

function handleFile(file) {
  fileDropText.textContent = `File dipilih: ${file.name}`;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const parsed = rows
        .map((row) => {
          const keys = Object.keys(row);
          const namaKey = keys.find((k) => k.toLowerCase().includes('nama'));
          const nomorKey = keys.find((k) => /nomor|hp|phone|whatsapp/i.test(k));
          const linkKey = keys.find((k) => /link/i.test(k));
          return {
            nama: namaKey ? String(row[namaKey]).trim() : '',
            nomor: nomorKey ? String(row[nomorKey]).trim() : '',
            link: linkKey ? String(row[linkKey]).trim() : ''
          };
        })
        .filter((c) => c.nama && c.nomor);

      uploadContactsToFirestore(parsed);
    } catch (err) {
      contactSummary.hidden = false;
      contactSummary.innerHTML = `<span style="color:#B3483F">Gagal membaca file: ${err.message}</span>`;
    }
  };
  reader.readAsArrayBuffer(file);
}

// Mengganti seluruh daftar tamu di Firestore dengan isi file yang baru diunggah
async function uploadContactsToFirestore(parsed) {
  const user = auth.currentUser;
  if (!user) return;

  contactSummary.hidden = false;
  contactSummary.innerHTML = 'Menyimpan daftar tamu...';

  const contactsRef = db.collection('users').doc(user.uid).collection('contacts');

  // Hapus daftar lama
  const oldDocs = await contactsRef.get();
  const batchDelete = db.batch();
  oldDocs.forEach((doc) => batchDelete.delete(doc.ref));
  await batchDelete.commit();

  // Tulis daftar baru (Firestore batas 500 operasi per batch)
  const chunks = [];
  for (let i = 0; i < parsed.length; i += 400) {
    chunks.push(parsed.slice(i, i + 400));
  }
  for (const chunk of chunks) {
    const batch = db.batch();
    chunk.forEach((c) => {
      const ref = contactsRef.doc();
           batch.set(ref, { nama: c.nama, nomor: c.nomor, link: c.link || '', sent: false });
    });
    await batch.commit();
  }

  contactSummary.innerHTML = `Berhasil menyimpan <strong>${parsed.length}</strong> tamu.`;
}

// ---------- DENGARKAN PERUBAHAN KONTAK SECARA REAL-TIME ----------
function listenToContacts(uid) {
  if (unsubscribeContacts) unsubscribeContacts();
  const contactsRef = db.collection('users').doc(uid).collection('contacts').orderBy('nama');

  unsubscribeContacts = contactsRef.onSnapshot((snapshot) => {
    contacts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderContactSummary();
    renderSendList();
  });
}

function renderContactSummary() {
  if (!contacts.length) {
    contactSummary.hidden = true;
    contactTableWrap.innerHTML = '';
    return;
  }
  contactSummary.hidden = false;
  contactSummary.innerHTML = `Ada <strong>${contacts.length}</strong> tamu tersimpan di akunmu.`;

    let html = '<table><thead><tr><th>Nama</th><th>Nomor HP</th><th>Link Undangan</th></tr></thead><tbody>';
  contacts.slice(0, 8).forEach((c) => {
    html += `<tr><td>${escapeHtml(c.nama)}</td><td>${escapeHtml(c.nomor)}</td><td>${escapeHtml(c.link || '-')}</td></tr>`;
  });
  html += '</tbody></table>';
  if (contacts.length > 8) {
    html += `<p class="hint-text">...dan ${contacts.length - 8} tamu lainnya.</p>`;
  }
  contactTableWrap.innerHTML = html;
}

// ---------- UNDUH CONTOH FORMAT ----------
downloadTemplateBtn.addEventListener('click', () => {
  const data = [
    { No: 1, Nama: 'Budi Santoso', NomorHP: '081234567890' },
    { No: 2, Nama: 'Siti Aminah', NomorHP: '6281298765432' }
  ];
  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [{ wch: 5 }, { wch: 22 }, { wch: 16 }]; // lebar kolom biar rapi
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tamu');
  XLSX.writeFile(workbook, 'contoh-daftar-tamu.xlsx');
});

// ---------- NOMOR & PESAN ----------
function normalizePhoneNumber(raw) {
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = '62' + digits.slice(1);
  } else if (!digits.startsWith('62')) {
    digits = '62' + digits;
  }
  return digits;
}

function buildMessage(nama, link) {
  const pembuka = pembukaInput.value.trim();
  const penutup = penutupInput.value.trim();
  const combined = `${pembuka}\n\n${penutup}`;
  return combined
    .replace(/\{nama\}/g, nama)
    .replace(/\{link\}/g, link || '');
}

function buildWaLink(nomor, nama, link) {
  const number = normalizePhoneNumber(nomor);
  const text = encodeURIComponent(buildMessage(nama, link));
  return `https://wa.me/${number}?text=${text}`;
}

// ---------- TANDAI STATUS TERKIRIM DI FIRESTORE ----------
function markAsSent(contactId, sent) {
  const user = auth.currentUser;
  if (!user) return;
  db.collection('users').doc(user.uid).collection('contacts').doc(contactId).update({ sent });
}

// ---------- DAFTAR KIRIM ----------
function renderSendList() {
  if (!contacts.length) {
    sendList.innerHTML = '<p class="empty-state">Belum ada daftar tamu. Unggah file di langkah 1 dulu.</p>';
    sendProgress.hidden = true;
    return;
  }

  sendProgress.hidden = false;
  sendList.innerHTML = '';

  contacts.forEach((contact) => {
    const row = document.createElement('div');
    row.className = 'send-row' + (contact.sent ? ' is-sent' : '');

    const info = document.createElement('div');
    info.className = 'send-row-info';
    info.innerHTML = `
      <div class="send-row-name">${escapeHtml(contact.nama)}</div>
      <div class="send-row-phone">${escapeHtml(contact.nomor)}</div>
    `;

    const actions = document.createElement('div');
    actions.className = 'send-row-actions';

    const sendBtn = document.createElement('a');
    sendBtn.className = 'btn btn-primary btn-small';
    sendBtn.textContent = 'Kirim via WhatsApp';
    sendBtn.target = '_blank';
    sendBtn.rel = 'noopener noreferrer';
    sendBtn.href = '#';
    sendBtn.addEventListener('click', (e) => {
      const pembuka = pembukaInput.value.trim();
      const penutup = penutupInput.value.trim();
      if (!pembuka || !penutup) {
        e.preventDefault();
        alert('Isi dulu kalimat pembuka dan penutup di langkah 2.');
        return;
      }
      sendBtn.href = buildWaLink(contact.nomor, contact.nama, contact.link);
      markAsSent(contact.id, true);
    });

    const checkLabel = document.createElement('label');
    checkLabel.className = 'check-label';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!contact.sent;
    checkbox.addEventListener('change', () => {
      markAsSent(contact.id, checkbox.checked);
    });
    checkLabel.appendChild(checkbox);
    checkLabel.appendChild(document.createTextNode('Sudah terkirim'));

    actions.appendChild(sendBtn);
    actions.appendChild(checkLabel);

    row.appendChild(info);
    row.appendChild(actions);
    sendList.appendChild(row);
  });

  updateProgress();
}

function updateProgress() {
  const sentCount = contacts.filter((c) => c.sent).length;
  const pct = contacts.length ? Math.round((sentCount / contacts.length) * 100) : 0;
  sendProgressFill.style.width = pct + '%';
  sendProgressText.textContent = `${sentCount} dari ${contacts.length} tamu ditandai sudah terkirim`;
}

// ---------- UTIL ----------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
