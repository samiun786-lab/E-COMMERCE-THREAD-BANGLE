/* ================================================================
   ADMIN AUTHENTICATION — Thread Bangle Platform
   ================================================================ */
// ── Toast helper (shared) ─────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(60px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
// ── Auth Guard ───────────────────────────────────────────────────
// Run on admin.html — if user is not logged in, redirect to login page
function requireAuth() {
  if (!FIREBASE_READY) {
    // In demo mode, bypass auth so admin can be previewed
    console.warn('Auth bypassed — Demo Mode');
    const emailDisplay = document.getElementById('admin-email-display');
    if (emailDisplay) emailDisplay.textContent = 'demo@admin.local';
    const settingEmail = document.getElementById('setting-email-display');
    if (settingEmail) settingEmail.value = 'demo@admin.local';
    return;
  }
  auth.onAuthStateChanged((user) => {
    if (!user) {
      // Not logged in — bounce to login
      window.location.href = 'admin-login.html';
    } else {
      // Logged in — update UI
      const emailDisplay = document.getElementById('admin-email-display');
      if (emailDisplay) emailDisplay.textContent = user.email || 'admin';
      const settingEmail = document.getElementById('setting-email-display');
      if (settingEmail) settingEmail.value = user.email || '';
    }
  });
}
// ── Login Handler (admin-login.html) ─────────────────────────────
async function handleLogin(event) {
  event.preventDefault();
  const email    = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  const submitBtn   = document.getElementById('login-submit-btn');
  const btnText     = document.getElementById('login-btn-text');
  const btnSpinner  = document.getElementById('login-btn-spinner');
  const errorBox    = document.getElementById('login-error');
  // Clear previous errors
  errorBox.classList.remove('visible');
  errorBox.textContent = '';
  if (DEMO_MODE) {
    errorBox.textContent = '⚠️ Firebase is not configured. Please set up Firebase first (see js/firebase-config.js).';
    errorBox.classList.add('visible');
    return;
  }
  // Show loading state
  submitBtn.disabled = true;
  btnText.style.display = 'none';
  btnSpinner.style.display = 'flex';
  try {
    await auth.signInWithEmailAndPassword(email, password);
    showToast('Welcome back! Redirecting...', 'success');
    setTimeout(() => { window.location.href = 'admin.html'; }, 800);
  } catch (err) {
    let errorMsg = 'Sign in failed. Please try again.';
    switch (err.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        errorMsg = '❌ Incorrect email or password.';
        break;
      case 'auth/too-many-requests':
        errorMsg = '⏳ Too many attempts. Please wait a few minutes.';
        break;
      case 'auth/network-request-failed':
        errorMsg = '🌐 Network error. Check your connection.';
        break;
      case 'auth/invalid-email':
        errorMsg = '📧 Please enter a valid email address.';
        break;
    }
    errorBox.textContent = errorMsg;
    errorBox.classList.add('visible');
  } finally {
    submitBtn.disabled = false;
    btnText.style.display = '';
    btnSpinner.style.display = 'none';
  }
}
// ── Auto-redirect if already logged in (login page) ──────────────
function checkAlreadyLoggedIn() {
  if (!FIREBASE_READY) return;
  auth.onAuthStateChanged((user) => {
    if (user) {
      window.location.href = 'admin.html';
    }
  });
}
// ── Logout ────────────────────────────────────────────────────────
async function handleLogout() {
  if (!FIREBASE_READY) {
    window.location.href = 'admin-login.html';
    return;
  }
  try {
    await auth.signOut();
    window.location.href = 'admin-login.html';
  } catch (err) {
    showToast('Logout failed. Please try again.', 'error');
  }
}
// ── Auto-execute on page load ─────────────────────────────────────
(function init() {
  const page = window.location.pathname;
  if (page.endsWith('admin-login.html') || page === '/admin-login') {
    // On login page: redirect if already authed
    checkAlreadyLoggedIn();
  } else if (page.endsWith('admin.html') || page === '/admin') {
    // On dashboard page: guard
    requireAuth();
  }
})();