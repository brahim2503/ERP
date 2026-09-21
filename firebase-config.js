/* ==========================================================================
   TOUSHIR ERP — Firebase Configuration & Initialization
   Uses Firebase v9 compat CDN (no bundler needed for vanilla JS)
   ========================================================================== */

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // Firebase project configuration
  // NOTE: These client-side keys are safe to expose — security is enforced
  //       via Firestore Security Rules & Realtime Database Rules, NOT by
  //       hiding these keys.
  // -------------------------------------------------------------------------
  const firebaseConfig = {
    apiKey: "AIzaSyDFYw-VoxbxqlWJTnv12lOFit6Ki6eC5-g",
    authDomain: "erp-mark.firebaseapp.com",
    databaseURL: "https://erp-mark-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "erp-mark",
    storageBucket: "erp-mark.firebasestorage.app",
    messagingSenderId: "790510675155",
    appId: "1:790510675155:web:9bbf855f9fbc9f8ae76026",
    measurementId: "G-X6PTPL2SZ5"
  };

  // -------------------------------------------------------------------------
  // Initialize Firebase (compat mode — works without ESM/bundler)
  // -------------------------------------------------------------------------
  let app, db, rtdb, auth, analytics;

  try {
    // Prevent double-initialization
    if (firebase.apps.length === 0) {
      app = firebase.initializeApp(firebaseConfig);
    } else {
      app = firebase.apps[0];
    }

    // Firestore
    db = firebase.firestore();
    db.settings({ experimentalForceLongPolling: false, merge: true });

    // Realtime Database
    rtdb = firebase.database();

    // Authentication
    auth = firebase.auth();
    auth.useDeviceLanguage(); // Use browser language for auth emails

    // Analytics (only in production — avoid localhost noise)
    if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      analytics = firebase.analytics();
    }

    console.log('[Firebase] ✅ Initialized successfully — Project:', firebaseConfig.projectId);
  } catch (err) {
    console.error('[Firebase] ❌ Initialization failed:', err.message);
  }

  // -------------------------------------------------------------------------
  // Expose globally so other modules can import
  // -------------------------------------------------------------------------
  window.ToushirFirebase = {
    app,
    db,           // Firestore instance
    rtdb,         // Realtime Database instance
    auth,         // Auth instance
    analytics,    // Analytics (may be undefined on localhost)

    // -----------------------------------------------------------------------
    // Firestore helpers
    // -----------------------------------------------------------------------

    /** Write a document to Firestore */
    async setDoc(collectionPath, docId, data) {
      if (!db) return false;
      try {
        await db.collection(collectionPath).doc(docId).set(data, { merge: true });
        return true;
      } catch (err) {
        console.error(`[Firebase] setDoc error (${collectionPath}/${docId}):`, err.message);
        return false;
      }
    },

    /** Add a document with auto-generated ID */
    async addDoc(collectionPath, data) {
      if (!db) return null;
      try {
        const ref = await db.collection(collectionPath).add({
          ...data,
          _createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          _updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return ref.id;
      } catch (err) {
        console.error(`[Firebase] addDoc error (${collectionPath}):`, err.message);
        return null;
      }
    },

    /** Get all documents from a collection */
    async getCollection(collectionPath) {
      if (!db) return [];
      try {
        const snap = await db.collection(collectionPath).orderBy('_createdAt', 'desc').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        // If no _createdAt field exists yet, fallback without ordering
        try {
          const snap = await db.collection(collectionPath).get();
          return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
          console.error(`[Firebase] getCollection error (${collectionPath}):`, e.message);
          return [];
        }
      }
    },

    /** Delete a document */
    async deleteDoc(collectionPath, docId) {
      if (!db) return false;
      try {
        await db.collection(collectionPath).doc(docId).delete();
        return true;
      } catch (err) {
        console.error(`[Firebase] deleteDoc error (${collectionPath}/${docId}):`, err.message);
        return false;
      }
    },

    /** Listen to a collection in real-time */
    onCollectionSnapshot(collectionPath, callback) {
      if (!db) return () => {};
      const unsubscribe = db.collection(collectionPath)
        .onSnapshot(snap => {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          callback(docs);
        }, err => {
          console.warn(`[Firebase] snapshot error (${collectionPath}):`, err.message);
        });
      return unsubscribe; // Call this to stop listening
    },

    // -----------------------------------------------------------------------
    // Realtime Database helpers
    // -----------------------------------------------------------------------

    /** Write data to a RTDB path */
    async rtdbSet(path, data) {
      if (!rtdb) return false;
      try {
        await rtdb.ref(path).set(data);
        return true;
      } catch (err) {
        console.error(`[Firebase] rtdbSet error (${path}):`, err.message);
        return false;
      }
    },

    /** Read once from RTDB */
    async rtdbGet(path) {
      if (!rtdb) return null;
      try {
        const snap = await rtdb.ref(path).once('value');
        return snap.val();
      } catch (err) {
        console.error(`[Firebase] rtdbGet error (${path}):`, err.message);
        return null;
      }
    },

    /** Listen to RTDB path */
    rtdbListen(path, callback) {
      if (!rtdb) return () => {};
      const ref = rtdb.ref(path);
      ref.on('value', snap => callback(snap.val()));
      return () => ref.off('value'); // Returns unsubscribe function
    },

    // -----------------------------------------------------------------------
    // Status check
    // -----------------------------------------------------------------------
    isReady() {
      return !!(app && db && auth);
    }
  };

  console.log('[Firebase] 🔧 window.ToushirFirebase ready');
})();
