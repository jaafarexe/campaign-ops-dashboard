/**
 * Roles by account (v4.2) + activation codes.
 *
 * - Collection `appRoles`, doc id = lowercase email, { role: owner|operator|editor }.
 * - Bootstrap: owner@example.com → owner — the ONLY bootstrap account
 *   (created on his first sign-in; afterwards the role lives in Firestore).
 *   v4.2 removed the former second-account operator bootstrap: EVERY other
 *   account, no exceptions, enters through the activation-request flow.
 * - Unknown accounts are NOT given a role. Instead they request an activation
 *   code (collection `accessRequests`, doc id = lowercase email):
 *   the OWNER (only the owner) issues a one-time 6-digit code (24h expiry)
 *   and CHOOSES the role the code grants — operator or editor — stored on
 *   the request as `grantedRole`. The requester enters the code once; his
 *   appRoles doc is created with exactly that role and the request is
 *   marked activated. The role persists — no code needed again.
 *
 * - v4.3: activation is deliberately TWO sequential commits, never one
 *   transaction (see activateWithCode), and the gate screen follows the
 *   requester's own accessRequests doc via a live onSnapshot listener
 *   (subscribeAccessRequest) so the code-entry field appears the moment
 *   the owner issues a code — no app restart.
 */
import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { AppRole, RoleDoc, AccessRequest } from './types';

export const OWNER_EMAIL = 'owner@example.com';

const ROLES_COLLECTION = 'appRoles';
const ACCESS_REQUESTS_COLLECTION = 'accessRequests';

function nowIso(): string {
  return new Date().toISOString();
}

function requireDb() {
  if (!db) throw new Error('قاعدة البيانات غير جاهزة.');
  return db;
}

/** Resolve the account's role; bootstrap the owner account on first sign-in. */
export async function resolveRole(emailRaw: string): Promise<AppRole | null> {
  const email = emailRaw.toLowerCase();
  const firestore = requireDb();
  const ref = doc(firestore, ROLES_COLLECTION, email);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const role = (snap.data() as RoleDoc).role;
    if (role === 'owner' || role === 'operator' || role === 'editor') return role;
  }
  // v4.2: the owner is the ONLY bootstrap account. Every other account —
  // no exceptions — goes through the activation-request flow.
  if (email === OWNER_EMAIL) {
    await setDoc(ref, { email, role: 'owner' as AppRole, createdAt: nowIso() });
    return 'owner';
  }
  return null;
}

/** Owner: list all role documents. */
export async function listRoles(): Promise<RoleDoc[]> {
  const firestore = requireDb();
  const snap = await getDocs(collection(firestore, ROLES_COLLECTION));
  const list: RoleDoc[] = [];
  snap.forEach((d) => list.push(d.data() as RoleDoc));
  list.sort((a, b) => a.email.localeCompare(b.email));
  return list;
}

/** Owner: assign a role to an email. */
export async function assignRole(emailRaw: string, role: AppRole, displayName?: string): Promise<void> {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('البريد الإلكتروني غير صالح.');
  if (role !== 'operator' && role !== 'editor') throw new Error('الدور المسموح إضافته: مشغّل أو محرر.');
  const firestore = requireDb();
  await setDoc(
    doc(firestore, ROLES_COLLECTION, email),
    { email, role, displayName: displayName ?? '', createdAt: nowIso(), updatedAt: nowIso() },
    { merge: true }
  );
}

/** Owner: remove a role document. The owner's own doc is protected. */
export async function removeRole(emailRaw: string): Promise<void> {
  const email = emailRaw.toLowerCase();
  if (email === OWNER_EMAIL) throw new Error('لا يمكن إزالة دور المالك.');
  const firestore = requireDb();
  await deleteDoc(doc(firestore, ROLES_COLLECTION, email));
}

// ----------------------------------------------------------
// Activation requests (onboarding via one-time code, owner-issued)
// ----------------------------------------------------------

/** The signed-in user requests an activation code for his own account. */
export async function requestActivationCode(emailRaw: string, displayName?: string): Promise<void> {
  const email = emailRaw.toLowerCase();
  const firestore = requireDb();
  const ref = doc(firestore, ACCESS_REQUESTS_COLLECTION, email);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    const st = (existing.data() as AccessRequest).status;
    if (st === 'activated') return; // already active — role resolution handles the rest
    // Re-request: reset to pending (code invalidated)
  }
  await setDoc(ref, {
    email,
    displayName: displayName ?? '',
    requestedAt: nowIso(),
    status: 'pending' as const,
    codeUsed: false,
  });
}

export async function getAccessRequest(emailRaw: string): Promise<AccessRequest | null> {
  const email = emailRaw.toLowerCase();
  const firestore = requireDb();
  const snap = await getDoc(doc(firestore, ACCESS_REQUESTS_COLLECTION, email));
  return snap.exists() ? (snap.data() as AccessRequest) : null;
}

/**
 * v4.3: LIVE subscription to the signed-in user's OWN access request.
 * The gate screen is driven by this listener: `pending` shows the waiting
 * state, and the moment the owner issues a code (`code_issued`) the
 * code-entry field renders — without restarting the app. (v4.2 fetched the
 * request ONCE via getAccessRequest in settleAccount and never re-read it,
 * so a live session kept the stale `pending` snapshot forever.) The
 * deployed rules allow the requester to get/listen to his own doc.
 * Listener errors keep the last known state (no callback) — a transient
 * drop must not kick the user back to a wrong screen.
 */
export function subscribeAccessRequest(
  emailRaw: string,
  cb: (req: AccessRequest | null) => void
): () => void {
  const email = emailRaw.toLowerCase();
  const firestore = requireDb();
  return onSnapshot(
    doc(firestore, ACCESS_REQUESTS_COLLECTION, email),
    (snap) => cb(snap.exists() ? (snap.data() as AccessRequest) : null),
    (err) => console.error('accessRequests listener error', err)
  );
}

/** Map raw Firestore write failures to friendly Arabic errors. */
function friendlyWriteError(e: unknown): Error {
  const code = (e as { code?: string } | null)?.code;
  if (code === 'permission-denied') {
    return new Error('تم رفض التفعيل من الخادم — تحقق من الكود وأعد المحاولة. إذا استمرت المشكلة أخبر المالك.');
  }
  if (code === 'unavailable' || code === 'deadline-exceeded' || code === 'network-request-failed') {
    return new Error('تعذّر الاتصال بالخادم — تحقق من الإنترنت وأعد المحاولة.');
  }
  return e instanceof Error ? e : new Error('حدث خطأ — أعد المحاولة.');
}

/** Create the appRoles doc (activation step 2 / activation repair). */
async function createRoleDoc(email: string, role: AppRole, displayName: string): Promise<void> {
  const firestore = requireDb();
  try {
    await setDoc(doc(firestore, ROLES_COLLECTION, email), {
      email,
      role,
      displayName,
      createdAt: nowIso(),
    });
  } catch (e) {
    throw friendlyWriteError(e);
  }
}

/**
 * v4.3 repair path: if the request already reached `activated` (the echo
 * commit landed) but the appRoles doc was never created (e.g. the app died
 * between the two activation commits), create it now from the owner-granted
 * role — the rules allow this create exactly in that state — and return the
 * role. Returns null when there is nothing to complete.
 */
export async function ensureRoleFromActivation(emailRaw: string): Promise<AppRole | null> {
  const email = emailRaw.toLowerCase();
  const existing = await resolveRole(email);
  if (existing) return existing;
  const req = await getAccessRequest(email);
  if (req && req.status === 'activated') {
    const granted: AppRole = req.grantedRole === 'operator' ? 'operator' : 'editor';
    await createRoleDoc(email, granted, req.displayName ?? '');
    return granted;
  }
  return null;
}

/** Owner: list all access requests, newest first. */
export async function listAccessRequests(): Promise<AccessRequest[]> {
  const firestore = requireDb();
  const snap = await getDocs(collection(firestore, ACCESS_REQUESTS_COLLECTION));
  const list: AccessRequest[] = [];
  snap.forEach((d) => list.push(d.data() as AccessRequest));
  list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  return list;
}

function randomSixDigit(): string {
  const buf = new Uint32Array(1);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
    return String(100000 + (buf[0] % 900000));
  }
  return String(100000 + Math.floor(Math.random() * 900000));
}

/**
 * Owner only: issue (or re-issue) a one-time 6-digit code for a pending
 * request. The owner CHOOSES the role the code grants (operator or editor);
 * it is stored on the request as `grantedRole` and shown in the panel with
 * its 24h expiry. Returns the code — the owner passes it to the requester
 * through the normal outside channel; the app only displays it in the panel.
 */
export async function issueActivationCode(emailRaw: string, grantedRole: AppRole): Promise<string> {
  const email = emailRaw.toLowerCase();
  if (grantedRole !== 'operator' && grantedRole !== 'editor') {
    throw new Error('الدور الممنوح بالكود يجب أن يكون مشغّلاً أو محرراً.');
  }
  const firestore = requireDb();
  const ref = doc(firestore, ACCESS_REQUESTS_COLLECTION, email);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('لا يوجد طلب تفعيل لهذا البريد.');
  const current = snap.data() as AccessRequest;
  if (current.status === 'activated') throw new Error('هذا الحساب مفعّل مسبقاً.');
  const code = randomSixDigit();
  const issuedAt = Date.now();
  await updateDoc(ref, {
    code,
    grantedRole,
    codeIssuedAt: new Date(issuedAt).toISOString(),
    codeExpiresAt: new Date(issuedAt + 24 * 60 * 60 * 1000).toISOString(),
    status: 'code_issued' as const,
    codeUsed: false,
  });
  return code;
}

/**
 * Requester: submit the activation code.
 *
 * v4.3 SEQUENCING (root-cause fix): the two writes are SEPARATE commits,
 * echo first — NEVER one transaction. The deployed rules gate the appRoles
 * create on `requestActivated()` = the accessRequests doc ALREADY showing
 * status 'activated' + codeUsed true, read via get() against the committed
 * (pre-transaction) state. Bundling both writes in one runTransaction
 * (v4–v4.2) therefore ALWAYS failed: at evaluation time the request was
 * still 'code_issued', the create was denied, and the whole commit rolled
 * back with a raw "Missing or insufficient permissions." (proven on-device,
 * v4.2: code 126448). Checks that were CLEARED during diagnosis: the echo
 * payload touches exactly the four diff-allowed fields (status, codeUsed,
 * codeEntered, activatedAt), and the code is stored/entered as a string on
 * both sides — no type mismatch.
 *
 * Steps: (1) read + validate (exists / issued / match / not expired / not
 * used — clear Arabic errors, no lockout); (2) echo update as its OWN
 * commit: codeEntered echoes the proven code, exactly the four fields the
 * rules' diff check allows; (3) create the appRoles doc with the role the
 * OWNER granted at issuance (`grantedRole`: operator or editor; requests
 * issued before v4.2 carry no grantedRole and default to editor). If step
 * (3) ever fails after (2) landed, ensureRoleFromActivation() completes it
 * on the next gate snapshot — the request stays 'activated', never lost.
 */
export async function activateWithCode(emailRaw: string, codeRaw: string): Promise<void> {
  const email = emailRaw.toLowerCase();
  const code = codeRaw.trim();
  if (!/^\d{6}$/.test(code)) throw new Error('الكود مكوّن من 6 أرقام.');
  const firestore = requireDb();
  const reqRef = doc(firestore, ACCESS_REQUESTS_COLLECTION, email);

  // (1) Validate against the committed request.
  const snap = await getDoc(reqRef);
  if (!snap.exists()) throw new Error('لا يوجد طلب تفعيل لهذا الحساب — اطلب كود التفعيل أولاً.');
  const r = snap.data() as AccessRequest;
  if (r.status === 'activated' || r.codeUsed) throw new Error('هذا الكود مستخدم مسبقاً.');
  if (r.status !== 'code_issued' || !r.code) {
    throw new Error('لم يُصدر كود لهذا الطلب بعد — بانتظار المالك.');
  }
  if (r.code !== code) throw new Error('الكود غير صحيح — تحقق وأعد المحاولة.');
  if (r.codeExpiresAt && new Date(r.codeExpiresAt).getTime() < Date.now()) {
    throw new Error('انتهت صلاحية الكود (24 ساعة) — اطلب كوداً جديداً.');
  }
  // The role comes from the owner's choice at issuance, never from the
  // requester. Legacy requests (issued pre-v4.2) default to editor.
  const granted: AppRole = r.grantedRole === 'operator' ? 'operator' : 'editor';

  // (2) Echo update — its own commit, ONLY the four diff-allowed fields.
  try {
    await updateDoc(reqRef, {
      status: 'activated' as const,
      codeUsed: true,
      codeEntered: code,
      activatedAt: nowIso(),
    });
  } catch (e) {
    throw friendlyWriteError(e);
  }

  // (3) Role doc — a separate write, evaluated against the now-activated
  // request, exactly as the rules require.
  await createRoleDoc(email, granted, r.displayName ?? '');
}
