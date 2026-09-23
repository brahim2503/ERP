// ============================================================
// TOUSHIR ERP — Firebase Configuration (React Native)
// Same Firebase project: erp-mark
// ============================================================
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  DocumentData,
} from 'firebase/firestore';
import { getDatabase, ref, set, get, onValue } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyDFYw-VoxbxqlWJTnv12lOFit6Ki6eC5-g',
  authDomain: 'erp-mark.firebaseapp.com',
  databaseURL: 'https://erp-mark-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'erp-mark',
  storageBucket: 'erp-mark.firebasestorage.app',
  messagingSenderId: '790510675155',
  appId: '1:790510675155:web:9bbf855f9fbc9f8ae76026',
  measurementId: 'G-X6PTPL2SZ5',
};

// Prevent double-initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

// ---- Firestore helpers ----

export async function fsAddDoc(collectionPath: string, data: DocumentData) {
  const ref = collection(db, collectionPath);
  const docRef = await addDoc(ref, {
    ...data,
    _createdAt: serverTimestamp(),
    _updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function fsSetDoc(collectionPath: string, docId: string, data: DocumentData) {
  const docRef = doc(db, collectionPath, docId);
  await setDoc(docRef, { ...data, _updatedAt: serverTimestamp() }, { merge: true });
}

export async function fsGetCollection(collectionPath: string) {
  try {
    const q = query(collection(db, collectionPath), orderBy('_createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const snap = await getDocs(collection(db, collectionPath));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

export async function fsDeleteDoc(collectionPath: string, docId: string) {
  await deleteDoc(doc(db, collectionPath, docId));
}

export function fsListen(collectionPath: string, callback: (docs: DocumentData[]) => void) {
  return onSnapshot(collection(db, collectionPath), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export { serverTimestamp };
export default app;
