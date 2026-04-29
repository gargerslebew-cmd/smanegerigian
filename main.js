// REGISTER - FIX AUTO LOGIN
document.getElementById('submitRegister').onclick = async () => {
  const nama = document.getElementById('namaDaftar').value.trim();
  const kelas = document.getElementById('kelasDaftar').value.trim();
  const email = document.getElementById('emailDaftar').value.trim();
  const pass = document.getElementById('passwordDaftar').value;

  if (!nama ||!kelas ||!email ||!pass) return alert('Lengkapi semua data!');
  if (pass.length < 6) return alert('Password minimal 6 karakter!');

  document.getElementById('submitRegister').textContent = 'Mendaftar...';
  document.getElementById('submitRegister').disabled = true;

  try {
    // 1. Bikin akun Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    
    // 2. Tunggu data role masuk ke DB dulu SEBELUM auto login jalan
    await set(ref(db, `users/${userCredential.user.uid}`), {
      email: email,
      nama: nama,
      kelas: kelas,
      role: 'murid',
      daftar: Date.now()
    });

    showToast('Berhasil!', 'Pendaftaran berhasil! Auto login...');
    modalRegister.classList.add('hidden');
    
    // Gak perlu signIn lagi karena createUserWithEmailAndPassword udah auto login
    // onAuthStateChanged bakal ke-trigger dan sekarang udah ada role:murid
    
  } catch (e) {
    alert('Gagal daftar: ' + e.message);
  } finally {
    document.getElementById('submitRegister').textContent = 'Daftar';
    document.getElementById('submitRegister').disabled = false;
  }
};

// AUTH STATE - FIX RACE CONDITION
let isCheckingUser = false;
onAuthStateChanged(auth, async (user) => {
  if (isCheckingUser) return; // Hindari double trigger
  isCheckingUser = true;

  if (user) {
    document.getElementById('btnLogin').textContent = 'Loading...';
    
    try {
      // Kasih delay 500ms buat nunggu set() selesai kalo abis register
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const snapshot = await get(ref(db, `users/${user.uid}`));
      const userData = snapshot.val();

      if (userData && userData.role === 'murid') {
        document.getElementById('btnLogin').textContent = 'Logout';
        document.getElementById('btnLogin').onclick = () => signOut(auth);
        document.getElementById('dashboardMurid').classList.remove('hidden');
        document.getElementById('namaMurid').textContent = userData.nama || user.email.split('@')[0];
        document.getElementById('kelasMurid').textContent = userData.kelas || '-';

        loadPengumuman();
        loadTugasAktif();
        loadTugasTerkirim(user.uid);
        
        setTimeout(() => {
          document.getElementById('dashboardMurid').scrollIntoView({ behavior: 'smooth' });
        }, 300);
        
      } else if (userData && userData.role === 'guru') {
        await signOut(auth);
        alert('Ini portal murid. Silakan login di Portal Guru.');
        resetLoginButton();
      } else {
        // Kalo user ada tapi data belum ada = baru daftar tapi set() gagal
        await signOut(auth);
        alert('Data akun belum lengkap. Silakan daftar ulang atau hubungi admin.');
        resetLoginButton();
      }
    } catch (error) {
      console.error(error);
      await signOut(auth);
      alert('Error ambil data user: ' + error.message);
      resetLoginButton();
    }
  } else {
    resetLoginButton();
    document.getElementById('dashboardMurid').classList.add('hidden');
    document.getElementById('listPengumuman').innerHTML = '';
    document.getElementById('tab-aktif').innerHTML = '';
    document.getElementById('tab-terkirim').innerHTML = '';
  }
  
  isCheckingUser = false;
});

function resetLoginButton() {
  document.getElementById('btnLogin').textContent = 'Login Murid';
  document.getElementById('btnLogin').onclick = () => modalLogin.classList.remove('hidden');
}