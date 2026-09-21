/* ==========================================================================
   TOUSHIR ERP — Firebase Data Sync Layer
   Strategy: Offline-first (localStorage) → Firebase
   Syncs ToushirStore data bidirectionally with Firestore & RTDB
   ========================================================================== */

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // Internal state
  // -------------------------------------------------------------------------
  let _syncEnabled = false;
  let _unsubscribers = []; // Collect all onSnapshot listeners
  let _pendingSync = false;

  // Collections map: ToushirStore key → Firestore collection name
  const COLLECTIONS = {
    products:          'products',
    suppliers:         'suppliers',
    customers:         'customers',
    salesInvoices:     'invoices',
    purchaseInvoices:  'purchaseInvoices',
    workers:           'workers',
    whatsappNotifications: 'whatsappNotifications'
  };

  // -------------------------------------------------------------------------
  // Helper: strip undefined values (Firestore rejects them)
  // -------------------------------------------------------------------------
  function cleanData(obj) {
    if (Array.isArray(obj)) return obj.map(cleanData);
    if (obj && typeof obj === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined) out[k] = cleanData(v);
      }
      return out;
    }
    return obj;
  }

  // -------------------------------------------------------------------------
  // Helper: show sync status indicator in UI
  // -------------------------------------------------------------------------
  function setSyncStatus(status) {
    // status: 'syncing' | 'synced' | 'offline' | 'error'
    const icons = { syncing: '🔄', synced: '☁️', offline: '💾', error: '⚠️' };
    const el = document.getElementById('firebase-sync-badge');
    if (el) {
      el.textContent = icons[status] || '☁️';
      el.title = status === 'synced'  ? 'البيانات محفوظة في السحابة'
               : status === 'syncing' ? 'جاري المزامنة...'
               : status === 'offline' ? 'وضع عدم الاتصال — البيانات محفوظة محلياً'
               : 'خطأ في المزامنة';
      el.dataset.status = status;
    }
  }

  // -------------------------------------------------------------------------
  // PUSH: Upload a full array to Firestore (batch write)
  // -------------------------------------------------------------------------
  async function pushCollection(storageKey, collectionName) {
    const fb = window.ToushirFirebase;
    const store = window.ToushirStore;
    if (!fb || !fb.isReady() || !store) return;

    const items = store[storageKey];
    if (!Array.isArray(items) || items.length === 0) return;

    const db = fb.db;
    const BATCH_LIMIT = 400; // Firestore batch limit is 500

    try {
      // Split into chunks to avoid batch size limit
      for (let i = 0; i < items.length; i += BATCH_LIMIT) {
        const chunk = items.slice(i, i + BATCH_LIMIT);
        const batch = db.batch();

        chunk.forEach(item => {
          const docId = item.id || item.invoiceNumber || String(i);
          const ref = db.collection(collectionName).doc(String(docId));
          batch.set(ref, {
            ...cleanData(item),
            _updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        });

        await batch.commit();
      }

      console.log(`[Sync] ✅ Pushed ${items.length} ${collectionName}`);
    } catch (err) {
      console.error(`[Sync] ❌ pushCollection(${collectionName}):`, err.message);
      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // PULL: Load all docs from Firestore into ToushirStore
  // -------------------------------------------------------------------------
  async function pullCollection(storageKey, collectionName) {
    const fb = window.ToushirFirebase;
    const store = window.ToushirStore;
    if (!fb || !fb.isReady() || !store) return false;

    try {
      const docs = await fb.getCollection(collectionName);
      if (Array.isArray(docs) && docs.length > 0) {
        store[storageKey] = docs;
        console.log(`[Sync] ⬇️  Pulled ${docs.length} ${collectionName}`);
        return true;
      }
    } catch (err) {
      console.warn(`[Sync] ⚠️ pullCollection(${collectionName}) skipped:`, err.message);
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // PUSH: Settings (single doc in Firestore)
  // -------------------------------------------------------------------------
  async function pushSettings() {
    const fb = window.ToushirFirebase;
    const store = window.ToushirStore;
    if (!fb || !fb.isReady() || !store) return;

    try {
      await fb.db.collection('settings').doc('app').set(
        cleanData(store.settings),
        { merge: true }
      );
      console.log('[Sync] ✅ Settings pushed');
    } catch (err) {
      console.warn('[Sync] ⚠️ pushSettings skipped:', err.message);
    }
  }

  // -------------------------------------------------------------------------
  // PULL: Settings from Firestore
  // -------------------------------------------------------------------------
  async function pullSettings() {
    const fb = window.ToushirFirebase;
    const store = window.ToushirStore;
    if (!fb || !fb.isReady() || !store) return;

    try {
      const doc = await fb.db.collection('settings').doc('app').get();
      if (doc.exists) {
        store.settings = { ...store.settings, ...doc.data() };
        console.log('[Sync] ⬇️  Settings pulled');
      }
    } catch (err) {
      console.warn('[Sync] ⚠️ pullSettings skipped:', err.message);
    }
  }

  // -------------------------------------------------------------------------
  // Real-time listeners (onSnapshot) for critical collections
  // -------------------------------------------------------------------------
  function startRealtimeListeners() {
    const fb = window.ToushirFirebase;
    const store = window.ToushirStore;
    if (!fb || !fb.isReady()) return;

    // Listen to products changes
    const unsub1 = fb.onCollectionSnapshot('products', (docs) => {
      if (Array.isArray(docs) && docs.length > 0) {
        store.products = docs;
        // Refresh POS grid if visible
        if (window.PosModule && window.PosModule.renderProductsGrid) {
          window.PosModule.renderProductsGrid();
        }
      }
    });

    // Listen to invoices changes
    const unsub2 = fb.onCollectionSnapshot('invoices', (docs) => {
      if (Array.isArray(docs) && docs.length > 0) {
        store.salesInvoices = docs;
        // Refresh dashboard if open
        if (window.ToushirApp && window.ToushirApp.refreshDashboard) {
          window.ToushirApp.refreshDashboard();
        }
      }
    });

    _unsubscribers.push(unsub1, unsub2);
    console.log('[Sync] 👂 Real-time listeners started');
  }

  // -------------------------------------------------------------------------
  // Full sync: Pull everything from Firebase, then save to localStorage
  // -------------------------------------------------------------------------
  async function fullPull() {
    setSyncStatus('syncing');
    try {
      await pullSettings();
      let anyPulled = false;
      for (const [storeKey, colName] of Object.entries(COLLECTIONS)) {
        const pulled = await pullCollection(storeKey, colName);
        if (pulled) anyPulled = true;
      }
      // Only persist to localStorage if actual non-empty data was pulled from cloud
      if (anyPulled && window.ToushirStore && window.ToushirStore.saveToLocalStorage) {
        window.ToushirStore.saveToLocalStorage(false);
      }
      setSyncStatus('synced');
      console.log('[Sync] ✅ Full pull complete (anyPulled:', anyPulled, ')');
    } catch (err) {
      console.warn('[Sync] ⚠️ Full pull skipped due to permission:', err.message);
      setSyncStatus('offline');
    }
  }

  // -------------------------------------------------------------------------
  // Full sync: Push everything from localStorage → Firebase
  // -------------------------------------------------------------------------
  async function fullPush() {
    if (_pendingSync) return; // Debounce
    _pendingSync = true;
    setSyncStatus('syncing');

    try {
      await pushSettings();
      for (const [storeKey, colName] of Object.entries(COLLECTIONS)) {
        await pushCollection(storeKey, colName);
      }
      setSyncStatus('synced');
      console.log('[Sync] ✅ Full push complete');
    } catch (err) {
      console.warn('[Sync] ⚠️ Full push skipped due to cloud permissions:', err.message);
      setSyncStatus('offline');
    } finally {
      _pendingSync = false;
    }
  }

  // -------------------------------------------------------------------------
  // Patch ToushirStore.saveToLocalStorage to also sync to Firebase
  // -------------------------------------------------------------------------
  function patchSaveToLocalStorage() {
    const store = window.ToushirStore;
    if (!store || !store.saveToLocalStorage) return;

    const _original = store.saveToLocalStorage.bind(store);

    store.saveToLocalStorage = function () {
      // Always save locally first
      _original();

      // Then push to Firebase if sync is enabled and user is authenticated
      if (_syncEnabled && window.ToushirFirebase && window.ToushirFirebase.auth) {
        const user = window.ToushirFirebase.auth.currentUser;
        if (user) {
          // Debounced push — max once every 2 seconds
          clearTimeout(store._syncTimer);
          store._syncTimer = setTimeout(() => fullPush(), 2000);
        }
      }
    };

    console.log('[Sync] 🔧 saveToLocalStorage patched with Firebase sync');
  }

  // -------------------------------------------------------------------------
  // Initialize sync (called after auth state is known)
  // -------------------------------------------------------------------------
  async function initSync(isAdmin) {
    _syncEnabled = true;

    try {
      // 1. Pull fresh data from Firebase (cloud wins on first load)
      await fullPull();

      // 2. Start real-time listeners
      startRealtimeListeners();

      // 3. Patch saveToLocalStorage for future changes
      patchSaveToLocalStorage();

      // 4. Handle online/offline events
      window.addEventListener('online', () => {
        setSyncStatus('syncing');
        fullPush().then(() => setSyncStatus('synced'));
      });
      window.addEventListener('offline', () => setSyncStatus('offline'));

      // Initial status
      setSyncStatus(navigator.onLine ? 'synced' : 'offline');

      console.log('[Sync] 🚀 Firebase sync initialized. isAdmin:', isAdmin);
    } catch (err) {
      console.error('[Sync] ❌ initSync failed:', err);
      setSyncStatus('error');
    }
  }

  // -------------------------------------------------------------------------
  // Stop all listeners (called on logout)
  // -------------------------------------------------------------------------
  function stopSync() {
    _syncEnabled = false;
    _unsubscribers.forEach(fn => { try { fn(); } catch (_) {} });
    _unsubscribers = [];
    setSyncStatus('offline');
    console.log('[Sync] 🛑 Sync stopped');
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------
  window.ToushirSync = {
    initSync,
    stopSync,
    fullPull,
    fullPush,
    pushCollection,
    pullCollection,
    setSyncStatus,

    /** Push a single item to a specific collection */
    async pushItem(collectionName, item) {
      const fb = window.ToushirFirebase;
      if (!fb || !fb.isReady()) return;
      const docId = String(item.id || item.invoiceNumber || Date.now());
      await fb.setDoc(collectionName, docId, {
        ...cleanData(item),
        _updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    },

    /** Clear all cloud collections */
    async clearCloudCollections() {
      const fb = window.ToushirFirebase;
      if (!fb || !fb.isReady()) return;
      for (const col of Object.values(COLLECTIONS)) {
        try {
          const snap = await fb.db.collection(col).get();
          if (!snap.empty) {
            const batch = fb.db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
          }
        } catch(e) {
          console.warn(`[Sync] Could not clear cloud collection ${col}:`, e.message);
        }
      }
    }
  };

  console.log('[Sync] 🔧 window.ToushirSync ready');
})();
