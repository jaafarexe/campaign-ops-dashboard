import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  Firestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  // Force long polling: WebView/corporate-proxy environments often fail the
  // default gRPC-web streaming transport. This is a key part of the v4
  // connectivity fix ("offline" complaints on real devices).
  db = initializeFirestore(
    app,
    { experimentalForceLongPolling: true },
    firebaseConfig.firestoreDatabaseId
  );
  auth = getAuth(app);
} catch (e) {
  console.warn('Firebase initialization error:', e);
}

export function getFirebaseApp(): FirebaseApp | null {
  return app;
}

export async function testFirebaseConnection(): Promise<boolean> {
  if (!db) return false;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    // Reaching the server (even with permission denied for /test/connection) confirms connection
    return true;
  }
}

export { db, auth, firebaseConfig };
