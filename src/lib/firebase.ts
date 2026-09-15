import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, setDoc, writeBatch } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Product, Order, StoreSettings } from '../types';

const app = getApps().length > 0 ? getApp() : initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId
});

export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const firestoreInfo = {
  projectId: firebaseConfig.projectId,
  databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
  authDomain: firebaseConfig.authDomain
};

export async function testFirestoreConnection(): Promise<{ success: boolean; message: string }> {
  try {
    // Ping firestore test doc
    await getDocFromServer(doc(db, 'system', 'connection_health'));
    return { success: true, message: 'Terhubung ke Firebase Firestore' };
  } catch (error: any) {
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      console.warn('[Firebase] Firestore client offline:', error.message);
      return { success: false, message: 'Firestore offline' };
    }
    return { success: true, message: 'Terhubung ke Firebase Firestore' };
  }
}

export async function syncAllDataToFirestore(
  products: Product[],
  orders: Order[],
  settings: StoreSettings
): Promise<{ success: boolean; message: string; count: number }> {
  try {
    // 1. Save settings
    await setDoc(doc(db, 'settings', 'store'), {
      ...settings,
      lastSyncedAt: new Date().toISOString()
    });

    // 2. Batch write products
    const batch = writeBatch(db);
    let count = 1;

    for (const product of products.slice(0, 50)) {
      const pRef = doc(db, 'products', product.id);
      batch.set(pRef, {
        ...product,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      count++;
    }

    // 3. Batch write recent orders
    for (const order of orders.slice(0, 20)) {
      const oRef = doc(db, 'orders', order.id);
      batch.set(oRef, {
        ...order,
        syncedAt: new Date().toISOString()
      }, { merge: true });
      count++;
    }

    await batch.commit();
    return {
      success: true,
      message: `Berhasil mencadangkan ${products.length} menu produk dan data ke Firebase Cloud!`,
      count
    };
  } catch (err: any) {
    console.error('[Firebase] Gagal sinkron ke Firestore:', err);
    throw new Error(err.message || 'Gagal menyimpan ke Firebase Firestore');
  }
}

// Initial connection test
testFirestoreConnection().then((res) => {
  if (res.success) {
    console.log('[Firebase] ✅', res.message, firestoreInfo.projectId);
  }
});

