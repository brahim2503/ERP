/* ==========================================================================
   TOUSHIR ERP — Firebase Authentication Module
   Bridges existing workers/PIN system with Firebase Auth
   ========================================================================== */

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // Helper: generate a deterministic email from worker name
  // (Firebase Auth requires an email format)
  // -------------------------------------------------------------------------
  function workerEmail(name) {
    const cleanName = (name || '').trim();
    if (cleanName === 'المدير' || cleanName.toLowerCase() === 'admin' || cleanName.includes('مدير')) {
      return 'admin@erp-mark.com';
    }
    let slug = cleanName.replace(/[^\w]/g, '').toLowerCase();
    if (!slug) {
      slug = 'worker_' + Array.from(cleanName).map(c => c.charCodeAt(0).toString(16)).join('').slice(0, 8);
    }
    return `${slug}@erp-mark.com`;
  }

  // -------------------------------------------------------------------------
  // Helper: generate a deterministic password from worker PIN
  // Format: PIN + project suffix for extra entropy
  // -------------------------------------------------------------------------
  function workerPassword(pin) {
    return `toushir_${pin}_erp2026`;
  }

  // -------------------------------------------------------------------------
  // Helper: map Firebase auth error codes to clear Arabic messages
  // -------------------------------------------------------------------------
  function getArabicAuthError(code) {
    switch (code) {
      case 'auth/invalid-email':
        return '⚠️ صيغة البريد الإلكتروني غير صالحة. يرجى كتابة بريد صحيح.';
      case 'auth/user-disabled':
        return '⚠️ هذا الحساب معطل حالياً من طرف الإدارة.';
      case 'auth/user-not-found':
        return '⚠️ لا يوجد حساب مسجل بهذا البريد الإلكتروني.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials':
        return '⚠️ كلمة المرور أو البريد الإلكتروني غير صحيح!';
      case 'auth/email-already-in-use':
        return '⚠️ هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول بدلاً من التسجيل.';
      case 'auth/weak-password':
        return '⚠️ كلمة المرور ضعيفة جداً! يجب أن تحتوي على 6 خانات على الأقل.';
      case 'auth/operation-not-allowed':
        return '⚠️ تسجيل الدخول بالبريد الإلكتروني غير مفعّل في إعدادات Firebase.';
      case 'auth/network-request-failed':
        return '⚠️ فشل الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت.';
      case 'auth/too-many-requests':
        return '⚠️ تم حظر المحاولات مؤقتاً بسبب تكرار المحاولات الخاطئة. حاول لاحقاً.';
      default:
        return '⚠️ خطأ في المصادقة: ' + (code || 'يرجى إعادة المحاولة');
    }
  }

  // -------------------------------------------------------------------------
  // Sign in with Firebase using email or worker credentials
  // -------------------------------------------------------------------------
  async function firebaseSignIn(identifier, secret, isEmailAuth = false) {
    const fb = window.ToushirFirebase;
    if (!fb || !fb.auth) {
      console.warn('[Auth] Firebase not ready — skipping Firebase sign-in');
      return null;
    }

    const isEmail = isEmailAuth || (identifier && identifier.includes('@'));
    const email = isEmail ? identifier.trim().toLowerCase() : workerEmail(identifier);
    const password = isEmail ? secret : workerPassword(secret);

    try {
      // Try signing in first
      const cred = await fb.auth.signInWithEmailAndPassword(email, password);
      console.log('[Auth] ✅ Firebase sign-in success:', email);
      return cred.user;
    } catch (err) {
      console.warn('[Auth] Firebase sign-in catch:', err.code, err.message);

      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        // Try creating account if not found
        try {
          const cred = await fb.auth.createUserWithEmailAndPassword(email, password);
          const displayName = isEmail ? email.split('@')[0] : identifier;
          await cred.user.updateProfile({ displayName: displayName });
          console.log('[Auth] ✅ Firebase account created & signed in:', email);
          return cred.user;
        } catch (createErr) {
          console.error('[Auth] ❌ Create account failed:', createErr.message);
          throw (createErr.code === 'auth/email-already-in-use' ? err : createErr);
        }
      } else {
        throw err;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Direct Sign Up with Email and Password
  // -------------------------------------------------------------------------
  async function firebaseSignUp(email, password, displayName = '') {
    const fb = window.ToushirFirebase;
    if (!fb || !fb.auth) {
      throw new Error('Firebase Auth غير متاح حالياً');
    }

    const cleanEmail = email.trim().toLowerCase();
    const cred = await fb.auth.createUserWithEmailAndPassword(cleanEmail, password);
    const name = displayName || cleanEmail.split('@')[0];
    await cred.user.updateProfile({ displayName: name });
    console.log('[Auth] ✅ Firebase sign-up success:', cleanEmail);
    return cred.user;
  }

  // -------------------------------------------------------------------------
  // Sign out from Firebase
  // -------------------------------------------------------------------------
  async function firebaseSignOut() {
    const fb = window.ToushirFirebase;
    if (!fb || !fb.auth) return;

    try {
      await fb.auth.signOut();
      console.log('[Auth] 👋 Firebase sign-out complete');
    } catch (err) {
      console.error('[Auth] ❌ Sign-out error:', err.message);
    }
  }

  // -------------------------------------------------------------------------
  // Listen to Firebase auth state changes
  // -------------------------------------------------------------------------
  function listenAuthState() {
    const fb = window.ToushirFirebase;
    if (!fb || !fb.auth) return;

    fb.auth.onAuthStateChanged(async (user) => {
      if (user) {
        // ----------------------------------------------------------------
        // User is signed in
        // ----------------------------------------------------------------
        console.log('[Auth] 👤 Firebase user authenticated:', user.email);

        // Get custom claims to check role
        const tokenResult = await user.getIdTokenResult(true); // force refresh
        const isAdmin = tokenResult.claims.role === 'admin' || tokenResult.claims.admin === true;

        // Update sync badge
        if (window.ToushirSync) {
          await window.ToushirSync.initSync(isAdmin);
        }

        // Store auth info globally
        window.ToushirFirebase._currentUser = user;
        window.ToushirFirebase._isAdmin = isAdmin;

      } else {
        // ----------------------------------------------------------------
        // User is signed out
        // ----------------------------------------------------------------
        console.log('[Auth] 🔒 Firebase user signed out');

        window.ToushirFirebase._currentUser = null;
        window.ToushirFirebase._isAdmin = false;

        if (window.ToushirSync) {
          window.ToushirSync.stopSync();
        }
      }
    });
  }

  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // Hook into existing ToushirApp login flow
  // -------------------------------------------------------------------------
  function hookIntoAppLogin() {
    // Wait for ToushirApp to be fully loaded
    const attempt = () => {
      const app = window.ToushirApp;
      if (!app) { setTimeout(attempt, 300); return; }

      // Hook into logout
      const _originalLogout = app.logoutUser ? app.logoutUser.bind(app) : (app.logout ? app.logout.bind(app) : null);
      if (_originalLogout) {
        app.logoutUser = async function () {
          await firebaseSignOut();
          _originalLogout();
        };
      }

      console.log('[Auth] 🔧 ToushirApp auth hooked with Firebase Auth');
    };

    attempt();
  }

  // -------------------------------------------------------------------------
  // Inject sync status badge into the UI header
  // -------------------------------------------------------------------------
  function injectSyncBadge() {
    // Avoid duplicate injection
    if (document.getElementById('firebase-sync-badge')) return;

    const badge = document.createElement('span');
    badge.id = 'firebase-sync-badge';
    badge.title = 'حالة المزامنة مع Firebase';
    badge.dataset.status = 'offline';
    badge.style.cssText = `
      position: fixed;
      bottom: 16px;
      left: 16px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(0,0,0,0.65);
      backdrop-filter: blur(8px);
      color: #fff;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: default;
      z-index: 9999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: transform 0.2s ease;
      user-select: none;
    `;
    badge.textContent = '💾';

    // Animate on hover
    badge.addEventListener('mouseenter', () => badge.style.transform = 'scale(1.15)');
    badge.addEventListener('mouseleave', () => badge.style.transform = 'scale(1)');

    // Click: force push
    badge.addEventListener('click', async () => {
      const fb = window.ToushirFirebase;
      if (fb && fb.auth && fb.auth.currentUser) {
        badge.textContent = '🔄';
        if (window.ToushirSync) await window.ToushirSync.fullPush();
      } else {
        alert('يجب تسجيل الدخول أولاً للمزامنة مع Firebase');
      }
    });

    document.body.appendChild(badge);
    console.log('[Auth] 🔵 Sync badge injected');
  }

  // -------------------------------------------------------------------------
  // Initialize everything
  // -------------------------------------------------------------------------
  function init() {
    // 1. Inject sync badge into UI
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectSyncBadge);
    } else {
      injectSyncBadge();
    }

    // 2. Start listening to Firebase auth state
    listenAuthState();

    // 3. Hook into app login flow
    hookIntoAppLogin();

    console.log('[Auth] 🚀 ToushirFirebase Auth module initialized');
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------
  window.ToushirAuth = {
    init,
    signIn: firebaseSignIn,
    signUp: firebaseSignUp,
    signOut: firebaseSignOut,
    listenAuthState,
    workerEmail,
    getErrorMessage: getArabicAuthError,

    /** Get currently signed-in Firebase user */
    getCurrentUser() {
      const fb = window.ToushirFirebase;
      return fb ? fb._currentUser || null : null;
    },

    /** Check if current user is admin */
    isAdmin() {
      const fb = window.ToushirFirebase;
      return fb ? !!fb._isAdmin : false;
    }
  };

  // Auto-initialize
  init();

  console.log('[Auth] 🔧 window.ToushirAuth ready');
})();
