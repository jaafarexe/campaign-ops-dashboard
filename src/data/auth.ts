/**
 * Account layer for لوحة المحرّر v4 — Google sign-in bound to roles.
 *
 * Native (Android APK): FirebaseAuthentication plugin → native Google flow
 * (WebView OAuth popups are blocked by Google — native flow only). The
 * returned Google credential is bridged into the Firebase JS SDK with
 * signInWithCredential, so Firestore calls carry the ID token. The JS SDK
 * persists its own session (IndexedDB), so the account is remembered across
 * restarts — "the app remembers who's signed in".
 *
 * Web preview: standard signInWithPopup fallback (native flow unavailable).
 */
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signOut as jsSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebase';

export interface AuthAccount {
  email: string; // always lowercase
  displayName: string | null;
  uid: string;
}

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function toAccount(u: FirebaseUser): AuthAccount {
  return {
    email: (u.email ?? '').toLowerCase(),
    displayName: u.displayName ?? null,
    uid: u.uid,
  };
}

function requireJsAuth() {
  if (!auth) throw new Error('تهيئة المصادقة غير جاهزة.');
  return auth;
}

/** Google sign-in. Resolves with the signed-in account. */
export async function googleSignIn(): Promise<AuthAccount> {
  const jsAuth = requireJsAuth();
  if (isNativeApp()) {
    // Native Google flow (Credential Manager / Google Sign-In). Never a WebView popup.
    const result = await FirebaseAuthentication.signInWithGoogle();
    const nativeUser = result.user;
    const nativeEmail = (nativeUser?.email ?? '').toLowerCase();
    if (!nativeUser || !nativeEmail) {
      throw new Error('لم يتم اختيار حساب جوجل.');
    }
    const idToken = result.credential?.idToken;
    if (!idToken) {
      throw new Error('تعذّر الحصول على بيانات الدخول من جوجل — أعد المحاولة.');
    }
    // Bridge the native Google credential into the JS SDK so Firestore
    // requests carry this account's ID token.
    await signInWithCredential(
      jsAuth,
      GoogleAuthProvider.credential(idToken, result.credential?.accessToken ?? null)
    );
    const jsUser = jsAuth.currentUser;
    if (!jsUser || !jsUser.email) {
      throw new Error('تم الدخول عبر جوجل لكن تعذّر تفعيل الجلسة — أعد المحاولة.');
    }
    return toAccount(jsUser);
  }
  // Web preview fallback
  const cred = await signInWithPopup(jsAuth, new GoogleAuthProvider());
  if (!cred.user.email) throw new Error('لم يتم اختيار حساب جوجل.');
  return toAccount(cred.user);
}

/** Sign out everywhere (native + JS), clearing the remembered session. */
export async function signOutAll(): Promise<void> {
  const jsAuth = requireJsAuth();
  try {
    if (isNativeApp()) {
      await FirebaseAuthentication.signOut();
    }
  } catch (e) {
    console.warn('Native sign-out issue (continuing):', e);
  }
  await jsSignOut(jsAuth);
}

/**
 * Single source of truth for the UI: the JS SDK auth state (what Firestore uses).
 * On native, also mirrors native sign-out into the JS session.
 */
export function onAccountChange(cb: (account: AuthAccount | null) => void): () => void {
  const jsAuth = requireJsAuth();
  let nativeHandle: { remove: () => Promise<void> } | null = null;
  if (isNativeApp()) {
    FirebaseAuthentication.addListener('authStateChange', async (change) => {
      try {
        if (!change.user) {
          // Signed out natively → drop the JS session too.
          if (jsAuth.currentUser) await jsSignOut(jsAuth);
        } else if (!jsAuth.currentUser) {
          // Native has a session but the JS one is gone (e.g. WebView data
          // cleared). We cannot re-bridge without a fresh Google credential,
          // so drop the native session and force a clean sign-in.
          await FirebaseAuthentication.signOut();
        }
      } catch (e) {
        console.warn('authStateChange sync issue:', e);
      }
    }).then((h) => {
      nativeHandle = h;
    }).catch((e) => console.warn('authStateChange listener failed:', e));
  }
  const unsub = onAuthStateChanged(jsAuth, (u) => {
    cb(u && u.email ? toAccount(u) : null);
  });
  return () => {
    unsub();
    if (nativeHandle) nativeHandle.remove().catch(() => undefined);
  };
}
