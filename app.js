/* ==========================================================================
   TOUSHIR ERP - Main Application Controller & Central State Store
   Manages State, Routing, Modals, LocalStorage, and View Synchronization
   Includes POS Screen Integration
   ========================================================================== */

// 1. Central Data Store
window.ToushirStore = {
  get state() { return this; },
  settings: {
    whatsappProvider: 'meta',
    whatsappPhoneId: '109847293847120',
    whatsappToken: 'EAAGk38491823791823',
    currency: 'دج',
    templateText: `السلام عليكم {{customerName}}،\n\nتم تسجيل عملية شراء بالدين بنجاح.\n\n🧾 رقم الفاتورة: {{invoiceNumber}}\n📅 التاريخ: {{invoiceDate}}\n\nالمنتجات:\n{{productList}}\n\n💰 إجمالي الفاتورة: {{totalAmount}} {{currency}}\n💵 المدفوع: {{amountPaid}} {{currency}}\n📌 المتبقي: {{remainingAmount}} {{currency}}\n📊 رصيدكم الحالي: {{customerBalance}} {{currency}}\n\nشكرًا لتعاملكم معنا، ونتمنى لكم يومًا سعيدًا.`
  },

  suppliers: [],
  customers: [],
  customerLedgers: {},
  purchaseInvoices: [],
  salesInvoices: [],
  products: [],
  workers: [],
  ledgers: {},
  whatsappNotifications: [],
  readAlertIds: [],

  currentActiveSupplierId: null,

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  },

  formatCurrency(amount) {
    const currency = this.settings.currency || 'دج';
    return Number(amount || 0).toLocaleString('ar-DZ') + ' ' + currency;
  },

  // Load from Real Database Server API or LocalStorage
  async init() {
    // 1. First priority: Load from server database API if running
    try {
      const res = await fetch('/api/data?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          this.applyLoadedData(data);
          this.saveToLocalStorage(false);
          console.log('[Store] ✅ Loaded real data from server database (/api/data)');
          if (window.ToushirApp && typeof window.ToushirApp.renderAllViews === 'function') {
            window.ToushirApp.renderAllViews();
          }
          return true;
        }
      }
    } catch (err) {
      console.warn('[Store] Real DB server fetch failed, checking local stores:', err.message);
    }

    // 2. Fallback: Load from LocalStorage if it has valid saved data
    const saved = localStorage.getItem('toushir_erp_store_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          this.applyLoadedData(parsed);
          console.log('[Store] 💾 Loaded real data from LocalStorage store');
          return true;
        }
      } catch (e) {
        console.error('Failed to parse stored ERP data', e);
      }
    }

    // 3. Fallback: Initialize clean state with default workers (no demo data)
    this.seedInitialData();
    return false;
  },

  async restoreRealDatabase() {
  try {
    const res = await fetch('/api/restore-real');
    if (res.ok) {
      const json = await res.json();
      if (json && json.data) {
        this.applyLoadedData(json.data);
        this.saveToLocalStorage(false);
        if (window.ToushirApp) {
          window.ToushirApp.renderAllViews();
          window.ToushirApp.showToast('✅ تم تأكيد واسترجاع قاعدة البيانات الحقيقية بنجاح!', 'success');
        }
        return;
      }
    }
  } catch (_) { }

  if (window.REAL_DATABASE) {
    this.applyLoadedData(window.REAL_DATABASE);
    this.saveToLocalStorage(true);
    if (window.ToushirApp) {
      window.ToushirApp.renderAllViews();
      window.ToushirApp.showToast('✅ تم تحميل وتفعيل قاعدة البيانات الحقيقية بنجاح!', 'success');
    }
  }
},

applyLoadedData(parsed) {
  this.suppliers = parsed.suppliers || [];
  this.customers = parsed.customers || [];
  this.customerLedgers = parsed.customerLedgers || {};
  this.purchaseInvoices = parsed.purchaseInvoices || [];
  this.salesInvoices = parsed.salesInvoices || [];
  this.products = parsed.products || [];
  this.workers = parsed.workers || [];
  this.ledgers = parsed.ledgers || {};
  this.whatsappNotifications = parsed.whatsappNotifications || [];
  this.readAlertIds = parsed.readAlertIds || [];
  if (parsed.settings) this.settings = { ...this.settings, ...parsed.settings };

  // Filter out any leftover demo workers
  const demoNames = ['أحمد المالكي', 'ياسين بن علي', 'عمر فاروق'];
  this.workers = (this.workers || []).filter(w => !demoNames.includes(w.name));
  if (this.workers.length === 0) {
    this.seedWorkers();
  }
},

saveToLocalStorage(syncToServer = true) {
  const payload = {
    suppliers: this.suppliers,
    customers: this.customers,
    customerLedgers: this.customerLedgers,
    purchaseInvoices: this.purchaseInvoices,
    salesInvoices: this.salesInvoices,
    products: this.products,
    workers: this.workers,
    ledgers: this.ledgers,
    whatsappNotifications: this.whatsappNotifications,
    readAlertIds: this.readAlertIds,
    settings: this.settings
  };

  localStorage.setItem('toushir_erp_store_v2', JSON.stringify(payload));

  if (syncToServer) {
    clearTimeout(this._serverSyncTimer);
    this._serverSyncTimer = setTimeout(() => {
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(err => console.warn('[Store] Auto-save to server DB failed:', err.message));
    }, 500);
  }
},

currentWorkerId: 'wrk_1',

  seedWorkers() {
  this.workers = [
    {
      id: 'wrk_1',
      name: 'المدير',
      role: 'مدير النظام (Admin)',
      phone: '0661000000',
      salary: 85000,
      pin: '1234',
      status: 'Active',
      hireDate: new Date().toISOString().slice(0, 10),
      permissions: ['dashboard', 'pos', 'customers', 'suppliers', 'purchases', 'reports', 'settings']
    }
  ];
},

seedInitialData() {

  // Start with an empty business database.
  // Do not load demo/REAL_DATABASE data.
  this.seedWorkers();

  this.suppliers = [];
  this.customers = [];
  this.customerLedgers = {};
  this.products = [];
  this.purchaseInvoices = [];
  this.salesInvoices = [];
  this.ledgers = {};
  this.whatsappNotifications = [];
  this.readAlertIds = [];

  this.saveToLocalStorage(true);
},

  async resetDatabaseToZero() {
  try {
    await fetch('/api/reset', { method: 'POST' });
  } catch (_) { }
  this.seedWorkers();
  this.suppliers = [];
  this.customers = [];
  this.customerLedgers = {};
  this.products = [];
  this.purchaseInvoices = [];
  this.salesInvoices = [];
  this.ledgers = {};
  this.whatsappNotifications = [];
  this.readAlertIds = [];
  localStorage.removeItem('toushir_erp_store_v2');
  localStorage.setItem('toushir_db_version', 'v5_real_database_clean');
  this.saveToLocalStorage(false);
  if (window.ToushirApp) {
    window.ToushirApp.showToast('✅ تم تصفير وتهيئة قاعدة البيانات بنجاح ليصبح كل شيء 0!', 'success');
    window.ToushirApp.showAppLayout();
  }
},

// 🔔 Compute Realtime Smart Alerts (Stock Levels, Expiry Dates & Supplier Dues)
computeAlerts() {
  const alerts = [];
  const readIds = this.readAlertIds || [];
  const products = this.products || [];

  const now = new Date();
  // Normalize today to midnight for precise whole-day calculations
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // 1. Stock Quantities & Expiry Date Checks
  products.forEach(p => {
    const stock = Number(p.stockQuantity !== undefined ? p.stockQuantity : (p.stock !== undefined ? p.stock : 0));

    // 1.1 Low Stock / Out of Stock Check (<= 10 units)
    if (stock <= 10) {
      const isOutOfStock = stock <= 0;
      const alertId = `stock_${p.id || p.name}_${stock}`;
      alerts.push({
        id: alertId,
        type: 'low_stock',
        severity: isOutOfStock ? 'danger' : 'warning',
        icon: isOutOfStock ? '🚨' : '⚠️',
        title: isOutOfStock ? '🚨 نفد المخزون تماماً' : '⚠️ مخزون منخفض',
        productName: p.name,
        productId: p.id || p.name,
        stock: stock,
        message: isOutOfStock
          ? `المنتج: ${p.name} | الكمية المتبقية: 0 قطع (نفد المخزون، يرجى إعادة الطلب فوراً)`
          : `المنتج: ${p.name} | الكمية المتبقية: ${stock} قطع (يرجى إعادة طلب المخزون قبل النفاد)`,
        badgeText: isOutOfStock ? 'نفد (0 قطع)' : `متبقي: ${stock} قطع`,
        badgeClass: isOutOfStock ? 'badge-danger' : 'badge-warning',
        isRead: readIds.includes(alertId),
        timestamp: new Date().toISOString()
      });
    }

    // 1.2 Expiry Date Check
    if (p.expiryDate && typeof p.expiryDate === 'string' && p.expiryDate.trim() !== '') {
      const expDate = new Date(p.expiryDate);
      if (!isNaN(expDate.getTime())) {
        const expMidnight = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate()).getTime();
        const diffDays = Math.round((expMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
        const alertId = `exp_${p.id || p.name}_${p.expiryDate}`;

        if (diffDays <= 0) {
          // Expired product
          alerts.push({
            id: alertId,
            type: 'expired',
            severity: 'danger',
            icon: '🔴',
            title: '🔴 منتج منتهي الصلاحية',
            productName: p.name,
            productId: p.id || p.name,
            expiryDate: p.expiryDate,
            daysRemaining: diffDays,
            message: `المنتج: ${p.name} | تاريخ الانتهاء: ${p.expiryDate} (انتهت الصلاحية منذ ${Math.abs(diffDays)} يوم - يجب شطبه وإتلافه)`,
            badgeText: `منتهي الصلاحية (${p.expiryDate})`,
            badgeClass: 'badge-danger',
            isRead: readIds.includes(alertId),
            timestamp: new Date().toISOString()
          });
        } else if (diffDays <= 15) {
          // Near expiry (<= 15 days)
          alerts.push({
            id: alertId,
            type: 'near_expiry',
            severity: diffDays <= 7 ? 'danger' : 'warning',
            icon: diffDays <= 7 ? '🔴' : '⏰',
            title: '⏰ انتهاء الصلاحية قريب جداً',
            productName: p.name,
            productId: p.id || p.name,
            expiryDate: p.expiryDate,
            daysRemaining: diffDays,
            message: `المنتج: ${p.name} | تاريخ الانتهاء: ${p.expiryDate} | المتبقي: ${diffDays} يومًا فقط`,
            badgeText: `متبقي ${diffDays} يومًا`,
            badgeClass: diffDays <= 7 ? 'badge-danger' : 'badge-warning',
            isRead: readIds.includes(alertId),
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  });

  // 2. Supplier Dues & Debt Warnings
  const currency = this.settings.currency || 'دج';
  (this.suppliers || []).forEach(s => {
    const debt = Number(s.currentDebt || 0);
    if (debt > 150000) {
      const alertId = `sup_debt_${s.id}_${Math.round(debt / 10000)}`;
      alerts.push({
        id: alertId,
        type: 'supplier_debt',
        severity: debt > 500000 ? 'danger' : 'warning',
        icon: '💸',
        title: '💸 ديون مستحقة للمورد واجبة السداد',
        supplierName: s.name,
        supplierId: s.id,
        debt: debt,
        message: `المورد: ${s.name} | إجمالي الديون المستحقة المتراكمة: ${debt.toLocaleString('ar-DZ')} ${currency}`,
        badgeText: `دين: ${debt.toLocaleString('ar-DZ')} دج`,
        badgeClass: debt > 500000 ? 'badge-danger' : 'badge-warning',
        isRead: readIds.includes(alertId),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Sort: Unread first, then expired -> near expiry -> low stock -> supplier debt
  const typePriority = { 'expired': 1, 'near_expiry': 2, 'low_stock': 3, 'supplier_debt': 4 };
  alerts.sort((a, b) => {
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
    return (typePriority[a.type] || 99) - (typePriority[b.type] || 99);
  });

  return alerts;
}
};

// 2. Application UI Controller
window.ToushirApp = {
  async init() {
    await window.ToushirStore.init();

    // Ensure valid workers
    const workers = window.ToushirStore.workers || [];
    const hasValidWorkers = workers.length > 0 && workers.some(w => w.pin && w.id);
    if (!hasValidWorkers) {
      window.ToushirStore.seedWorkers();
    }

    this.setupEventListeners();
    this.setupModals();

    // Check if user is logged in
    const isLoggedIn = sessionStorage.getItem('toushir_logged_in');
    if (isLoggedIn === 'true') {
      this.showAppLayout();
    } else {
      this.showLoginScreen();
    }
  },

  showLoginScreen() {
    const loginOverlay = document.getElementById('login-overlay');
    const appLayout = document.getElementById('app-layout');
    if (loginOverlay) loginOverlay.style.display = 'flex';
    if (appLayout) appLayout.style.display = 'none';

    const emailInput = document.getElementById('login-email-input');
    const passwordInput = document.getElementById('login-password-input');
    const userInput = document.getElementById('login-username-input');
    const pinInp = document.getElementById('login-pin-input');
    const errorBox = document.getElementById('login-error-msg');

    if (errorBox) {
      errorBox.style.display = 'none';
      errorBox.textContent = '';
    }

    if (emailInput) {
      emailInput.value = '';
      setTimeout(() => emailInput.focus(), 200);
    }
    if (passwordInput) passwordInput.value = '';
    if (userInput) userInput.value = '';
    if (pinInp) pinInp.value = '';
  },

  async handleLoginSubmit() {
    const emailInput = document.getElementById('login-email-input');
    const passwordInput = document.getElementById('login-password-input');
    const userInput = document.getElementById('login-username-input');
    const pinInp = document.getElementById('login-pin-input');
    const errorBox = document.getElementById('login-error-msg');

    if (errorBox) {
      errorBox.style.display = 'none';
      errorBox.textContent = '';
    }

    const currentMode = window.currentLoginMode || (emailInput && emailInput.offsetParent !== null ? 'email' : 'pin');
    const emailVal = emailInput ? (emailInput.value || '').trim() : '';
    const passwordVal = passwordInput ? (passwordInput.value || '') : '';
    const rawUsername = userInput ? (userInput.value || '').trim() : '';
    const enteredPin = pinInp ? (pinInp.value || '').trim() : '';

    // Smart detect: if user entered email in any field
    const isEmail = currentMode === 'email' || emailVal.length > 0 || rawUsername.includes('@');

    if (isEmail) {
      const email = emailVal || rawUsername;
      const password = passwordVal || enteredPin;

      if (!email) {
        if (errorBox) {
          errorBox.textContent = '⚠️ يرجى إدخال البريد الإلكتروني.';
          errorBox.style.display = 'block';
        }
        if (emailInput) emailInput.focus();
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        if (errorBox) {
          errorBox.textContent = '⚠️ صيغة البريد الإلكتروني غير صالحة. يرجى التأكد من كتابته بشكل صحيح.';
          errorBox.style.display = 'block';
        }
        if (emailInput) emailInput.focus();
        return;
      }

      if (!password || password.length < 6) {
        if (errorBox) {
          errorBox.textContent = '⚠️ كلمة المرور يجب أن تتكون من 6 خانات أو أكثر.';
          errorBox.style.display = 'block';
        }
        if (passwordInput) passwordInput.focus();
        return;
      }

      const loginBtn = document.getElementById('btn-do-login');
      const origText = loginBtn ? loginBtn.innerHTML : '';
      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = '⏳ جاري تسجيل الدخول بالبريد...';
      }

      try {
        let firebaseUser = null;
        if (window.ToushirAuth && typeof window.ToushirAuth.signIn === 'function') {
          firebaseUser = await window.ToushirAuth.signIn(email, password, true);
        }

        // Establish worker record in store
        let workers = window.ToushirStore.workers || [];
        let worker = workers.find(w => (w.email && w.email.toLowerCase() === email.toLowerCase()) || w.id === 'wrk_1');
        if (!worker) {
          worker = {
            id: 'wrk_' + Date.now(),
            name: (firebaseUser && firebaseUser.displayName) ? firebaseUser.displayName : email.split('@')[0],
            email: email,
            role: 'مدير النظام (Admin)',
            status: 'Active',
            permissions: ['dashboard', 'pos', 'customers', 'suppliers', 'purchases', 'reports', 'settings']
          };
          workers.unshift(worker);
          window.ToushirStore.workers = workers;
        } else {
          worker.email = email;
          if (firebaseUser && firebaseUser.displayName) worker.name = firebaseUser.displayName;
        }

        window.ToushirStore.currentWorkerId = worker.id;
        window.ToushirStore.saveToLocalStorage();
        sessionStorage.setItem('toushir_logged_in', 'true');

        const headerWorker = document.getElementById('header-worker-name');
        if (headerWorker) headerWorker.textContent = worker.name || email.split('@')[0];

        this.showToast(`👋 أهلاً بك! تم تسجيل الدخول بنجاح: ${email}`, 'success');
        this.showAppLayout();
      } catch (err) {
        console.error('[Auth Error]', err);
        let errorMsg = '⚠️ تعذر تسجيل الدخول بالبريد الإلكتروني.';
        if (window.ToushirAuth && typeof window.ToushirAuth.getErrorMessage === 'function') {
          errorMsg = window.ToushirAuth.getErrorMessage(err.code || err.message);
        } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          errorMsg = '⚠️ كلمة المرور أو البريد الإلكتروني غير صحيح!';
        } else if (err.message) {
          errorMsg = `⚠️ ${err.message}`;
        }

        if (errorBox) {
          errorBox.textContent = errorMsg;
          errorBox.style.display = 'block';
        }
        this.showToast(errorMsg, 'error');
      } finally {
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.innerHTML = origText;
        }
      }
      return;
    }

    // PIN Mode
    if (!rawUsername) {
      if (errorBox) {
        errorBox.textContent = '⚠️ يرجى إدخال اسم المستخدم.';
        errorBox.style.display = 'block';
      }
      if (userInput) userInput.focus();
      return;
    }

    const demoNames = ['أحمد المالكي', 'ياسين بن علي', 'عمر فاروق'];
    let workers = (window.ToushirStore.workers || []).filter(w => !demoNames.includes(w.name));
    if (workers.length === 0) {
      workers = [
        {
          id: 'wrk_1',
          name: 'المدير',
          role: 'مدير النظام (Admin)',
          phone: '',
          salary: 0,
          pin: '1234',
          status: 'Active',
          permissions: ['dashboard', 'pos', 'customers', 'suppliers', 'purchases', 'reports', 'settings']
        }
      ];
    }

    const norm = (str) => (str || '')
      .replace(/[\u0640\u064B-\u065F]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    const cleanInput = norm(rawUsername);

    let worker = workers.find(w => norm(w.name) === cleanInput) ||
      workers.find(w => norm(w.name).includes(cleanInput)) ||
      workers.find(w => cleanInput.includes(norm(w.name))) ||
      workers.find(w => norm(w.name).split(' ')[0] === cleanInput.split(' ')[0]) ||
      workers[0];

    if (worker && worker.pin && enteredPin && enteredPin !== worker.pin) {
      if (errorBox) {
        errorBox.textContent = '⚠️ رمز PIN غير صحيح! يرجى إعادة المحاولة.';
        errorBox.style.display = 'block';
      }
      this.showToast('رمز PIN غير صحيح! يرجى التأكد من الرمز وإعادة المحاولة', 'error');
      if (pinInp) {
        pinInp.value = '';
        pinInp.focus();
      }
      return;
    }

    window.ToushirStore.currentWorkerId = worker.id;
    window.ToushirStore.saveToLocalStorage();
    sessionStorage.setItem('toushir_logged_in', 'true');

    // Also trigger Firebase sign-in in background for workers
    if (window.ToushirAuth && typeof window.ToushirAuth.signIn === 'function') {
      window.ToushirAuth.signIn(worker.name, worker.pin || '1234').catch(e => console.warn('[Auth BG]', e));
    }

    this.showToast(`👋 تم تسجيل الدخول بنجاح كـ: ${worker.name}`, 'success');
    this.showAppLayout();
  },

  async handleCreateEmailAccount() {
    const emailInput = document.getElementById('login-email-input');
    const passwordInput = document.getElementById('login-password-input');
    const errorBox = document.getElementById('login-error-msg');

    if (errorBox) {
      errorBox.style.display = 'none';
      errorBox.textContent = '';
    }

    const email = emailInput ? (emailInput.value || '').trim() : '';
    const password = passwordInput ? (passwordInput.value || '') : '';

    if (!email) {
      if (errorBox) {
        errorBox.textContent = '⚠️ يرجى إدخال البريد الإلكتروني الذي تريد التسجيل به.';
        errorBox.style.display = 'block';
      }
      if (emailInput) emailInput.focus();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      if (errorBox) {
        errorBox.textContent = '⚠️ صيغة البريد الإلكتروني غير صالحة.';
        errorBox.style.display = 'block';
      }
      if (emailInput) emailInput.focus();
      return;
    }

    if (!password || password.length < 6) {
      if (errorBox) {
        errorBox.textContent = '⚠️ كلمة المرور يجب أن تتكون من 6 خانات أو أكثر لإنشاء الحساب.';
        errorBox.style.display = 'block';
      }
      if (passwordInput) passwordInput.focus();
      return;
    }

    const loginBtn = document.getElementById('btn-do-login');
    const origText = loginBtn ? loginBtn.innerHTML : '';
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.innerHTML = '⏳ جاري إنشاء الحساب...';
    }

    try {
      if (window.ToushirAuth && typeof window.ToushirAuth.signUp === 'function') {
        await window.ToushirAuth.signUp(email, password, email.split('@')[0]);
      } else if (window.ToushirAuth && typeof window.ToushirAuth.signIn === 'function') {
        await window.ToushirAuth.signIn(email, password, true);
      }

      this.showToast(`🎉 تم إنشاء الحساب بنجاح لـ: ${email}`, 'success');
      // Login directly
      await this.handleLoginSubmit();
    } catch (err) {
      console.error('[SignUp Error]', err);
      let errorMsg = '⚠️ تعذر إنشاء الحساب.';
      if (window.ToushirAuth && typeof window.ToushirAuth.getErrorMessage === 'function') {
        errorMsg = window.ToushirAuth.getErrorMessage(err.code || err.message);
      } else if (err.code === 'auth/email-already-in-use') {
        errorMsg = '⚠️ هذا البريد مسجل مسبقاً! اضغط على زر تسجيل الدخول.';
      } else if (err.message) {
        errorMsg = `⚠️ ${err.message}`;
      }

      if (errorBox) {
        errorBox.textContent = errorMsg;
        errorBox.style.display = 'block';
      }
      this.showToast(errorMsg, 'error');
    } finally {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerHTML = origText;
      }
    }
  },

  logoutUser() {
    sessionStorage.removeItem('toushir_logged_in');
    this.showToast('تم تسجيل الخروج بنجاح', 'info');
    this.showLoginScreen();
  },

  renderAllViews() {
    this.refreshDashboard();

    // Render Initial Views
    if (window.PosModule && typeof window.PosModule.init === 'function') {
      window.PosModule.init();
    } else if (window.PosModule && typeof window.PosModule.renderProductsGrid === 'function') {
      window.PosModule.renderProductsGrid();
    }

    if (window.SupplierModule && typeof window.SupplierModule.renderSuppliersTable === 'function') {
      window.SupplierModule.renderSuppliersTable(window.ToushirStore.suppliers || []);
    }

    if (window.CustomersModule && typeof window.CustomersModule.init === 'function') {
      window.CustomersModule.init();
    }

    if (window.PurchasesModule && typeof window.PurchasesModule.renderPurchasesTable === 'function') {
      window.PurchasesModule.renderPurchasesTable(window.ToushirStore.purchaseInvoices || []);
    }

    if (window.SalesWhatsAppModule && typeof window.SalesWhatsAppModule.renderWhatsAppLogsTable === 'function') {
      window.SalesWhatsAppModule.renderWhatsAppLogsTable();
    }

    if (window.ReportsModule) {
      if (typeof window.ReportsModule.initReportsView === 'function') window.ReportsModule.initReportsView();
      if (typeof window.ReportsModule.initCharts === 'function') window.ReportsModule.initCharts();
    }

    if (typeof this.renderInventoryTable === 'function') {
      this.renderInventoryTable();
    }

    this.renderWorkersTable();
    this.applyWorkerPermissions();
  },

  showAppLayout() {
    const loginOverlay = document.getElementById('login-overlay');
    const appLayout = document.getElementById('app-layout');
    if (loginOverlay) loginOverlay.style.display = 'none';
    if (appLayout) appLayout.style.display = 'flex';

    this.renderAllViews();
  },

  openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('active');
    document.body.classList.add('sidebar-open');
  },

  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
    document.body.classList.remove('sidebar-open');
  },

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
      this.closeSidebar();
    } else {
      this.openSidebar();
    }
  },

  setupEventListeners() {
    // Navigation Routing (with mobile drawer auto-close)
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = item.getAttribute('data-view');
        this.switchView(targetView);
        this.closeSidebar();
      });
    });

    // Dark Theme Toggle
    const btnToggleTheme = document.getElementById('btn-toggle-theme');
    if (btnToggleTheme) {
      btnToggleTheme.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
      });
    }

    // RTL/LTR Toggle
    const btnToggleDir = document.getElementById('btn-toggle-dir');
    if (btnToggleDir) {
      btnToggleDir.addEventListener('click', () => {
        const currentDir = document.body.getAttribute('dir');
        const nextDir = currentDir === 'ltr' ? 'rtl' : 'ltr';
        document.body.setAttribute('dir', nextDir);
      });
    }

    // Sidebar Mobile Drawer Events
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    if (btnToggleSidebar) {
      btnToggleSidebar.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleSidebar();
      });
    }

    const btnCloseSidebar = document.getElementById('btn-close-sidebar');
    if (btnCloseSidebar) {
      btnCloseSidebar.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeSidebar();
      });
    }

    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener('click', () => {
        this.closeSidebar();
      });
    }

    // Close drawer on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeSidebar();
      }
    });

    // Close drawer if resized to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        this.closeSidebar();
      }
    });

    // Dashboard Quick Actions & Chart Filter
    const btnGotoSuppliers = document.getElementById('btn-goto-suppliers');
    if (btnGotoSuppliers) btnGotoSuppliers.addEventListener('click', () => this.switchView('suppliers'));

    const btnDashNewPur = document.getElementById('btn-dash-new-purchase');
    if (btnDashNewPur) btnDashNewPur.addEventListener('click', () => this.openCreatePurchaseModal());

    const dashFilter = document.getElementById('dash-chart-filter');
    const customContainer = document.getElementById('dash-custom-date-container');
    const startDateInp = document.getElementById('dash-chart-start-date');
    const endDateInp = document.getElementById('dash-chart-end-date');
    const chartTitle = document.getElementById('dash-chart-title');

    const updateChartFilter = () => {
      if (!dashFilter) return;
      const val = dashFilter.value;

      const titles = {
        'today': '📈 حركة المشتريات والديون (اليوم / كل يوم)',
        'month': '📈 حركة المشتريات والديون (هذا الشهر)',
        '6m': '📈 حركة المشتريات والديون (آخر 6 أشهر)',
        '1y': '📈 حركة المشتريات والديون (سنة كاملة)',
        'custom': '📈 حركة المشتريات والديون (فترة مخصصة)'
      };

      if (chartTitle && titles[val]) chartTitle.textContent = titles[val];

      if (val === 'custom') {
        if (customContainer) customContainer.style.display = 'flex';
        const start = startDateInp ? startDateInp.value : null;
        const end = endDateInp ? endDateInp.value : null;
        if (window.ReportsModule && window.ReportsModule.initCharts) {
          window.ReportsModule.initCharts('custom', start, end);
        }
      } else {
        if (customContainer) customContainer.style.display = 'none';
        if (window.ReportsModule && window.ReportsModule.initCharts) {
          window.ReportsModule.initCharts(val);
        }
      }
    };

    if (dashFilter) dashFilter.addEventListener('change', updateChartFilter);
    if (startDateInp) startDateInp.addEventListener('change', updateChartFilter);
    if (endDateInp) endDateInp.addEventListener('change', updateChartFilter);

    // Sales Chart Filter Listeners
    const salesFilter = document.getElementById('sales-chart-filter');
    const salesCustomContainer = document.getElementById('sales-custom-date-container');
    const salesStartInp = document.getElementById('sales-chart-start-date');
    const salesEndInp = document.getElementById('sales-chart-end-date');
    const salesChartTitle = document.getElementById('sales-chart-title');

    const updateSalesChartFilter = () => {
      if (!salesFilter) return;
      const val = salesFilter.value;

      const titles = {
        'today': '📊 حركة المبيعات والتسديدات (اليوم / كل يوم)',
        'month': '📊 حركة المبيعات والتسديدات (هذا الشهر)',
        '6m': '📊 حركة المبيعات والتسديدات (آخر 6 أشهر)',
        '1y': '📊 حركة المبيعات والتسديدات (سنة كاملة)',
        'custom': '📊 حركة المبيعات والتسديدات (فترة مخصصة)'
      };

      if (salesChartTitle && titles[val]) salesChartTitle.textContent = titles[val];

      if (val === 'custom') {
        if (salesCustomContainer) salesCustomContainer.style.display = 'flex';
        const start = salesStartInp ? salesStartInp.value : null;
        const end = salesEndInp ? salesEndInp.value : null;
        if (window.ReportsModule && window.ReportsModule.initSalesChart) {
          window.ReportsModule.initSalesChart('custom', start, end);
        }
      } else {
        if (salesCustomContainer) salesCustomContainer.style.display = 'none';
        if (window.ReportsModule && window.ReportsModule.initSalesChart) {
          window.ReportsModule.initSalesChart(val);
        }
      }
    };

    if (salesFilter) salesFilter.addEventListener('change', updateSalesChartFilter);
    if (salesStartInp) salesStartInp.addEventListener('change', updateSalesChartFilter);
    if (salesEndInp) salesEndInp.addEventListener('change', updateSalesChartFilter);

    // Search and Filter Listeners
    const supSearch = document.getElementById('suppliers-search-input');
    if (supSearch) {
      supSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = window.ToushirStore.suppliers.filter(s =>
          s.name.toLowerCase().includes(query) || s.phone.includes(query)
        );
        window.SupplierModule.renderSuppliersTable(filtered);
      });
    }

    const supFilter = document.getElementById('suppliers-status-filter');
    if (supFilter) {
      supFilter.addEventListener('change', (e) => {
        const val = e.target.value;
        const filtered = val === 'all'
          ? window.ToushirStore.suppliers
          : window.ToushirStore.suppliers.filter(s => s.status === val);
        window.SupplierModule.renderSuppliersTable(filtered);
      });
    }

    // Form Submissions
    // 1. Supplier Form
    document.getElementById('form-supplier').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSupplierForm();
    });

    // 2. Payment Form
    document.getElementById('form-payment').addEventListener('submit', (e) => {
      e.preventDefault();
      this.savePaymentForm();
    });

    // 3. Purchase Invoice Form
    document.getElementById('form-purchase-invoice').addEventListener('submit', (e) => {
      e.preventDefault();
      this.savePurchaseInvoiceForm();
    });

    // 3.1 Scale Purchase Invoice Form (مشتريات بالميزان)
    const formPurScale = document.getElementById('form-pur-scale-invoice');
    if (formPurScale) {
      formPurScale.addEventListener('submit', (e) => {
        e.preventDefault();
        this.savePurScaleInvoiceForm();
      });
    }

    const btnAddPurScaleLine = document.getElementById('btn-add-pur-scale-line');
    if (btnAddPurScaleLine) {
      btnAddPurScaleLine.addEventListener('click', () => this.addPurScaleLineRow());
    }

    const btnPurScalePaid = document.getElementById('pur-scale-amount-paid');
    if (btnPurScalePaid) {
      btnPurScalePaid.addEventListener('input', () => this.calculatePurScaleTotal());
    }

    // 3.5 Customer Form (Handled exclusively in modules/customers.js to prevent duplicate submission)

    // 4. POS Credit Sale Form
    const formCreditSale = document.getElementById('form-credit-sale');
    if (formCreditSale) {
      formCreditSale.addEventListener('submit', (e) => {
        e.preventDefault();

        const customerSelect = document.getElementById('sale-customer-select');
        const customerId = customerSelect.value;
        const customer = window.ToushirStore.customers.find(c => c.id === customerId);

        if (!customer) {
          window.ToushirApp.showToast('الرجاء اختيار زبون', 'error');
          return;
        }

        const customerName = customer.name;
        const phone = document.getElementById('sale-customer-phone').value;
        const paid = Number(document.getElementById('sale-amount-paid').value || 0);

        const mockItems = [
          { productName: 'زيت زيتون بكر 1L', quantity: 2, unitPrice: 950 },
          { productName: 'عسل سدر طبيعي 500g', quantity: 1, unitPrice: 3100 }
        ];

        const inv = window.SalesWhatsAppModule.processCreditSaleInvoice(customerName, phone, paid, mockItems);

        const totalMock = 5000;
        const rem = totalMock - paid;
        if (rem > 0 && customer) {
          customer.debt = (customer.debt || 0) + rem;
          customer.totalPurchases = (customer.totalPurchases || 0) + totalMock;
          if (!window.ToushirStore.customerLedgers[customer.id]) {
            window.ToushirStore.customerLedgers[customer.id] = [];
          }
          window.ToushirStore.customerLedgers[customer.id].push({
            id: 'pur_' + Date.now(),
            type: 'Purchase',
            refId: inv ? inv.invoiceNumber : 'INV-SIM',
            amount: totalMock,
            runningBalance: customer.debt,
            date: new Date().toISOString(),
            note: `محاكاة بيع بالدين - مدفوع ${paid} دج`
          });
          window.ToushirStore.saveToLocalStorage();
        }

        if (window.CustomersModule) window.CustomersModule.renderTable();
        this.refreshDashboard();
        if (window.ReportsModule) {
          if (window.ReportsModule.initCharts) window.ReportsModule.initCharts();
          if (window.ReportsModule.initSalesChart) window.ReportsModule.initSalesChart();
        }
      });
    }

    // Live WhatsApp Template Preview update
    const saleCustSelect = document.getElementById('sale-customer-select');
    if (saleCustSelect) {
      saleCustSelect.addEventListener('change', (e) => {
        const option = e.target.options[e.target.selectedIndex];
        const phoneInput = document.getElementById('sale-customer-phone');
        if (phoneInput && option && option.dataset.phone) {
          phoneInput.value = option.dataset.phone;
        }
        this.updateLiveWhatsAppPreview();
      });
    }
    const salePaid = document.getElementById('sale-amount-paid');
    if (salePaid) salePaid.addEventListener('input', () => this.updateLiveWhatsAppPreview());

    // Export Buttons
    const btnExcel = document.getElementById('btn-export-excel');
    if (btnExcel) btnExcel.addEventListener('click', () => window.ReportsModule.exportLedgerToExcel());
    const btnPdf = document.getElementById('btn-export-pdf');
    if (btnPdf) btnPdf.addEventListener('click', () => window.ReportsModule.exportLedgerToPDF());

    // Dynamic Line items in Purchase Form
    const btnAddLine = document.getElementById('btn-add-pur-line');
    if (btnAddLine) btnAddLine.addEventListener('click', () => this.addPurchaseLineItemRow());

    // Share WhatsApp Statement from modal button
    const btnShareWa = document.getElementById('btn-share-supplier-wa');
    if (btnShareWa) btnShareWa.addEventListener('click', () => window.SupplierModule.shareSupplierStatementWhatsApp());

    const btnOpenPay = document.getElementById('btn-open-payment-modal');
    if (btnOpenPay) btnOpenPay.addEventListener('click', () => this.openPaymentModalForCurrentSupplier());

    // Worker Form Submission
    const formWorker = document.getElementById('form-worker');
    if (formWorker) {
      formWorker.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveWorkerForm();
      });
    }

    // 5. Smart Notifications Bell Toggle & Click Outside Handler
    const btnNotif = document.getElementById('btn-notifications');
    if (btnNotif) {
      btnNotif.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleNotificationsDropdown();
      });
    }

    const btnDropMarkAll = document.getElementById('btn-dropdown-mark-all-read');
    if (btnDropMarkAll) {
      btnDropMarkAll.addEventListener('click', (e) => {
        e.stopPropagation();
        this.markAllAlertsAsRead();
      });
    }

    const btnPanelMarkAll = document.getElementById('btn-mark-all-alerts-read');
    if (btnPanelMarkAll) {
      btnPanelMarkAll.addEventListener('click', () => {
        this.markAllAlertsAsRead();
      });
    }

    // Alert Category Filter Buttons
    document.querySelectorAll('.alert-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const filterVal = btn.getAttribute('data-filter') || 'all';
        this.currentAlertFilter = filterVal;
        document.querySelectorAll('.alert-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderSmartAlerts();
      });
    });

    // Close Notifications Dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('notifications-dropdown');
      const btnNotifEl = document.getElementById('btn-notifications');
      if (dropdown && dropdown.style.display === 'flex') {
        if (!dropdown.contains(e.target) && (!btnNotifEl || !btnNotifEl.contains(e.target))) {
          dropdown.style.display = 'none';
        }
      }
    });

    // Quick Stock Adjust Type Toggle buttons
    document.querySelectorAll('.adjust-type-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.adjust-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentAdjustType = btn.getAttribute('data-type') || 'set';
        this.updateAdjustPreview();
      });
    });

    const adjQtyInput = document.getElementById('adjust-qty-val');
    if (adjQtyInput) {
      adjQtyInput.addEventListener('input', () => this.updateAdjustPreview());
    }

    // Inventory Modal Filter & Search Listeners
    const invSearch = document.getElementById('inv-search-input');
    if (invSearch) {
      invSearch.addEventListener('input', () => this.renderInventoryTable());
    }
    const invCat = document.getElementById('inv-category-filter');
    if (invCat) {
      invCat.addEventListener('change', () => this.renderInventoryTable());
    }
    const invStatus = document.getElementById('inv-status-filter');
    if (invStatus) {
      invStatus.addEventListener('change', () => this.renderInventoryTable());
    }
  },

  switchView(viewName) {
    this.closeSidebar();

    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    const targetSection = document.getElementById(`view-${viewName}`);
    const targetNavItem = document.querySelector(`.nav-item[data-view="${viewName}"]`);

    if (targetSection) targetSection.classList.add('active');
    if (targetNavItem) targetNavItem.classList.add('active');

    // Title update
    const titles = {
      'dashboard': 'لوحة التحكم الرئيسية',
      'pos': 'شاشة نقطة البيع السريعة (POS)',
      'suppliers': 'إدارة بيانات الموردين',
      'purchases': 'فواتير المشتريات والمخزون',
      'reports': 'التقارير المالية ودفتر الحسابات العام',
      'settings': 'إعدادات المتجر وإدارة العمال'
    };
    document.getElementById('current-page-title').textContent = titles[viewName] || 'توشير ERP';

    // Re-trigger layout updates
    if (viewName === 'pos' && window.PosModule) {
      window.PosModule.renderProductsGrid();
    }
    if (viewName === 'dashboard') {
      this.refreshDashboard();
      if (window.ReportsModule) {
        setTimeout(() => {
          if (window.ReportsModule.initCharts) window.ReportsModule.initCharts();
          if (window.ReportsModule.initSalesChart) window.ReportsModule.initSalesChart();
        }, 50);
      }
    }
    if (viewName === 'reports') {
      setTimeout(() => {
        if (window.ReportsModule && window.ReportsModule.initReportsView) {
          window.ReportsModule.initReportsView();
        }
      }, 50);
    }
    if (viewName === 'settings') {
      this.renderWorkersTable();
    }
  },

  setupModals() {
    // Open Modal buttons
    const btnOpenSupplier = document.getElementById('btn-open-add-supplier-modal');
    if (btnOpenSupplier) {
      btnOpenSupplier.addEventListener('click', () => {
        document.getElementById('modal-supplier-title').textContent = 'إضافة مورد جديد';
        document.getElementById('form-supplier').reset();
        document.getElementById('supplier-id').value = '';
        document.getElementById('modal-supplier').classList.add('active');
      });
    }

    const btnOpenPurchase = document.getElementById('btn-open-create-purchase-modal');
    if (btnOpenPurchase) {
      btnOpenPurchase.addEventListener('click', () => {
        this.openCreatePurchaseModal();
      });
    }

    const btnOpenPurScale = document.getElementById('btn-open-pur-scale-modal');
    if (btnOpenPurScale) {
      btnOpenPurScale.addEventListener('click', () => {
        this.openPurScaleModal();
      });
    }

    const btnOpenCustomer = document.getElementById('btn-open-add-customer-modal');
    if (btnOpenCustomer) {
      btnOpenCustomer.addEventListener('click', () => {
        const title = document.getElementById('modal-customer-title');
        if (title) title.textContent = 'إضافة زبون جديد';
        const form = document.getElementById('form-customer');
        if (form) form.reset();
        const idInput = document.getElementById('customer-id');
        if (idInput) idInput.value = '';
        const modal = document.getElementById('modal-customer');
        if (modal) modal.classList.add('active');
      });
    }

    const btnOpenWorker = document.getElementById('btn-open-add-worker-modal');
    if (btnOpenWorker) {
      btnOpenWorker.addEventListener('click', (e) => {
        e.preventDefault();
        this.openWorkerModal();
      });
    }

    // Close Modal Buttons
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-modal');
        if (modalId) document.getElementById(modalId).classList.remove('active');
      });
    });
  },

  refreshDashboard() {
    let totalSupplierDebt = 0;
    let totalPurchasesMonth = 0;

    (window.ToushirStore.suppliers || []).forEach(s => {
      totalSupplierDebt += (s.currentDebt || 0);
      totalPurchasesMonth += (s.totalPurchases || 0);
    });

    let totalCustomerDebt = 0;
    if (window.ToushirStore.customers) {
      window.ToushirStore.customers.forEach(c => {
        totalCustomerDebt += (c.debt || 0);
      });
    }

    const currency = window.ToushirStore.settings.currency || 'دج';

    const elSupDebt = document.getElementById('kpi-supplier-debt');
    if (elSupDebt) elSupDebt.textContent = totalSupplierDebt.toLocaleString('ar-DZ') + ' ' + currency;

    const elPurMonth = document.getElementById('kpi-monthly-purchases');
    if (elPurMonth) elPurMonth.textContent = totalPurchasesMonth.toLocaleString('ar-DZ') + ' ' + currency;

    const elSupCount = document.getElementById('kpi-suppliers-count');
    if (elSupCount) elSupCount.textContent = (window.ToushirStore.suppliers || []).length;

    const elWaToday = document.getElementById('kpi-whatsapp-today');
    if (elWaToday) elWaToday.textContent = (window.ToushirStore.whatsappNotifications && window.ToushirStore.whatsappNotifications.length > 0) ? window.ToushirStore.whatsappNotifications.length : 0;

    const elCustCount = document.getElementById('kpi-customers-count');
    if (elCustCount) elCustCount.textContent = (window.ToushirStore.customers && window.ToushirStore.customers.length > 0) ? window.ToushirStore.customers.length : 0;

    const elCustDebt = document.getElementById('kpi-customer-debt');
    if (elCustDebt) elCustDebt.textContent = totalCustomerDebt.toLocaleString('ar-DZ') + ' ' + currency;

    // Calculate Profit & Profit Margin Metrics (Today vs Overall)
    let totalSalesVal = 0;
    let totalSalesCostVal = 0;
    let todaySalesVal = 0;
    let todaySalesCostVal = 0;

    const todayStr = new Date().toDateString();
    const allSales = window.ToushirStore.salesInvoices || [];

    allSales.forEach(inv => {
      const invTotal = Number(inv.totalAmount || inv.total || 0);
      totalSalesVal += invTotal;

      let invCost = 0;
      if (typeof inv.totalCost === 'number' && inv.totalCost > 0) {
        invCost = inv.totalCost;
      } else if (Array.isArray(inv.items) && inv.items.length > 0) {
        inv.items.forEach(item => {
          const qty = Number(item.quantity || 1);
          const storeProd = (window.ToushirStore.products || []).find(p => p.name === item.productName);
          const unitCost = item.unitCost || (storeProd && storeProd.unitCost ? storeProd.unitCost : (item.unitPrice ? item.unitPrice * 0.76 : 0));
          invCost += (unitCost * qty);
        });
      } else {
        invCost = invTotal * 0.76;
      }
      totalSalesCostVal += invCost;

      const invDate = new Date(inv.createdAt || inv.date || Date.now());
      if (invDate.toDateString() === todayStr) {
        todaySalesVal += invTotal;
        todaySalesCostVal += invCost;
      }
    });

    // Today's Profit & Margin
    const todayProfit = Math.max(0, todaySalesVal - todaySalesCostVal);
    const todayMarginRatio = todaySalesVal > 0 ? ((todayProfit / todaySalesVal) * 100).toFixed(1) : '0.0';

    const elTodayProfit = document.getElementById('kpi-today-profit-amount');
    if (elTodayProfit) elTodayProfit.textContent = todayProfit.toLocaleString('ar-DZ') + ' ' + currency;

    const elTodayBadge = document.getElementById('kpi-today-profit-margin-badge');
    if (elTodayBadge) elTodayBadge.textContent = '▲ ' + todayMarginRatio + '%';

    // Overall Profit & Margin
    const netProfit = Math.max(0, totalSalesVal - totalSalesCostVal);
    const profitMarginRatio = totalSalesVal > 0 ? ((netProfit / totalSalesVal) * 100).toFixed(1) : '0.0';

    const elProfitAmount = document.getElementById('kpi-profit-amount');
    if (elProfitAmount) elProfitAmount.textContent = netProfit.toLocaleString('ar-DZ') + ' ' + currency;

    const elProfitBadge = document.getElementById('kpi-profit-margin-badge');
    if (elProfitBadge) elProfitBadge.textContent = '▲ ' + profitMarginRatio + '%';

    const elProfitText = document.getElementById('kpi-profit-margin-text');
    if (elProfitText) elProfitText.textContent = `نسبة هامش الربح الإجمالي التراكمي`;

    // Top Suppliers Dashboard Table
    const topTbody = document.getElementById('dash-top-suppliers-tbody');
    if (topTbody) {
      const topSuppliers = [...(window.ToushirStore.suppliers || [])].sort((a, b) => (b.totalPurchases || 0) - (a.totalPurchases || 0)).slice(0, 5);
      topTbody.innerHTML = topSuppliers.map(s => `
        <tr>
          <td style="font-weight:800; color:var(--primary-teal-dark);">${s.name}</td>
          <td style="font-weight:700;">${(s.totalPurchases || 0).toLocaleString('ar-DZ')} ${currency}</td>
          <td style="color:var(--accent-red); font-weight:900;">${(s.currentDebt || 0).toLocaleString('ar-DZ')} ${currency}</td>
          <td><span class="badge badge-active">نشط</span></td>
        </tr>
      `).join('');
    }

    // Recent Purchases Dashboard Table (Sorted newest first)
    const recTbody = document.getElementById('dash-recent-purchases-tbody');
    if (recTbody) {
      const rec = [...(window.ToushirStore.purchaseInvoices || [])].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || 0).getTime();
        const dateB = new Date(b.createdAt || b.date || 0).getTime();
        return dateB - dateA;
      }).slice(0, 6);
      recTbody.innerHTML = rec.map(p => `
        <tr>
          <td><code style="font-weight:800; color:var(--primary-teal-dark);">${p.invoiceNumber}</code></td>
          <td style="font-weight:700;">${p.supplierName || 'مورد'}</td>
          <td>${new Date(p.createdAt || Date.now()).toLocaleDateString('ar-DZ')}</td>
          <td style="font-weight:800;">${(p.totalAmount || 0).toLocaleString('ar-DZ')} ${currency}</td>
          <td style="color:var(--accent-green); font-weight:700;">${(p.amountPaid || 0).toLocaleString('ar-DZ')} ${currency}</td>
          <td style="color:var(--accent-red); font-weight:900;">${((p.totalAmount || 0) - (p.amountPaid || 0)).toLocaleString('ar-DZ')} ${currency}</td>
          <td><span class="badge badge-confirmed">مؤكدة</span></td>
        </tr>
      `).join('');
    }

    // Recent Sales Dashboard Table (Sorted newest first with Profit & Margin)
    const salesTbody = document.getElementById('dash-recent-sales-tbody');
    if (salesTbody) {
      const sortedSales = [...(window.ToushirStore.salesInvoices || [])].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || 0).getTime();
        const dateB = new Date(b.createdAt || b.date || 0).getTime();
        return dateB - dateA;
      });
      const sales = sortedSales.slice(0, 8);

      if (sales.length === 0) {
        salesTbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align:center; color:var(--text-muted); padding:16px;">لا توجد فواتير مبيعات مسجلة بعد</td>
          </tr>
        `;
      } else {
        salesTbody.innerHTML = sales.map(s => {
          const sTotal = Number(s.totalAmount || s.total || 0);
          let sCost = Number(s.totalCost || 0);
          if (!sCost && Array.isArray(s.items)) {
            s.items.forEach(it => {
              const storeP = (window.ToushirStore.products || []).find(p => p.name === it.productName);
              const c = it.unitCost || (storeP ? storeP.unitCost : (it.unitPrice ? it.unitPrice * 0.76 : 0));
              sCost += (c * (it.quantity || 1));
            });
          }
          if (!sCost) sCost = sTotal * 0.76;
          const sProfit = Math.max(0, sTotal - sCost);
          const sMargin = sTotal > 0 ? ((sProfit / sTotal) * 100).toFixed(1) : '0.0';

          return `
            <tr>
              <td><code style="font-weight:800; color:var(--accent-blue);">${s.invoiceNumber || 'INV-POS'}</code></td>
              <td style="font-weight:700;">${s.customerName || 'عميل عابر (نقداً)'}</td>
              <td>${new Date(s.createdAt || s.date || Date.now()).toLocaleDateString('ar-DZ')}</td>
              <td style="font-weight:800;">${sTotal.toLocaleString('ar-DZ')} ${currency}</td>
              <td style="color:#10b981; font-weight:800;">+ ${sProfit.toLocaleString('ar-DZ')} ${currency}</td>
              <td><span class="badge badge-active" style="background:rgba(139,92,246,0.15); color:#7c3aed; font-weight:800;">${sMargin}%</span></td>
              <td style="color:var(--accent-green); font-weight:700;">${(s.amountPaid || s.paid || 0).toLocaleString('ar-DZ')} ${currency}</td>
              <td style="color:var(--accent-red); font-weight:900;">${(sTotal - (s.amountPaid || s.paid || 0)).toLocaleString('ar-DZ')} ${currency}</td>
            </tr>
          `;
        }).join('');
      }
    }

    // Render Smart Alerts & Header Notifications
    this.renderSmartAlerts();
    this.renderHeaderNotificationsDropdown();
  },

  // ================= WORKERS & EMPLOYEES MANAGEMENT =================
  renderWorkersTable() {
    const tbody = document.getElementById('workers-table-tbody');
    if (!tbody) return;

    const workers = window.ToushirStore.workers || [];
    const currency = window.ToushirStore.settings.currency || 'دج';

    // Update Workers KPI Badges
    const countBadge = document.getElementById('workers-count-badge');
    if (countBadge) countBadge.textContent = `${workers.length} عمال`;

    const totalSalaries = workers.reduce((sum, w) => sum + Number(w.salary || 0), 0);
    const salBadge = document.getElementById('workers-salaries-badge');
    if (salBadge) salBadge.textContent = totalSalaries.toLocaleString('ar-DZ') + ' ' + currency;

    const activeCount = workers.filter(w => w.status === 'Active').length;
    const activeBadge = document.getElementById('workers-active-badge');
    if (activeBadge) activeBadge.textContent = `${activeCount} نشطين`;

    if (workers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; color:var(--text-muted); padding:16px;">لا يوجد عمال مسجلون حالياً</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = workers.map(w => `
      <tr>
        <td style="font-weight:800; color:var(--primary-teal-dark);">${w.name}</td>
        <td><span class="badge badge-active" style="background:rgba(59,130,246,0.12); color:var(--accent-blue); font-weight:700;">${w.role}</span></td>
        <td><code>${w.phone || '-'}</code></td>
        <td style="font-weight:800; color:#10b981;">${Number(w.salary || 0).toLocaleString('ar-DZ')} ${currency}</td>
        <td><code style="background:rgba(0,0,0,0.06); padding:2px 8px; border-radius:4px; font-weight:700;">${w.pin || '****'}</code></td>
        <td>${w.hireDate || new Date().toISOString().slice(0, 10)}</td>
        <td>
          <span class="badge ${w.status === 'Active' ? 'badge-active' : 'badge-draft'}">
            ${w.status === 'Active' ? 'نشط' : 'موقوف'}
          </span>
        </td>
        <td style="text-align:center;">
          <div style="display:flex; gap:6px; justify-content:center;">
            <button class="btn btn-secondary btn-sm" onclick="ToushirApp.openWorkerModal('${w.id}')">✏️ تعديل</button>
            <button class="btn btn-danger btn-sm" onclick="ToushirApp.deleteWorker('${w.id}')">🗑️ حذف</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openWorkerModal(workerId = null) {
    if (typeof workerId !== 'string') workerId = null;

    const form = document.getElementById('form-worker');
    if (form) form.reset();

    const cbs = document.querySelectorAll('.worker-perm-cb');

    if (workerId) {
      const worker = (window.ToushirStore.workers || []).find(w => w.id === workerId);
      if (worker) {
        const titleEl = document.getElementById('modal-worker-title');
        if (titleEl) titleEl.textContent = '✏️ تعديل بيانات العامل والصلاحيات';
        document.getElementById('worker-id').value = worker.id;
        document.getElementById('worker-name').value = worker.name || '';
        document.getElementById('worker-phone').value = worker.phone || '';
        document.getElementById('worker-role').value = worker.role || 'كاشير نقطة البيع (POS)';
        document.getElementById('worker-salary').value = worker.salary || 0;
        document.getElementById('worker-pin').value = worker.pin || '';
        document.getElementById('worker-status').value = worker.status || 'Active';

        const perms = worker.permissions || ['pos', 'customers'];
        cbs.forEach(cb => {
          cb.checked = perms.includes(cb.value);
        });
      }
    } else {
      const titleEl = document.getElementById('modal-worker-title');
      if (titleEl) titleEl.textContent = '👷 إضافة عامل / موظف جديد';
      const idInp = document.getElementById('worker-id');
      if (idInp) idInp.value = '';
      cbs.forEach(cb => cb.checked = true);
    }

    const modal = document.getElementById('modal-worker');
    if (modal) modal.classList.add('active');
  },

  saveWorkerForm() {
    const id = document.getElementById('worker-id').value;
    const name = document.getElementById('worker-name').value;
    const phone = document.getElementById('worker-phone').value;
    const role = document.getElementById('worker-role').value;
    const salary = Number(document.getElementById('worker-salary').value || 0);
    const pin = document.getElementById('worker-pin').value;
    const status = document.getElementById('worker-status').value;

    const checkedPerms = Array.from(document.querySelectorAll('.worker-perm-cb:checked')).map(cb => cb.value);

    if (!name || !phone) {
      this.showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    if (id) {
      const w = window.ToushirStore.workers.find(x => x.id === id);
      if (w) {
        w.name = name; w.phone = phone; w.role = role;
        w.salary = salary; w.pin = pin; w.status = status;
        w.permissions = checkedPerms;
      }
      this.showToast('✓ تم تحديث بيانات العامل والصلاحيات بنجاح', 'success');
    } else {
      const newWorker = {
        id: 'wrk_' + Date.now(),
        name, phone, role, salary, pin, status,
        permissions: checkedPerms,
        hireDate: new Date().toISOString().slice(0, 10)
      };
      window.ToushirStore.workers.push(newWorker);
      this.showToast('✓ تم إضافة العامل الجديد بنجاح', 'success');
    }

    window.ToushirStore.saveToLocalStorage();
    window.ToushirStore.closeModal('modal-worker');
    this.renderWorkersTable();
    this.applyWorkerPermissions();
  },

  // ================= WORKERS ACCESS CONTROL & PERMISSIONS SYSTEM =================
  applyWorkerPermissions() {
    const currentId = window.ToushirStore.currentWorkerId || 'wrk_1';
    const activeWorker = (window.ToushirStore.workers || []).find(w => w.id === currentId) || (window.ToushirStore.workers && window.ToushirStore.workers[0]) || {
      name: 'المدير',
      role: 'مدير النظام (Admin)',
      permissions: ['dashboard', 'pos', 'customers', 'suppliers', 'purchases', 'reports', 'settings']
    };

    // Update Top Header Tag
    const hName = document.getElementById('header-worker-name');
    if (hName) hName.textContent = activeWorker.name;

    const hRole = document.getElementById('header-worker-role');
    if (hRole) hRole.textContent = activeWorker.role;

    // Update Sidebar User Pill
    const sName = document.getElementById('sidebar-user-name');
    if (sName) sName.textContent = activeWorker.name;

    const sRole = document.getElementById('sidebar-user-role');
    if (sRole) sRole.textContent = activeWorker.role;

    const sAvatar = document.getElementById('sidebar-avatar');
    if (sAvatar) sAvatar.textContent = activeWorker.name ? activeWorker.name.charAt(0) : 'م';

    // Enforce Nav Item Visibility
    let perms = activeWorker.permissions;
    if (!perms || !Array.isArray(perms) || perms.length === 0 || (activeWorker.role && activeWorker.role.includes('Admin'))) {
      perms = ['dashboard', 'pos', 'customers', 'suppliers', 'purchases', 'reports', 'settings'];
    }

    document.querySelectorAll('.nav-item').forEach(item => {
      const view = item.getAttribute('data-view');
      if (perms.includes(view)) {
        item.parentElement.style.display = '';
      } else {
        item.parentElement.style.display = 'none';
      }
    });

    // Check if current active view is restricted
    const activeNav = document.querySelector('.nav-item.active');
    const currentActiveView = activeNav ? activeNav.getAttribute('data-view') : 'dashboard';
    if (!perms.includes(currentActiveView) && perms.length > 0) {
      this.switchView(perms[0]);
    }
  },

  openSwitchWorkerModal() {
    const container = document.getElementById('switch-worker-list');
    if (!container) return;

    const workers = window.ToushirStore.workers || [];
    const currentId = window.ToushirStore.currentWorkerId || 'wrk_1';

    container.innerHTML = workers.map(w => {
      const isCurrent = w.id === currentId;
      const permCount = (w.permissions || []).length;
      return `
        <div style="background: var(--bg-card); border: 2px solid ${isCurrent ? 'var(--primary-teal)' : 'var(--border-color)'}; border-radius: var(--radius-md); padding: 14px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: var(--transition);" onclick="ToushirApp.switchActiveWorker('${w.id}')">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 42px; height: 42px; border-radius: 50%; background: ${isCurrent ? 'var(--primary-teal)' : 'rgba(0,0,0,0.06)'}; color: ${isCurrent ? '#fff' : 'var(--text-main)'}; font-weight: 900; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
              ${w.name ? w.name.charAt(0) : 'أ'}
            </div>
            <div>
              <div style="font-weight: 800; color: var(--text-main); font-size: 0.95rem;">
                ${w.name} ${isCurrent ? '<span class="badge badge-active" style="margin-inline-start: 6px;">النشط حالياً</span>' : ''}
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
                ${w.role} • 🔑 (${permCount} صلاحية) ${w.pin ? '🔒 رمز PIN محمي' : ''}
              </div>
            </div>
          </div>
          <button class="btn ${isCurrent ? 'btn-primary' : 'btn-secondary'} btn-sm">
            ${isCurrent ? 'مفعل' : 'تفعيل'}
          </button>
        </div>
      `;
    }).join('');

    window.ToushirStore.openModal('modal-switch-worker');
  },

  switchActiveWorker(workerId) {
    const worker = (window.ToushirStore.workers || []).find(w => w.id === workerId);
    if (!worker) return;

    if (worker.status === 'Suspended') {
      this.showToast('عفواً، حساب هذا العامل موقوف من الإدارة!', 'error');
      return;
    }

    if (worker.pin && workerId !== window.ToushirStore.currentWorkerId) {
      const entered = prompt(`🔒 رمز PIN مطلوب لتسجيل الدخول كـ (${worker.name}):`);
      if (entered === null) return;
      if (entered !== worker.pin) {
        this.showToast('رمز PIN غير صحيح!', 'error');
        return;
      }
    }

    window.ToushirStore.currentWorkerId = workerId;
    window.ToushirStore.saveToLocalStorage();
    window.ToushirStore.closeModal('modal-switch-worker');

    this.applyWorkerPermissions();
    this.showToast(`✓ تم تسجيل الدخول بصفتك: ${worker.name} (${worker.role})`, 'success');
  },

  deleteWorker(workerId) {
    if (confirm('هل أنت تأكد من رغبتك في حذف هذا العامل من النظام؟')) {
      window.ToushirStore.workers = window.ToushirStore.workers.filter(w => w.id !== workerId);
      window.ToushirStore.saveToLocalStorage();
      this.showToast('✓ تم حذف العامل بنجاح', 'success');
      this.renderWorkersTable();
    }
  },

  // Save Add/Edit Supplier Form
  saveSupplierForm() {
    const id = document.getElementById('supplier-id').value;
    const name = document.getElementById('supplier-name').value;
    const phone = document.getElementById('supplier-phone').value;
    const whatsapp = document.getElementById('supplier-whatsapp').value;
    const email = document.getElementById('supplier-email').value;
    const state = document.getElementById('supplier-state').value;
    const city = document.getElementById('supplier-city').value;
    const rc = document.getElementById('supplier-rc').value;
    const nif = document.getElementById('supplier-nif').value;
    const status = document.getElementById('supplier-status').value;

    if (id) {
      // Edit
      const sup = window.ToushirStore.suppliers.find(s => s.id === id);
      if (sup) {
        sup.name = name; sup.phone = phone; sup.whatsapp = whatsapp;
        sup.email = email; sup.state = state; sup.city = city;
        sup.commercialRegisterNo = rc; sup.taxId = nif; sup.status = status;
      }
      this.showToast('تم تحديث بيانات المورد بنجاح', 'success');
    } else {
      // Create new
      const newSup = {
        id: 'sup_' + Date.now(),
        name, phone, whatsapp, email, state, city,
        commercialRegisterNo: rc, taxId: nif, status,
        totalPurchases: 0, totalPaid: 0, currentDebt: 0,
        createdAt: new Date().toISOString()
      };
      window.ToushirStore.suppliers.push(newSup);
      window.ToushirStore.ledgers[newSup.id] = [];
      this.showToast('تم تسجيل المورد الجديد بنجاح', 'success');
    }

    window.ToushirStore.saveToLocalStorage();
    window.SupplierModule.renderSuppliersTable(window.ToushirStore.suppliers);
    this.refreshDashboard();
    document.getElementById('modal-supplier').classList.remove('active');
  },

  populatePurchaseProductsDatalist() {
    const datalist = document.getElementById('pur-datalist-products');
    if (!datalist) return;
    const allP = (window.ToushirStore && window.ToushirStore.products) ? window.ToushirStore.products : [];
    const catalog = (window.PosModule && window.PosModule.getDefaultCatalog) ? window.PosModule.getDefaultCatalog() : [];

    const names = new Set();
    allP.forEach(p => { if (p.name) names.add(p.name); });
    catalog.forEach(p => { if (p.name) names.add(p.name); });

    datalist.innerHTML = Array.from(names).map(n => `<option value="${n}">`).join('');
  },

  // Open Create Purchase Modal
  openCreatePurchaseModal() {
    const editId = document.getElementById('pur-editing-id');
    if (editId) editId.value = '';

    this.populatePurchaseProductsDatalist();

    const select = document.getElementById('pur-supplier-select');
    select.innerHTML = window.ToushirStore.suppliers.map(s => `
      <option value="${s.id}">${s.name} (${s.phone})</option>
    `).join('');

    document.getElementById('pur-invoice-num').value = 'PUR-2026-' + Math.floor(100 + Math.random() * 900);

    // Default line item row
    const container = document.getElementById('pur-items-container');
    container.innerHTML = '';
    this.addPurchaseLineItemRow();

    document.getElementById('modal-purchase').classList.add('active');
  },

  // Open Edit Purchase Modal (for standard and scale invoices)
  openEditPurchaseModal(invoiceId) {
    const inv = window.ToushirStore.purchaseInvoices.find(p => p.id === invoiceId);
    if (!inv) return;

    if (inv.isScaleInvoice) {
      const editInput = document.getElementById('pur-scale-editing-id');
      if (editInput) editInput.value = inv.id;

      const select = document.getElementById('pur-scale-supplier-select');
      if (select) {
        select.innerHTML = window.ToushirStore.suppliers.map(s => `
          <option value="${s.id}" ${s.id === inv.supplierId ? 'selected' : ''}>${s.name} (${s.phone})</option>
        `).join('');
      }

      document.getElementById('pur-scale-invoice-num').value = inv.invoiceNumber;
      document.getElementById('pur-scale-status-select').value = inv.status;
      document.getElementById('pur-scale-amount-paid').value = inv.amountPaid || 0;

      const container = document.getElementById('pur-scale-items-container');
      if (container) {
        container.innerHTML = '';
        if (inv.items && inv.items.length > 0) {
          inv.items.forEach(item => {
            this.addPurScaleLineRow();
            const lastRow = container.lastElementChild;
            if (lastRow) {
              lastRow.querySelector('.pur-scale-item-name').value = item.productName || '';
              lastRow.querySelector('.pur-scale-item-weight').value = item.quantity || 1;
              lastRow.querySelector('.pur-scale-item-cost').value = item.unitCost || 0;
              lastRow.querySelector('.pur-scale-item-sell').value = item.unitPrice || (item.unitCost * 1.25);
            }
          });
        } else {
          this.addPurScaleLineRow();
        }
      }
      this.calculatePurScaleTotal();
      document.getElementById('modal-pur-scale').classList.add('active');
    } else {
      const editInput = document.getElementById('pur-editing-id');
      if (editInput) editInput.value = inv.id;

      this.populatePurchaseProductsDatalist();

      const select = document.getElementById('pur-supplier-select');
      if (select) {
        select.innerHTML = window.ToushirStore.suppliers.map(s => `
          <option value="${s.id}" ${s.id === inv.supplierId ? 'selected' : ''}>${s.name} (${s.phone})</option>
        `).join('');
      }

      document.getElementById('pur-invoice-num').value = inv.invoiceNumber;
      document.getElementById('pur-status-select').value = inv.status;
      document.getElementById('pur-amount-paid').value = inv.amountPaid || 0;

      const container = document.getElementById('pur-items-container');
      if (container) {
        container.innerHTML = '';
        if (inv.items && inv.items.length > 0) {
          inv.items.forEach(item => {
            this.addPurchaseLineItemRow(item);
          });
        } else {
          this.addPurchaseLineItemRow();
        }
      }
      this.calculatePurchaseTotal();
      document.getElementById('modal-purchase').classList.add('active');
    }
  },

  addPurchaseLineItemRow(presetItem = null) {
    const container = document.getElementById('pur-items-container');
    if (!container) return;

    this.populatePurchaseProductsDatalist();

    const div = document.createElement('div');
    div.className = 'pur-item-row';
    div.style.cssText = 'display: flex; flex-direction: column; gap: 10px; background: var(--bg-main); padding: 14px; border-radius: 10px; border: 1px solid var(--border-color); margin-bottom: 12px; position: relative; box-shadow: 0 2px 6px rgba(0,0,0,0.03);';

    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 8px; flex: 1.4; min-width: 200px;">
          <label style="font-size: 0.8rem; font-weight: 800; color: var(--primary-teal-dark); white-space: nowrap;">اسم المنتج:</label>
          <input type="text" list="pur-datalist-products" class="form-control pur-item-name" placeholder="اختر أو اكتب اسم المنتج" required style="font-weight: 700; flex: 1;">
        </div>

        <div style="display: flex; align-items: center; gap: 6px; flex: 1.4; min-width: 220px;">
          <label style="font-size: 0.78rem; font-weight: 800; color: var(--accent-blue); white-space: nowrap;">🏷️ باركود:</label>
          <input type="text" class="form-control pur-item-barcode" placeholder="امسح أو اكتب الرمز" style="font-size: 0.78rem; font-family: monospace; font-weight: 700; flex: 1;">
          <button type="button" class="btn btn-secondary btn-sm pur-btn-gen-barcode" title="توليد باركود تلقائي" style="padding: 4px 8px; font-size: 0.72rem; white-space: nowrap;">⚡ توليد</button>
          <button type="button" class="btn btn-secondary btn-sm pur-btn-scan-barcode" title="مسح الباركود بالكاميرا" style="padding: 4px 8px; font-size: 0.72rem; white-space: nowrap;">📷 مسح</button>
        </div>

        <div style="display: flex; align-items: center; gap: 6px;">
          <select class="form-select pur-unit-type-select" style="font-size: 0.78rem; padding: 4px 8px; border-radius: 6px; font-weight: 800; color: var(--primary-teal-dark); border: 1px solid var(--primary-teal); background: var(--bg-card);">
            <option value="carton" selected>📦 بالكرتون</option>
            <option value="piece">🧩 بالقطعة</option>
          </select>
          <button type="button" class="btn btn-danger btn-sm" style="padding: 4px 10px; font-size: 1.1rem; font-weight: 900; line-height: 1;" onclick="this.closest('.pur-item-row').remove(); ToushirApp.calculatePurchaseTotal();" title="حذف البند">&times;</button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 2fr 1.3fr 1.2fr 1.2fr; gap: 10px; align-items: flex-start; background: var(--bg-card); padding: 10px 12px; border-radius: 8px; border: 1px dashed var(--border-color);">
        <!-- Quantity Container (Piece vs Carton) -->
        <div class="pur-qty-container">
          <div class="pur-piece-qty-box" style="display: none;">
            <label style="font-size: 0.72rem; color: var(--text-muted); display: block; font-weight: 700; margin-bottom: 3px;">الكمية بالقطع:</label>
            <input type="number" class="form-control pur-item-qty" placeholder="الكمية" value="10" min="1" required style="font-weight: 800; text-align: center;">
          </div>
          <div class="pur-carton-qty-box" style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <div>
              <label style="font-size: 0.72rem; color: var(--text-muted); display: block; font-weight: 700; margin-bottom: 3px;">عدد الكراتين:</label>
              <input type="number" class="form-control pur-carton-count" placeholder="كرتون" value="1" min="1" style="font-weight: 800; text-align: center;">
            </div>
            <div>
              <label style="font-size: 0.72rem; color: var(--text-muted); display: block; font-weight: 700; margin-bottom: 3px;">قطع/كرتون:</label>
              <input type="number" class="form-control pur-pieces-per-carton" placeholder="قطع" value="24" min="1" style="font-weight: 800; text-align: center;">
            </div>
          </div>
        </div>

        <!-- Cost Container -->
        <div>
          <label class="pur-cost-label" style="font-size: 0.72rem; color: var(--text-muted); display: block; font-weight: 700; margin-bottom: 3px;">سعر الكرتون (دج):</label>
          <input type="number" class="form-control pur-item-cost" placeholder="سعر الشراء" value="12000" min="0" required style="font-weight: 800; text-align: center;">
          <div class="pur-unit-cost-hint" style="font-size: 0.68rem; color: var(--accent-teal); font-weight: 800; text-align: center; margin-top: 4px; background: rgba(13, 148, 136, 0.08); padding: 2px 4px; border-radius: 4px;">(القطعة: 500 دج | الكلي: 24 قطعة)</div>
        </div>

        <!-- Selling Price Container -->
        <div>
          <label style="font-size: 0.72rem; color: var(--text-muted); display: block; font-weight: 700; margin-bottom: 3px;">سعر بيع القطعة (دج):</label>
          <input type="number" class="form-control pur-item-sell" placeholder="سعر البيع" value="650" min="0" required style="font-weight: 800; text-align: center; color: var(--accent-green);">
        </div>

        <!-- Total Container -->
        <div>
          <label style="font-size: 0.72rem; color: var(--text-muted); display: block; font-weight: 700; margin-bottom: 3px;">إجمالي الشراء:</label>
          <input type="text" class="form-control pur-item-total" value="12,000 دج" readonly style="font-weight: 900; color: var(--accent-red); background: rgba(239, 68, 68, 0.08); text-align: center;">
        </div>
      </div>
    `;
    container.appendChild(div);

    const typeSelect = div.querySelector('.pur-unit-type-select');
    const pieceBox = div.querySelector('.pur-piece-qty-box');
    const cartonBox = div.querySelector('.pur-carton-qty-box');
    const costLabel = div.querySelector('.pur-cost-label');
    const costInp = div.querySelector('.pur-item-cost');
    const sellInp = div.querySelector('.pur-item-sell');
    const qtyInp = div.querySelector('.pur-item-qty');
    const cartonCountInp = div.querySelector('.pur-carton-count');
    const piecesPerCartonInp = div.querySelector('.pur-pieces-per-carton');
    const nameInp = div.querySelector('.pur-item-name');
    const barcodeInp = div.querySelector('.pur-item-barcode');

    // Populate preset item data if editing
    if (presetItem) {
      nameInp.value = presetItem.productName || '';
      barcodeInp.value = presetItem.barcode || '';
      if (presetItem.isCarton) {
        typeSelect.value = 'carton';
        pieceBox.style.display = 'none';
        cartonBox.style.display = 'grid';
        cartonCountInp.value = presetItem.cartonCount || 1;
        piecesPerCartonInp.value = presetItem.piecesPerCarton || 24;
        costInp.value = (presetItem.unitCost * (presetItem.piecesPerCarton || 24)) || 0;
      } else {
        typeSelect.value = 'piece';
        pieceBox.style.display = 'block';
        cartonBox.style.display = 'none';
        qtyInp.value = presetItem.quantity || 1;
        costInp.value = presetItem.unitCost || 0;
      }
      sellInp.value = presetItem.unitPrice || Math.round(presetItem.unitCost * 1.25);
    }

    // Auto-generate unique Barcode Button
    const btnGen = div.querySelector('.pur-btn-gen-barcode');
    if (btnGen) {
      btnGen.addEventListener('click', () => {
        const generated = '613' + Math.floor(1000000 + Math.random() * 9000000);
        barcodeInp.value = generated;
        ToushirApp.showToast(`✓ تم توليد باركود تلقائي: ${generated}`, 'info');
      });
    }

    // Product Lookup helper by barcode or name
    const lookupExistingProduct = (barcodeVal, nameVal) => {
      const allP = (window.ToushirStore && window.ToushirStore.products) ? window.ToushirStore.products : [];
      const catalog = (window.PosModule && window.PosModule.getDefaultCatalog) ? window.PosModule.getDefaultCatalog() : [];

      let found = null;
      if (barcodeVal) {
        found = allP.find(p => p.barcode === barcodeVal) || catalog.find(p => p.barcode === barcodeVal);
      }
      if (!found && nameVal) {
        found = allP.find(p => p.name.trim().toLowerCase() === nameVal.trim().toLowerCase()) ||
          catalog.find(p => p.name.trim().toLowerCase() === nameVal.trim().toLowerCase());
      }

      if (found) {
        if (!nameInp.value && found.name) nameInp.value = found.name;
        if (!barcodeInp.value && found.barcode) barcodeInp.value = found.barcode;
        if (found.unitCost && typeSelect.value === 'piece') costInp.value = found.unitCost;
        if (found.unitPrice) sellInp.value = found.unitPrice;
        if (found.piecesPerCarton) piecesPerCartonInp.value = found.piecesPerCarton;
        ToushirApp.calculatePurchaseTotal();
        ToushirApp.showToast(`✓ تم التعرف على بيانات المادة: ${found.name}`, 'success');
      }
    };

    // Camera Scan Barcode Button
    const btnScan = div.querySelector('.pur-btn-scan-barcode');
    if (btnScan) {
      btnScan.addEventListener('click', () => {
        if (window.PosModule && window.PosModule.startBarcodeCameraScanner) {
          window.PosModule.startBarcodeCameraScanner((scannedCode) => {
            barcodeInp.value = scannedCode;
            lookupExistingProduct(scannedCode, null);
          });
        }
      });
    }

    // Barcode input change or scan enter
    barcodeInp.addEventListener('change', () => {
      if (barcodeInp.value.trim()) lookupExistingProduct(barcodeInp.value.trim(), null);
    });
    barcodeInp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (barcodeInp.value.trim()) lookupExistingProduct(barcodeInp.value.trim(), null);
      }
    });

    // Product Name change
    nameInp.addEventListener('change', () => {
      if (nameInp.value.trim()) lookupExistingProduct(null, nameInp.value.trim());
    });

    typeSelect.addEventListener('change', () => {
      if (typeSelect.value === 'carton') {
        pieceBox.style.display = 'none';
        cartonBox.style.display = 'grid';
        costLabel.textContent = 'سعر الكرتون (دج):';
        costInp.value = 12000;
        sellInp.value = 650;
      } else {
        pieceBox.style.display = 'block';
        cartonBox.style.display = 'none';
        costLabel.textContent = 'سعر الشراء (دج):';
        costInp.value = 500;
        sellInp.value = 625;
      }
      this.calculatePurchaseTotal();
    });

    costInp.addEventListener('input', () => {
      const cost = Number(costInp.value || 0);
      if (typeSelect.value === 'carton') {
        const ppc = Number(piecesPerCartonInp.value || 1);
        const unitCost = ppc > 0 ? (cost / ppc) : cost;
        sellInp.value = Math.round(unitCost * 1.25);
      } else {
        sellInp.value = Math.round(cost * 1.25);
      }
      this.calculatePurchaseTotal();
    });

    [costInp, sellInp, qtyInp, cartonCountInp, piecesPerCartonInp, nameInp, barcodeInp].forEach(inp => inp.addEventListener('input', () => this.calculatePurchaseTotal()));
    this.calculatePurchaseTotal();
  },

  calculatePurchaseTotal() {
    let total = 0;
    const rows = document.querySelectorAll('.pur-item-row');
    const currency = window.ToushirStore.settings.currency || 'دج';

    rows.forEach(row => {
      const typeSelect = row.querySelector('.pur-unit-type-select');
      const type = typeSelect ? typeSelect.value : 'piece';
      let lineTotal = 0;

      if (type === 'carton') {
        const cartons = Number(row.querySelector('.pur-carton-count').value || 0);
        const pieces = Number(row.querySelector('.pur-pieces-per-carton').value || 1);
        const cartonCost = Number(row.querySelector('.pur-item-cost').value || 0);

        const totalPieces = cartons * pieces;
        const unitCost = pieces > 0 ? (cartonCost / pieces) : 0;

        lineTotal = cartons * cartonCost;

        const hintEl = row.querySelector('.pur-unit-cost-hint');
        if (hintEl) {
          hintEl.style.display = 'block';
          hintEl.textContent = `(القطعة: ${Math.round(unitCost)} دج | الكلي: ${totalPieces} قطعة)`;
        }
      } else {
        const q = Number(row.querySelector('.pur-item-qty').value || 0);
        const cost = Number(row.querySelector('.pur-item-cost').value || 0);
        lineTotal = q * cost;
        const hintEl = row.querySelector('.pur-unit-cost-hint');
        if (hintEl) hintEl.style.display = 'none';
      }

      const totalEl = row.querySelector('.pur-item-total');
      if (totalEl) totalEl.value = lineTotal.toLocaleString('ar-DZ') + ' ' + currency;
      total += lineTotal;
    });

    const totalCalcEl = document.getElementById('pur-total-calc');
    if (totalCalcEl) totalCalcEl.value = total.toLocaleString('ar-DZ') + ' ' + currency;
    return total;
  },

  // Save Purchase Invoice Form
  savePurchaseInvoiceForm() {
    const editingIdInput = document.getElementById('pur-editing-id');
    const editingId = editingIdInput ? editingIdInput.value : '';

    const supplierId = document.getElementById('pur-supplier-select').value;
    const invoiceNum = document.getElementById('pur-invoice-num').value;
    const amountPaid = Number(document.getElementById('pur-amount-paid').value || 0);
    const status = document.getElementById('pur-status-select').value;

    const rows = document.querySelectorAll('.pur-item-row');
    let items = [];
    let totalAmount = 0;

    rows.forEach(row => {
      const name = row.querySelector('.pur-item-name').value;
      const barcodeVal = (row.querySelector('.pur-item-barcode') ? row.querySelector('.pur-item-barcode').value.trim() : '');
      const typeSelect = row.querySelector('.pur-unit-type-select');
      const type = typeSelect ? typeSelect.value : 'piece';
      const sell = Number(row.querySelector('.pur-item-sell').value || 0);

      let q = 0;
      let cost = 0;
      let cartonCount = 0;
      let piecesPerCarton = 0;

      if (type === 'carton') {
        cartonCount = Number(row.querySelector('.pur-carton-count').value || 0);
        piecesPerCarton = Number(row.querySelector('.pur-pieces-per-carton').value || 1);
        const cartonCost = Number(row.querySelector('.pur-item-cost').value || 0);

        q = cartonCount * piecesPerCarton;
        cost = piecesPerCarton > 0 ? (cartonCost / piecesPerCarton) : cartonCost;
      } else {
        q = Number(row.querySelector('.pur-item-qty').value || 0);
        cost = Number(row.querySelector('.pur-item-cost').value || 0);
      }

      if (name && q > 0) {
        items.push({
          productName: name,
          barcode: barcodeVal || ('613' + Math.floor(1000000 + Math.random() * 9000000)),
          quantity: q,
          unitCost: Math.round(cost),
          unitPrice: sell || Math.round(cost * 1.25),
          isCarton: type === 'carton',
          cartonCount: cartonCount,
          piecesPerCarton: piecesPerCarton
        });
        totalAmount += (type === 'carton' ? (cartonCount * Number(row.querySelector('.pur-item-cost').value || 0)) : (q * cost));
      }
    });

    if (items.length === 0) {
      this.showToast('يرجى إضافة مادة واحدة على الأقل', 'error');
      return;
    }

    const supplier = window.ToushirStore.suppliers.find(s => s.id === supplierId);

    if (editingId) {
      const inv = window.ToushirStore.purchaseInvoices.find(p => p.id === editingId);
      if (inv) {
        inv.supplierId = supplierId;
        inv.supplierName = supplier ? supplier.name : 'غير معروف';
        inv.invoiceNumber = invoiceNum;
        inv.totalAmount = totalAmount;
        inv.amountPaid = amountPaid;
        inv.items = items;
        inv._isStockUpdated = false;

        if (status === 'Confirmed') {
          window.PurchasesModule.confirmPurchaseInvoice(inv.id);
        } else {
          inv.status = status;
          window.ToushirStore.saveToLocalStorage();
          window.PurchasesModule.renderPurchasesTable(window.ToushirStore.purchaseInvoices);
          this.showToast('تم تحديث الفاتورة بنجاح', 'success');
        }
      }
    } else {
      const newInvoice = {
        id: 'pur_' + Date.now(),
        invoiceNumber: invoiceNum,
        supplierId: supplierId,
        supplierName: supplier ? supplier.name : 'غير معروف',
        status: 'Draft',
        totalAmount: totalAmount,
        amountPaid: amountPaid,
        items: items,
        createdAt: new Date().toISOString()
      };

      window.ToushirStore.purchaseInvoices.unshift(newInvoice);

      if (status === 'Confirmed') {
        window.PurchasesModule.confirmPurchaseInvoice(newInvoice.id);
      } else {
        window.ToushirStore.saveToLocalStorage();
        window.PurchasesModule.renderPurchasesTable(window.ToushirStore.purchaseInvoices);
        this.showToast('تم حفظ الفاتورة كمسودة بنجاح', 'info');
      }
    }

    document.getElementById('modal-purchase').classList.remove('active');
  },

  // Scale Purchases Modal & Methods (مشتريات بالميزان)
  openPurScaleModal() {
    const editId = document.getElementById('pur-scale-editing-id');
    if (editId) editId.value = '';

    const select = document.getElementById('pur-scale-supplier-select');
    if (select) {
      select.innerHTML = window.ToushirStore.suppliers.map(s => `
        <option value="${s.id}">${s.name} (${s.phone})</option>
      `).join('');
    }

    const invNum = document.getElementById('pur-scale-invoice-num');
    if (invNum) invNum.value = 'PUR-S-' + Math.floor(1000 + Math.random() * 9000);

    const container = document.getElementById('pur-scale-items-container');
    if (container) {
      container.innerHTML = '';
      this.addPurScaleLineRow();
      this.addPurScaleLineRow();
    }

    const paidInput = document.getElementById('pur-scale-amount-paid');
    if (paidInput) paidInput.value = 0;

    document.getElementById('modal-pur-scale').classList.add('active');
  },

  addPurScaleLineRow() {
    const container = document.getElementById('pur-scale-items-container');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'pur-scale-item-row';
    div.style.cssText = 'display: grid; grid-template-columns: 2.2fr 1fr 1.2fr 1.2fr 1.2fr 40px; gap: 8px; align-items: center; background: var(--bg-main); padding: 10px; border-radius: 8px; border: 1px solid var(--border-color);';

    div.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <label style="font-size: 0.7rem; color: var(--text-muted); display: block;">اسم المادة الموزونة:</label>
        <input type="text" class="form-control pur-scale-item-name" placeholder="اسم المادة" required style="font-weight: 700;">
      </div>
      <div>
        <label style="font-size: 0.7rem; color: var(--text-muted); display: block;">الوزن (Kg):</label>
        <input type="number" step="0.001" class="form-control pur-scale-item-weight" placeholder="الوزن" value="1.000" min="0.005" required style="font-weight: 800; text-align: center;">
      </div>
      <div>
        <label style="font-size: 0.7rem; color: var(--text-muted); display: block;">سعر الشراء (دج/كلغ):</label>
        <input type="number" class="form-control pur-scale-item-cost" placeholder="سعر الشراء" value="500" min="0" required style="font-weight: 800; text-align: center;">
      </div>
      <div>
        <label style="font-size: 0.7rem; color: var(--text-muted); display: block;">سعر البيع (دج/كلغ):</label>
        <input type="number" class="form-control pur-scale-item-sell" placeholder="سعر البيع" value="650" min="0" required style="font-weight: 800; text-align: center; color: var(--accent-green);">
      </div>
      <div>
        <label style="font-size: 0.7rem; color: var(--text-muted); display: block;">إجمالي الشراء:</label>
        <input type="text" class="form-control pur-scale-item-total" value="500 دج" readonly style="font-weight: 900; color: var(--accent-red); background: rgba(239, 68, 68, 0.05); text-align: center;">
      </div>
      <div style="padding-top: 14px;">
        <button type="button" class="btn btn-danger btn-sm" style="width: 100%; padding: 6px 0;" onclick="this.closest('.pur-scale-item-row').remove(); ToushirApp.calculatePurScaleTotal();">&times;</button>
      </div>
    `;

    container.appendChild(div);

    const nameInput = div.querySelector('.pur-scale-item-name');
    const weightInput = div.querySelector('.pur-scale-item-weight');
    const costInput = div.querySelector('.pur-scale-item-cost');
    const sellInput = div.querySelector('.pur-scale-item-sell');

    costInput.addEventListener('input', () => {
      const cost = Number(costInput.value || 0);
      sellInput.value = Math.round(cost * 1.25);
      this.calculatePurScaleTotal();
    });

    [weightInput, costInput, sellInput, nameInput].forEach(inp => inp.addEventListener('input', () => this.calculatePurScaleTotal()));

    this.calculatePurScaleTotal();
  },

  calculatePurScaleTotal() {
    let grandTotal = 0;
    const rows = document.querySelectorAll('.pur-scale-item-row');
    const currency = window.ToushirStore.settings.currency || 'دج';

    rows.forEach(row => {
      const weight = Number(row.querySelector('.pur-scale-item-weight').value || 0);
      const cost = Number(row.querySelector('.pur-scale-item-cost').value || 0);
      const lineTotal = weight * cost;
      row.querySelector('.pur-scale-item-total').value = lineTotal.toLocaleString('ar-DZ') + ' ' + currency;
      grandTotal += lineTotal;
    });

    const totalEl = document.getElementById('pur-scale-total-calc');
    if (totalEl) totalEl.value = grandTotal.toLocaleString('ar-DZ') + ' ' + currency;
    return grandTotal;
  },

  savePurScaleInvoiceForm() {
    const editingIdInput = document.getElementById('pur-scale-editing-id');
    const editingId = editingIdInput ? editingIdInput.value : '';

    const supplierId = document.getElementById('pur-scale-supplier-select').value;
    const invoiceNum = document.getElementById('pur-scale-invoice-num').value;
    const amountPaid = Number(document.getElementById('pur-scale-amount-paid').value || 0);
    const status = document.getElementById('pur-scale-status-select').value;

    const rows = document.querySelectorAll('.pur-scale-item-row');
    let items = [];
    let totalAmount = 0;

    rows.forEach(row => {
      const name = row.querySelector('.pur-scale-item-name').value;
      const weight = Number(row.querySelector('.pur-scale-item-weight').value || 0);
      const cost = Number(row.querySelector('.pur-scale-item-cost').value || 0);
      const sell = Number(row.querySelector('.pur-scale-item-sell').value || 0);

      if (name && weight > 0) {
        items.push({
          productName: name,
          quantity: weight,
          unitCost: cost,
          unitPrice: sell || Math.round(cost * 1.25),
          isWeighted: true,
          unit: 'كلغ'
        });
        totalAmount += (weight * cost);
      }
    });

    if (items.length === 0) {
      this.showToast('يرجى إضافة مادة موزونة واحدة على الأقل', 'error');
      return;
    }

    const supplier = window.ToushirStore.suppliers.find(s => s.id === supplierId);

    if (editingId) {
      const inv = window.ToushirStore.purchaseInvoices.find(p => p.id === editingId);
      if (inv) {
        inv.supplierId = supplierId;
        inv.supplierName = supplier ? supplier.name : 'غير معروف';
        inv.invoiceNumber = invoiceNum;
        inv.totalAmount = totalAmount;
        inv.amountPaid = amountPaid;
        inv.items = items;
        inv._isStockUpdated = false;

        if (status === 'Confirmed') {
          window.PurchasesModule.confirmPurchaseInvoice(inv.id);
        } else {
          inv.status = status;
          window.ToushirStore.saveToLocalStorage();
          window.PurchasesModule.renderPurchasesTable(window.ToushirStore.purchaseInvoices);
          this.showToast('تم تحديث فاتورة الميزان بنجاح', 'success');
        }
      }
    } else {
      const newInvoice = {
        id: 'pur_scale_' + Date.now(),
        invoiceNumber: invoiceNum,
        supplierId: supplierId,
        supplierName: supplier ? supplier.name : 'غير معروف',
        status: 'Draft',
        totalAmount: totalAmount,
        amountPaid: amountPaid,
        items: items,
        isScaleInvoice: true,
        createdAt: new Date().toISOString()
      };

      window.ToushirStore.purchaseInvoices.unshift(newInvoice);

      if (status === 'Confirmed') {
        window.PurchasesModule.confirmPurchaseInvoice(newInvoice.id);
      } else {
        window.ToushirStore.saveToLocalStorage();
        window.PurchasesModule.renderPurchasesTable(window.ToushirStore.purchaseInvoices);
        this.showToast('تم حفظ فاتورة الميزان كمسودة بنجاح', 'info');
      }
    }

    document.getElementById('modal-pur-scale').classList.remove('active');
  },

  // Open Payment Modal for current supplier
  openPaymentModalForCurrentSupplier() {
    const supplierId = window.ToushirStore.currentActiveSupplierId;
    const supplier = window.ToushirStore.suppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    document.getElementById('pay-supplier-id').value = supplier.id;
    document.getElementById('pay-supplier-name').value = supplier.name;
    document.getElementById('pay-amount').value = Math.min(50000, supplier.currentDebt);
    document.getElementById('modal-payment').classList.add('active');
  },

  savePaymentForm() {
    const supplierId = document.getElementById('pay-supplier-id').value;
    const amount = Number(document.getElementById('pay-amount').value || 0);
    const method = document.getElementById('pay-method').value;
    const note = document.getElementById('pay-note').value;

    const supplier = window.ToushirStore.suppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    supplier.totalPaid += amount;
    supplier.currentDebt = Math.max(0, supplier.currentDebt - amount);

    const ref = 'PAY-' + Math.floor(1000 + Math.random() * 9000);

    if (!window.ToushirStore.ledgers[supplier.id]) {
      window.ToushirStore.ledgers[supplier.id] = [];
    }

    window.ToushirStore.ledgers[supplier.id].push({
      id: 'pay_' + Date.now(),
      type: 'payment',
      reference: `${ref} (${method})`,
      amount: amount,
      runningBalance: supplier.currentDebt,
      date: new Date().toISOString(),
      note: note
    });

    window.ToushirStore.saveToLocalStorage();
    window.SupplierModule.viewSupplierDetail(supplier.id);
    window.SupplierModule.renderSuppliersTable(window.ToushirStore.suppliers);
    this.refreshDashboard();
    if (window.ReportsModule && typeof window.ReportsModule.renderIndebtedSuppliersList === 'function') {
      window.ReportsModule.renderIndebtedSuppliersList();
    }
    document.getElementById('modal-payment').classList.remove('active');
    this.showToast(`✓ تم تسجيل تسديد دفعة بمبلغ ${amount} دج للمورد ${supplier.name}`, 'success');
  },

  updateLiveWhatsAppPreview() {
    let customerName = 'الزبون';
    const select = document.getElementById('sale-customer-select');
    if (select && select.value) {
      const customer = window.ToushirStore.customers.find(c => c.id === select.value);
      if (customer) customerName = customer.name;
    }
    const amountPaid = Number(document.getElementById('sale-amount-paid').value || 0);
    const totalAmount = 5000;
    const remaining = totalAmount - amountPaid;

    const preview = window.SalesWhatsAppModule.generateWhatsAppMessageContent({
      customerName: customerName,
      invoiceNumber: 'INV-2026-8941',
      invoiceDate: new Date().toISOString(),
      items: [
        { productName: 'زيت زيتون بكر 1L', quantity: 2, unitPrice: 950 },
        { productName: 'عسل سدر طبيعي 500g', quantity: 1, unitPrice: 3100 }
      ],
      totalAmount: totalAmount,
      amountPaid: amountPaid,
      remainingAmount: remaining,
      customerBalance: remaining + 11000
    });

    document.getElementById('whatsapp-live-preview').textContent = preview;
    document.getElementById('sale-remaining-amount').value = remaining;
  },

  // ================= 🔔 SMART ALERTS CENTER & INVENTORY MANAGEMENT =================
  currentAlertFilter: 'all',
  currentAdjustType: 'set',

  renderSmartAlerts() {
    const container = document.getElementById('dash-alerts-list-container');
    if (!container) return;

    const alerts = window.ToushirStore.computeAlerts();
    const currency = window.ToushirStore.settings.currency || 'دج';

    // 1. Update filter counts
    const cntAll = document.getElementById('alert-cnt-all');
    if (cntAll) cntAll.textContent = alerts.length;

    const cntExp = document.getElementById('alert-cnt-expired');
    if (cntExp) cntExp.textContent = alerts.filter(a => a.type === 'expired').length;

    const cntNear = document.getElementById('alert-cnt-near-exp');
    if (cntNear) cntNear.textContent = alerts.filter(a => a.type === 'near_expiry').length;

    const cntStock = document.getElementById('alert-cnt-stock');
    if (cntStock) cntStock.textContent = alerts.filter(a => a.type === 'low_stock').length;

    const badgeCount = document.getElementById('dash-alerts-count-badge');
    const unreadCount = alerts.filter(a => !a.isRead).length;
    if (badgeCount) {
      badgeCount.textContent = `${unreadCount} غير مقروء`;
      badgeCount.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }

    // 2. Filter alerts by current active filter
    const activeFilter = this.currentAlertFilter || 'all';
    const filtered = activeFilter === 'all'
      ? alerts
      : alerts.filter(a => a.type === activeFilter);

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="alert-empty-state">
          <div style="font-size: 2rem;">🎉</div>
          <div style="font-weight: 800; font-size: 1rem; color: var(--primary-teal-dark);">
            لا توجد تنبيهات نشطة في هذا القسم حالياً!
          </div>
          <div style="font-size: 0.82rem;">
            مستويات المخزون كافية وصلاحيات المنتجات والديون مضبوطة بالشكل الأمثل.
          </div>
        </div>
      `;
      return;
    }

    // 3. Render smart alert cards
    container.innerHTML = filtered.map(alert => {
      const safeProdName = (alert.productName || '').replace(/'/g, "\\'");
      const safeProdId = alert.productId || '';

      let actionButtonsHtml = '';

      if (alert.type === 'low_stock') {
        actionButtonsHtml += `
          <button type="button" class="btn btn-primary btn-sm" onclick="ToushirApp.quickReorderProduct('${safeProdName}')">
            📦 طلب توريد فوري
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="ToushirApp.openQuickStockAdjustModal('${safeProdId}', '${safeProdName}')">
            ✏️ تعديل الكمية
          </button>
        `;
      } else if (alert.type === 'expired') {
        actionButtonsHtml += `
          <button type="button" class="btn btn-danger btn-sm" onclick="ToushirApp.disposeExpiredStock('${safeProdId}')">
            🗑️ إتلاف وشطب المنتهي
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="ToushirApp.openQuickStockAdjustModal('${safeProdId}', '${safeProdName}')">
            ✏️ تعديل الصلاحية
          </button>
          <button type="button" class="btn btn-primary btn-sm" onclick="ToushirApp.quickReorderProduct('${safeProdName}')">
            📦 طلب بديل جديد
          </button>
        `;
      } else if (alert.type === 'near_expiry') {
        actionButtonsHtml += `
          <button type="button" class="btn btn-secondary btn-sm" onclick="ToushirApp.openQuickStockAdjustModal('${safeProdId}', '${safeProdName}')">
            ✏️ مراجعة الصلاحية والمخزون
          </button>
          <button type="button" class="btn btn-primary btn-sm" onclick="ToushirApp.quickReorderProduct('${safeProdName}')">
            📦 جدولة تموين بديل
          </button>
        `;
      } else if (alert.type === 'supplier_debt') {
        actionButtonsHtml += `
          <button type="button" class="btn btn-primary btn-sm" onclick="ToushirApp.switchView('suppliers'); SupplierModule.viewSupplierDetail('${alert.supplierId}');">
            💳 تسديد دفعة للمورد
          </button>
        `;
      }

      if (!alert.isRead) {
        actionButtonsHtml += `
          <button type="button" class="btn btn-secondary btn-sm" onclick="ToushirApp.markAlertAsRead('${alert.id}')" title="تحديد كمقروء">
            ✓ تحديد كمقروء
          </button>
        `;
      }

      return `
        <div class="smart-alert-item alert-${alert.type} ${alert.isRead ? 'is-read' : ''}" id="alert-card-${alert.id}">
          <div class="alert-icon-box">${alert.icon}</div>
          <div class="alert-content-box">
            <div class="alert-title-row">
              <div class="alert-title-text">${alert.title}</div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span class="badge ${alert.badgeClass}">${alert.badgeText}</span>
                ${alert.isRead ? '<span style="font-size:0.72rem; color:var(--text-muted);">✓ تمت قراءته</span>' : ''}
              </div>
            </div>
            <div class="alert-message-text">${alert.message}</div>
            <div class="alert-actions-row">
              ${actionButtonsHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderHeaderNotificationsDropdown() {
    const dropdownBody = document.getElementById('notifications-dropdown-body');
    const badgeCount = document.getElementById('notifications-badge-count');
    const dropdownBadge = document.getElementById('dropdown-unread-count-badge');

    const alerts = window.ToushirStore.computeAlerts();
    const unreadAlerts = alerts.filter(a => !a.isRead);

    // Update Bell Counter Badge
    if (badgeCount) {
      if (unreadAlerts.length > 0) {
        badgeCount.style.display = 'flex';
        badgeCount.textContent = unreadAlerts.length > 99 ? '99+' : unreadAlerts.length;
      } else {
        badgeCount.style.display = 'none';
      }
    }

    if (dropdownBadge) {
      dropdownBadge.textContent = `${unreadAlerts.length} جديد`;
    }

    if (!dropdownBody) return;

    if (alerts.length === 0) {
      dropdownBody.innerHTML = `
        <div style="text-align: center; padding: 26px 12px; color: var(--text-muted); font-size: 0.85rem;">
          <div style="font-size: 1.8rem; margin-bottom: 6px;">🔔</div>
          لا توجد تنبيهات جديدة في الوقت الحالي
        </div>
      `;
      return;
    }

    dropdownBody.innerHTML = alerts.slice(0, 8).map(alert => `
      <div style="display: flex; gap: 10px; padding: 10px; border-radius: 8px; background: ${alert.isRead ? 'var(--bg-main)' : 'rgba(13,148,136,0.06)'}; border: 1px solid var(--border-color); cursor: pointer; transition: var(--transition);" onclick="ToushirApp.markAlertAsRead('${alert.id}'); ToushirApp.switchView('dashboard'); ToushirApp.toggleNotificationsDropdown(false);">
        <div style="font-size: 1.25rem; flex-shrink: 0; padding-top: 2px;">${alert.icon}</div>
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <div style="font-size: 0.82rem; font-weight: 800; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${alert.title}
            </div>
            <span class="badge ${alert.badgeClass}" style="font-size: 0.65rem; padding: 1px 5px;">${alert.badgeText}</span>
          </div>
          <div style="font-size: 0.76rem; color: var(--text-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${alert.message}
          </div>
        </div>
      </div>
    `).join('');
  },

  toggleNotificationsDropdown(forceState) {
    const dropdown = document.getElementById('notifications-dropdown');
    if (!dropdown) return;

    if (typeof forceState === 'boolean') {
      dropdown.style.display = forceState ? 'flex' : 'none';
    } else {
      dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
    }

    if (dropdown.style.display === 'flex') {
      this.renderHeaderNotificationsDropdown();
    }
  },

  markAllAlertsAsRead() {
    const alerts = window.ToushirStore.computeAlerts();
    if (!window.ToushirStore.readAlertIds) window.ToushirStore.readAlertIds = [];

    alerts.forEach(a => {
      if (!window.ToushirStore.readAlertIds.includes(a.id)) {
        window.ToushirStore.readAlertIds.push(a.id);
      }
    });

    window.ToushirStore.saveToLocalStorage();
    this.renderSmartAlerts();
    this.renderHeaderNotificationsDropdown();
    this.showToast('✓ تم تحديد جميع التنبيهات كمقروءة', 'success');
  },

  markAlertAsRead(alertId) {
    if (!window.ToushirStore.readAlertIds) window.ToushirStore.readAlertIds = [];
    if (!window.ToushirStore.readAlertIds.includes(alertId)) {
      window.ToushirStore.readAlertIds.push(alertId);
      window.ToushirStore.saveToLocalStorage();
    }
    this.renderSmartAlerts();
    this.renderHeaderNotificationsDropdown();
  },

  // 📦 Quick Reorder Product (تموين سريع من المورد)
  quickReorderProduct(productName) {
    this.openCreatePurchaseModal();

    setTimeout(() => {
      const container = document.getElementById('pur-items-container');
      if (container) {
        const firstRow = container.querySelector('.pur-item-row');
        if (firstRow) {
          const nameInput = firstRow.querySelector('.pur-item-name');
          const qtyInput = firstRow.querySelector('.pur-item-qty');
          const cartonInput = firstRow.querySelector('.pur-carton-count');
          const costInput = firstRow.querySelector('.pur-item-cost');
          const sellInput = firstRow.querySelector('.pur-item-sell');

          if (nameInput) nameInput.value = productName;
          if (qtyInput) qtyInput.value = 20;
          if (cartonInput) cartonInput.value = 2;

          const prod = (window.ToushirStore.products || []).find(p => p.name === productName);
          if (prod) {
            if (costInput && prod.unitCost) costInput.value = prod.unitCost;
            if (sellInput && prod.unitPrice) sellInput.value = prod.unitPrice;
          }
          this.calculatePurchaseTotal();
        }
      }
      this.showToast(`📦 تم تجهيز فاتورة شراء لتموين الصنف: ${productName}`, 'info');
    }, 100);
  },

  // ✏️ Quick Stock & Expiry Adjust Modal
  openQuickStockAdjustModal(productId, productName) {
    let prod = (window.ToushirStore.products || []).find(p => (productId && p.id === productId) || p.name === productName);

    if (!prod && window.PosModule && window.PosModule.getDefaultCatalog) {
      const defaultItem = window.PosModule.getDefaultCatalog().find(p => p.name === productName);
      if (defaultItem) {
        prod = {
          id: defaultItem.id || ('p_' + Date.now()),
          name: defaultItem.name,
          category: defaultItem.category || 'غذائية',
          stockQuantity: 10,
          unitPrice: defaultItem.price || 500,
          unitCost: defaultItem.price ? Math.round(defaultItem.price * 0.75) : 380,
          barcode: defaultItem.barcode || '',
          unit: defaultItem.unit || 'قطعة',
          isWeighted: defaultItem.isWeighted || false,
          expiryDate: ''
        };
        window.ToushirStore.products.push(prod);
        window.ToushirStore.saveToLocalStorage();
      }
    }

    if (!prod) {
      this.showToast('عفواً، لم يتم العثور على بيانات المنتج المحددة', 'error');
      return;
    }

    document.getElementById('adjust-prod-id').value = prod.id || prod.name;
    document.getElementById('adjust-prod-name-display').textContent = prod.name;
    document.getElementById('adjust-current-stock-display').textContent = `${prod.stockQuantity || 0} ${prod.unit || (prod.isWeighted ? 'كلغ' : 'قطعة')}`;
    document.getElementById('adjust-current-exp-display').textContent = prod.expiryDate || 'غير مسجل';

    document.getElementById('adjust-qty-val').value = prod.stockQuantity || 0;
    document.getElementById('adjust-expiry-val').value = prod.expiryDate || '';

    // Reset to 'set' mode
    this.currentAdjustType = 'set';
    document.querySelectorAll('.adjust-type-btn').forEach(b => b.classList.remove('active'));
    const btnSet = document.getElementById('btn-adj-set');
    if (btnSet) btnSet.classList.add('active');

    this.updateAdjustPreview();
    window.ToushirStore.openModal('modal-quick-stock-adjust');
  },

  updateAdjustPreview() {
    const prodId = document.getElementById('adjust-prod-id').value;
    const prod = (window.ToushirStore.products || []).find(p => p.id === prodId || p.name === prodId);
    const currStock = Number(prod ? (prod.stockQuantity || 0) : 0);
    const inputVal = Number(document.getElementById('adjust-qty-val').value || 0);

    const type = this.currentAdjustType || 'set';
    let finalStock = currStock;

    const label = document.getElementById('adjust-qty-label');
    if (type === 'set') {
      finalStock = Math.max(0, inputVal);
      if (label) label.textContent = 'الكمية الإجمالية الجديدة المضبوطة *';
    } else if (type === 'add') {
      finalStock = currStock + inputVal;
      if (label) label.textContent = 'الكمية الإضافية المراد زيادتها (+) *';
    } else if (type === 'sub') {
      finalStock = Math.max(0, currStock - inputVal);
      if (label) label.textContent = 'الكمية المراد تخفيضها/شطبها (-) *';
    }

    const unit = prod && prod.unit ? prod.unit : (prod && prod.isWeighted ? 'كلغ' : 'قطعة');
    const previewEl = document.getElementById('adjust-final-preview');
    if (previewEl) {
      previewEl.textContent = `${finalStock} ${unit}`;
    }
  },

  saveQuickStockAdjust() {
    const prodId = document.getElementById('adjust-prod-id').value;
    const prod = (window.ToushirStore.products || []).find(p => p.id === prodId || p.name === prodId);
    if (!prod) return;

    const currStock = Number(prod.stockQuantity || 0);
    const inputVal = Number(document.getElementById('adjust-qty-val').value || 0);
    const type = this.currentAdjustType || 'set';
    const newExp = document.getElementById('adjust-expiry-val').value;
    const reason = document.getElementById('adjust-reason-select').value;

    let finalStock = currStock;
    if (type === 'set') finalStock = Math.max(0, inputVal);
    else if (type === 'add') finalStock = currStock + inputVal;
    else if (type === 'sub') finalStock = Math.max(0, currStock - inputVal);

    prod.stockQuantity = finalStock;
    if (newExp) prod.expiryDate = newExp;

    // Reset read status for this product alerts so it recalculates cleanly
    window.ToushirStore.readAlertIds = (window.ToushirStore.readAlertIds || []).filter(id => !id.includes(prod.id) && !id.includes(prod.name));

    window.ToushirStore.saveToLocalStorage();
    window.ToushirStore.closeModal('modal-quick-stock-adjust');

    this.refreshDashboard();
    if (window.PosModule && window.PosModule.renderProductsGrid) {
      window.PosModule.renderProductsGrid();
    }
    this.renderInventoryTable();
    this.showToast(`✓ تم تحديث مخزون (${prod.name}) إلى ${finalStock} ${prod.unit || 'قطعة'} [${reason}]`, 'success');
  },

  // 🗑️ Dispose Expired Stock
  disposeExpiredStock(productId) {
    const prod = (window.ToushirStore.products || []).find(p => p.id === productId || p.name === productId);
    if (!prod) return;

    const confirmed = confirm(`⚠️ تأكيد الإتلاف والشطب:\n\nهل أنت متأكد من رغبتك في شطب وإتلاف المخزون المنتهي الصلاحية للمنتج:\n"${prod.name}" (المخزون الحالي: ${prod.stockQuantity} قطع)؟\n\nسيتم تصفير الكمية وإزالتها من الجرد النشط.`);
    if (!confirmed) return;

    prod.stockQuantity = 0;
    window.ToushirStore.readAlertIds = (window.ToushirStore.readAlertIds || []).filter(id => !id.includes(prod.id) && !id.includes(prod.name));
    window.ToushirStore.saveToLocalStorage();

    this.refreshDashboard();
    if (window.PosModule && window.PosModule.renderProductsGrid) {
      window.PosModule.renderProductsGrid();
    }
    this.renderInventoryTable();
    this.showToast(`✓ تم إتلاف وشطب الكميات المنتهية الصلاحية لـ (${prod.name}) بنجاح`, 'success');
  },

  // ================= 📊 FULL INVENTORY MANAGEMENT (إدارة المخزون والجرد) =================
  openInventoryModal() {
    window.ToushirStore.openModal('modal-inventory-management');
    this.renderInventoryTable();
  },

  renderInventoryTable() {
    const tbody = document.getElementById('inventory-table-tbody');
    if (!tbody) return;

    const currency = window.ToushirStore.settings.currency || 'دج';

    // Synchronize catalog items
    const allProducts = [];
    const existingNames = new Set();

    (window.ToushirStore.products || []).forEach(p => {
      allProducts.push({
        ...p,
        stockQuantity: Number(p.stockQuantity !== undefined ? p.stockQuantity : 0),
        unitPrice: Number(p.unitPrice || 0),
        unitCost: Number(p.unitCost || (p.unitPrice ? Math.round(p.unitPrice * 0.75) : 300))
      });
      existingNames.add(p.name);
    });

    if (window.PosModule && window.PosModule.getDefaultCatalog) {
      window.PosModule.getDefaultCatalog().forEach(dp => {
        if (!existingNames.has(dp.name)) {
          allProducts.push({
            id: dp.id,
            name: dp.name,
            category: dp.category || 'غذائية',
            barcode: dp.barcode || '',
            stockQuantity: dp.stockQuantity || 35,
            unitPrice: dp.price || 500,
            unitCost: Math.round((dp.price || 500) * 0.75),
            unit: dp.unit || (dp.isWeighted ? 'كلغ' : 'قطعة'),
            isWeighted: dp.isWeighted || false,
            expiryDate: ''
          });
          existingNames.add(dp.name);
        }
      });
    }

    // Filters
    const searchVal = (document.getElementById('inv-search-input')?.value || '').toLowerCase().trim();
    const catVal = document.getElementById('inv-category-filter')?.value || 'all';
    const statusVal = document.getElementById('inv-status-filter')?.value || 'all';

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Compute KPIs across all products
    let totalCostValue = 0;
    let totalRetailValue = 0;
    let criticalCount = 0;

    allProducts.forEach(p => {
      const stock = Number(p.stockQuantity || 0);
      const cost = Number(p.unitCost || 0);
      const price = Number(p.unitPrice || 0);

      totalCostValue += (stock * cost);
      totalRetailValue += (stock * price);

      let isCritical = stock <= 10;
      if (p.expiryDate) {
        const expDate = new Date(p.expiryDate);
        if (!isNaN(expDate.getTime())) {
          const diffDays = Math.round((expDate.getTime() - todayMidnight) / (1000 * 60 * 60 * 24));
          if (diffDays <= 15) isCritical = true;
        }
      }
      if (isCritical) criticalCount++;
    });

    // Update KPI Badges
    const totalCountEl = document.getElementById('inv-kpi-total-prods');
    if (totalCountEl) totalCountEl.textContent = allProducts.length;

    const modalBadge = document.getElementById('inv-badge-count');
    if (modalBadge) modalBadge.textContent = `${allProducts.length} صنف مسجل`;

    const costValEl = document.getElementById('inv-kpi-cost-value');
    if (costValEl) costValEl.textContent = totalCostValue.toLocaleString('ar-DZ') + ' ' + currency;

    const retailValEl = document.getElementById('inv-kpi-retail-value');
    if (retailValEl) retailValEl.textContent = totalRetailValue.toLocaleString('ar-DZ') + ' ' + currency;

    const profitValEl = document.getElementById('inv-kpi-profit-potential');
    const totalProfit = Math.max(0, totalRetailValue - totalCostValue);
    if (profitValEl) profitValEl.textContent = totalProfit.toLocaleString('ar-DZ') + ' ' + currency;

    const critEl = document.getElementById('inv-kpi-critical-count');
    if (critEl) critEl.textContent = criticalCount;

    // Filter list for table display
    const filteredProducts = allProducts.filter(p => {
      const matchesSearch = !searchVal ||
        p.name.toLowerCase().includes(searchVal) ||
        (p.barcode && p.barcode.includes(searchVal));

      const matchesCat = catVal === 'all' || p.category === catVal || (p.categoryName && p.categoryName.includes(catVal));

      let matchesStatus = true;
      const stock = Number(p.stockQuantity || 0);
      let diffDays = 9999;
      if (p.expiryDate) {
        const expDate = new Date(p.expiryDate);
        if (!isNaN(expDate.getTime())) {
          diffDays = Math.round((expDate.getTime() - todayMidnight) / (1000 * 60 * 60 * 24));
        }
      }

      if (statusVal === 'in_stock') matchesStatus = stock > 10 && diffDays > 15;
      else if (statusVal === 'low_stock') matchesStatus = stock > 0 && stock <= 10;
      else if (statusVal === 'out_of_stock') matchesStatus = stock <= 0;
      else if (statusVal === 'expired') matchesStatus = diffDays <= 0;
      else if (statusVal === 'near_expiry') matchesStatus = diffDays > 0 && diffDays <= 15;

      return matchesSearch && matchesCat && matchesStatus;
    });

    if (filteredProducts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 28px; color: var(--text-muted);">
            لا توجد منتجات تطابق شروط البحث والفلترة المحددة.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filteredProducts.map(p => {
      const stock = Number(p.stockQuantity || 0);
      const cost = Number(p.unitCost || 0);
      const price = Number(p.unitPrice || 0);
      const profitPerUnit = Math.max(0, price - cost);
      const marginPct = price > 0 ? ((profitPerUnit / price) * 100).toFixed(0) : '0';

      // Determine stock bar width (out of 100) & status pill
      const barPercent = Math.min(100, Math.max(4, Math.round((stock / 60) * 100)));
      let fillClass = 'stock-fill-safe';
      let statusPill = `<span class="stock-pill" style="background:rgba(16,185,129,0.12); color:#10b981;">🟢 متوفر</span>`;

      if (stock <= 0) {
        fillClass = 'stock-fill-critical';
        statusPill = `<span class="stock-pill" style="background:rgba(239,68,68,0.15); color:#ef4444;">🚨 نفد المخزون</span>`;
      } else if (stock <= 10) {
        fillClass = 'stock-fill-low';
        statusPill = `<span class="stock-pill" style="background:rgba(245,158,11,0.15); color:#d97706;">🟡 منخفض</span>`;
      }

      // Check Expiry Status
      let expText = p.expiryDate || '—';
      if (p.expiryDate) {
        const expDate = new Date(p.expiryDate);
        if (!isNaN(expDate.getTime())) {
          const diffDays = Math.round((expDate.getTime() - todayMidnight) / (1000 * 60 * 60 * 24));
          if (diffDays <= 0) {
            expText = `<span style="color:#ef4444; font-weight:800;">🔴 منتهي (${p.expiryDate})</span>`;
            statusPill = `<span class="stock-pill" style="background:rgba(239,68,68,0.15); color:#ef4444;">🔴 منتهي الصلاحية</span>`;
          } else if (diffDays <= 15) {
            expText = `<span style="color:#d97706; font-weight:800;">⏰ ${diffDays} يوم (${p.expiryDate})</span>`;
          }
        }
      }

      const safeName = p.name.replace(/'/g, "\\'");

      return `
        <tr>
          <td><code style="font-size:0.75rem; font-weight:700;">${p.barcode || '—'}</code></td>
          <td>
            <div style="font-weight:800; color:var(--text-main); font-size:0.92rem;">${p.name}</div>
            <span style="font-size:0.72rem; color:var(--text-muted);">${p.isWeighted ? '⚖️ مادة موزونة' : '📦 بالقطعة/العلبة'}</span>
          </td>
          <td><span class="badge badge-draft" style="font-size:0.72rem;">${p.category || 'عام'}</span></td>
          <td>
            <div class="stock-bar-wrapper">
              <div style="display:flex; justify-content:space-between; font-weight:800; font-size:0.85rem;">
                <span style="color:${stock <= 0 ? 'var(--accent-red)' : 'var(--text-main)'};">${stock} ${p.unit || (p.isWeighted ? 'كلغ' : 'قطعة')}</span>
              </div>
              <div class="stock-progress-track">
                <div class="stock-progress-fill ${fillClass}" style="width: ${stock <= 0 ? '100%' : barPercent + '%'};"></div>
              </div>
            </div>
          </td>
          <td style="font-weight:700; color:var(--text-muted);">${cost.toLocaleString('ar-DZ')} ${currency}</td>
          <td style="font-weight:800; color:var(--primary-teal-dark);">${price.toLocaleString('ar-DZ')} ${currency}</td>
          <td>
            <span class="badge badge-active" style="background:rgba(139,92,246,0.12); color:#7c3aed; font-size:0.72rem;">
              +${marginPct}% (${profitPerUnit.toLocaleString('ar-DZ')})
            </span>
          </td>
          <td style="font-size:0.82rem;">${expText}</td>
          <td>${statusPill}</td>
          <td style="text-align:center;">
            <div style="display:flex; gap:6px; justify-content:center;">
              <button class="btn btn-secondary btn-sm" onclick="ToushirApp.openQuickStockAdjustModal('${p.id}', '${safeName}')" title="تعديل المخزون والصلاحية">
                ✏️ تعديل
              </button>
              <button class="btn btn-primary btn-sm" onclick="ToushirApp.quickReorderProduct('${safeName}'); ToushirApp.closeModal('modal-inventory-management');" title="طلب توريد">
                📦 توريد
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddProductModal() {
    const form = document.getElementById('form-add-product');
    if (form) form.reset();

    const barcodeInp = document.getElementById('newprod-barcode');
    if (barcodeInp) barcodeInp.value = '613' + Math.floor(1000000000 + Math.random() * 9000000000);

    window.ToushirStore.openModal('modal-add-product');
  },

  saveNewProduct() {
    const name = document.getElementById('newprod-name').value.trim();
    const category = document.getElementById('newprod-category').value;
    const unitType = document.getElementById('newprod-unit-type').value;
    const barcode = document.getElementById('newprod-barcode').value.trim();
    const stock = Number(document.getElementById('newprod-stock').value || 0);
    const cost = Number(document.getElementById('newprod-cost').value || 0);
    const price = Number(document.getElementById('newprod-price').value || 0);
    const expiry = document.getElementById('newprod-expiry').value;

    if (!name || price <= 0) {
      this.showToast('يرجى ملء اسم المنتج وسعر البيع بشكل صحيح', 'error');
      return;
    }

    const newProd = {
      id: 'p_' + Date.now(),
      name: name,
      category: category,
      barcode: barcode,
      stockQuantity: stock,
      unitCost: cost,
      unitPrice: price,
      isWeighted: unitType === 'weighted',
      unit: unitType === 'weighted' ? 'كلغ' : 'قطعة',
      expiryDate: expiry || ''
    };

    window.ToushirStore.products.push(newProd);
    window.ToushirStore.saveToLocalStorage();
    window.ToushirStore.closeModal('modal-add-product');

    this.refreshDashboard();
    this.renderInventoryTable();
    if (window.PosModule && window.PosModule.renderProductsGrid) {
      window.PosModule.renderProductsGrid();
    }
    this.showToast(`✓ تم إضافة المنتج (${name}) إلى المخزون بنجاح`, 'success');
  },

  exportInventoryToExcel() {
    if (typeof XLSX === 'undefined') {
      this.showToast('مكتبة تصدير Excel غير محملة', 'error');
      return;
    }

    const products = window.ToushirStore.products || [];
    const data = [
      ['الباركود', 'اسم المنتج', 'الفئة', 'المخزون المتوفر', 'الوحدة', 'سعر التكلفة (دج)', 'سعر البيع (دج)', 'قيمة المخزون الإجمالية (دج)', 'تاريخ الصلاحية']
    ];

    products.forEach(p => {
      const stock = Number(p.stockQuantity || 0);
      const cost = Number(p.unitCost || 0);
      data.push([
        p.barcode || '',
        p.name || '',
        p.category || 'عام',
        stock,
        p.unit || (p.isWeighted ? 'كلغ' : 'قطعة'),
        cost,
        Number(p.unitPrice || 0),
        stock * cost,
        p.expiryDate || 'غير محدد'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المخزون والجرد');
    XLSX.writeFile(wb, `Toushir_Inventory_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);

    this.showToast('✓ تم تصدير تقرير الجرد والمخزون بنجاح إلى ملف Excel', 'success');
  },

  printInventoryReport() {
    window.print();
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};

// Initialize App when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.ToushirApp.init();
});

window.openWorkerModal = function (id) {
  if (window.ToushirApp) window.ToushirApp.openWorkerModal(id);
};
