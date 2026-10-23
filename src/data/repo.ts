/**
 * Data Repository for "لوحة المحرّر" (Editor Board)
 *
 * Maps directly to 4 Firestore collections:
 *  1. 'campaigns'
 *  2. 'requests'
 *  3. 'notices'
 *  4. 'incidents'
 *
 * Connected to live Firebase Firestore with real-time onSnapshot listeners.
 * HARD RULES:
 *  - NO seed/sample data anywhere. An empty database means empty views.
 *    The app NEVER writes seed rows to Firestore or to local storage.
 *  - Firestore failures are surfaced to the user through a visible
 *    connection-error state (repo.getConnectionError()), never hidden.
 * Hard constraint: NO payment data anywhere.
 */

import {
  Campaign,
  CampaignVideo,
  OperationalRequest,
  Notice,
  Incident,
  AccountDataField,
  AppRole,
} from './types';
import { db, testFirebaseConnection } from './firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';

const COLLECTION_NAMES = {
  CAMPAIGNS: 'campaigns',
  REQUESTS: 'requests',
  NOTICES: 'notices',
  INCIDENTS: 'incidents',
} as const;

// v3.1 keys — intentionally new so any fake cached data from older
// versions (v1–v3) is abandoned. The app starts with an EMPTY cache.
const STORAGE_KEY_CAMPAIGNS = `editor_board_v4_${COLLECTION_NAMES.CAMPAIGNS}`;
const STORAGE_KEY_REQUESTS = `editor_board_v4_${COLLECTION_NAMES.REQUESTS}`;
const STORAGE_KEY_NOTICES = `editor_board_v4_${COLLECTION_NAMES.NOTICES}`;
const STORAGE_KEY_INCIDENTS = `editor_board_v4_${COLLECTION_NAMES.INCIDENTS}`;
// In-memory cache — always starts EMPTY. No seed data.
let memoryCampaigns: Campaign[] = [];
let memoryRequests: OperationalRequest[] = [];
let memoryNotices: Notice[] = [];
let memoryIncidents: Incident[] = [];

// Connection error state — set on any Firestore failure, cleared on success.
// The UI reads this through repo.getConnectionError() and shows a banner.
let firestoreError: string | null = null;

function setConnError(message: string) {
  firestoreError = message;
}

function clearConnError() {
  firestoreError = null;
}

// Pub/Sub listeners
type Listener = () => void;
const listeners = new Set<Listener>();

function notifySubscribers() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Subscriber notification error', e);
    }
  });
}

function loadLocalItems<T>(key: string, defaultVal: T[]): T[] {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultVal;
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

function saveLocalItems<T>(key: string, items: T[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(items));
}

function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nested = sanitizeForFirestore(value);
      if (Object.keys(nested).length > 0) {
        result[key] = nested;
      }
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (item !== null && typeof item === 'object') {
          return sanitizeForFirestore(item);
        }
        return item;
      });
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Local cache: last-known server data only. Never seeded — an empty
// store means an empty board. The v31 keys orphan older fake caches.
if (typeof window !== 'undefined') {
  memoryCampaigns = loadLocalItems(STORAGE_KEY_CAMPAIGNS, []);
  memoryRequests = loadLocalItems(STORAGE_KEY_REQUESTS, []);
  memoryNotices = loadLocalItems(STORAGE_KEY_NOTICES, []);
  memoryIncidents = loadLocalItems(STORAGE_KEY_INCIDENTS, []);
}

// ----------------------------------------------------------
// Real-time Firestore listeners — v4.2 lifecycle fix.
//
// ROOT CAUSE of the v4.1 owner permission-denied banner: this setup used to
// run at MODULE IMPORT time, i.e. before App resolved the account's role
// (and on cold starts before the JS-SDK auth session was even restored).
// The `incidents` list rule is the only board rule that depends on the
// caller's appRoles doc (isOwner/isOperator → get(appRoles/{email})), so in
// that window the incidents listener was denied with permission-denied,
// and a denied onSnapshot listener is terminated by the SDK and never
// retries — while the getters never cleared the error on success, so the
// banner could never clear in-session. Editors hit the same denial
// deterministically (they may NEVER list incidents, by design).
//
// Fix: listeners start ONLY after sign-in + role resolution, via
// startFirestoreRealtime(role) from App; the incidents listener is
// attached exclusively for owner/operator; stopFirestoreRealtime()
// tears everything down on sign-out / role change.
// ----------------------------------------------------------
let realtimeRole: AppRole | null = null;
let realtimeUnsubs: Array<() => void> = [];

export function stopFirestoreRealtime() {
  realtimeUnsubs.forEach((unsub) => {
    try {
      unsub();
    } catch {
      /* already gone */
    }
  });
  realtimeUnsubs = [];
  realtimeRole = null;
}

export async function startFirestoreRealtime(role: AppRole) {
  if (!db || typeof window === 'undefined') return;
  if (realtimeRole === role && realtimeUnsubs.length > 0) return; // already running for this role
  stopFirestoreRealtime();
  realtimeRole = role;
  const firestore = db; // non-null capture for the closures below

  try {
    await testFirebaseConnection();

    const attach = <T,>(
      collectionName: string,
      storageKey: string,
      apply: (list: T[]) => void,
      sortList: (list: T[]) => void
    ) => {
      const unsub = onSnapshot(
        collection(firestore, collectionName),
        (snapshot) => {
          clearConnError();
          const list: T[] = [];
          // An empty database is a valid state — the board shows EMPTY.
          // Never seed; never write fake rows to Firestore.
          snapshot.forEach((d) => list.push(d.data() as T));
          sortList(list);
          apply(list);
          saveLocalItems(storageKey, list);
          notifySubscribers();
        },
        (error) => {
          setConnError(describeFirestoreError(error));
          notifySubscribers();
        }
      );
      realtimeUnsubs.push(unsub);
    };
    const byCreatedDesc = (list: Array<{ createdAt: string }>) =>
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 1. Campaigns Listener
    attach<Campaign>(
      COLLECTION_NAMES.CAMPAIGNS,
      STORAGE_KEY_CAMPAIGNS,
      (list) => {
        memoryCampaigns = list;
      },
      byCreatedDesc
    );

    // 2. Requests Listener
    attach<OperationalRequest>(
      COLLECTION_NAMES.REQUESTS,
      STORAGE_KEY_REQUESTS,
      (list) => {
        memoryRequests = list;
      },
      byCreatedDesc
    );

    // 3. Notices Listener
    attach<Notice>(
      COLLECTION_NAMES.NOTICES,
      STORAGE_KEY_NOTICES,
      (list) => {
        memoryNotices = list;
      },
      byCreatedDesc
    );

    // 4. Incidents Listener — owner/operator ONLY. Editors can never list
    // incidents (rules deny it by design), so attaching it for them was a
    // guaranteed permission-denied on every editor launch.
    if (role === 'owner' || role === 'operator') {
      attach<Incident>(
        COLLECTION_NAMES.INCIDENTS,
        STORAGE_KEY_INCIDENTS,
        (list) => {
          memoryIncidents = list;
        },
        (list) => list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
    }
  } catch (err) {
    setConnError(describeFirestoreError(err));
    notifySubscribers();
  }
}

function recordFirestoreOpError(error: unknown): void {
  setConnError(describeFirestoreError(error));
  notifySubscribers();
}

function describeFirestoreError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (/permission-denied|insufficient permissions/i.test(raw)) {
    return 'تم رفض الوصول إلى قاعدة البيانات (صلاحيات غير كافية).';
  }
  if (/unavailable|network|failed to get document because the client is offline|the client is offline/i.test(raw)) {
    return 'لا يوجد اتصال بالإنترنت أو تعذّر الوصول إلى قاعدة البيانات.';
  }
  return `خطأ في قاعدة البيانات: ${raw.slice(0, 160)}`;
}

// NOTE (v4.2): listeners are NOT started at module import anymore — App
// calls startFirestoreRealtime(role) after sign-in + role resolution.

export const repo = {
  isFirestoreLive(): boolean {
    return Boolean(db) && firestoreError === null;
  },

  /** Current Firestore connection problem in plain Arabic, or null when healthy. */
  getConnectionError(): string | null {
    return firestoreError;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  // ----------------------------------------------------
  // CAMPAIGNS COLLECTION
  // ----------------------------------------------------
  async getCampaigns(): Promise<Campaign[]> {
    if (db) {
      try {
        const snap = await getDocs(collection(db, COLLECTION_NAMES.CAMPAIGNS));
        const list: Campaign[] = [];
        snap.forEach((d) => list.push(d.data() as Campaign));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        memoryCampaigns = list;
        saveLocalItems(STORAGE_KEY_CAMPAIGNS, list);
        clearConnError();
        return list;
      } catch (err) {
        setConnError(describeFirestoreError(err));
      }
    }
    return memoryCampaigns;
  },

  async getCampaignById(id: string): Promise<Campaign | undefined> {
    return memoryCampaigns.find((c) => c.id === id);
  },

  async getNextCampaignCode(): Promise<string> {
    const campaigns = await this.getCampaigns();
    let maxNum = 0;
    campaigns.forEach((c) => {
      const match = c.code.match(/C(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `C${maxNum + 1}`;
  },

  async createCampaign(input: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<Campaign> {
    const now = new Date().toISOString();
    const newCampaign: Campaign = {
      ...input,
      id: `campaign-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };

    memoryCampaigns = [newCampaign, ...memoryCampaigns];
    saveLocalItems(STORAGE_KEY_CAMPAIGNS, memoryCampaigns);
    notifySubscribers();

    if (db) {
      try {
        await setDoc(doc(db, COLLECTION_NAMES.CAMPAIGNS, newCampaign.id), sanitizeForFirestore(newCampaign));
      } catch (err) {
        recordFirestoreOpError(err);
      }
    }
    return newCampaign;
  },

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
    const index = memoryCampaigns.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Campaign not found');

    const updatedCampaign: Campaign = {
      ...memoryCampaigns[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    memoryCampaigns[index] = updatedCampaign;
    saveLocalItems(STORAGE_KEY_CAMPAIGNS, memoryCampaigns);
    notifySubscribers();

    if (db) {
      try {
        await updateDoc(doc(db, COLLECTION_NAMES.CAMPAIGNS, id), sanitizeForFirestore({
          ...updates,
          updatedAt: updatedCampaign.updatedAt,
        }));
      } catch (err) {
        recordFirestoreOpError(err);
      }
    }
    return updatedCampaign;
  },

  async deleteCampaign(id: string): Promise<void> {
    memoryCampaigns = memoryCampaigns.filter((c) => c.id !== id);
    saveLocalItems(STORAGE_KEY_CAMPAIGNS, memoryCampaigns);
    notifySubscribers();

    if (db) {
      try {
        await deleteDoc(doc(db, COLLECTION_NAMES.CAMPAIGNS, id));
      } catch (err) {
        recordFirestoreOpError(err);
      }
    }
  },

  // Add a nested video to a campaign
  async addVideoToCampaign(campaignId: string, video: Omit<CampaignVideo, 'id'>): Promise<Campaign> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const newVideo: CampaignVideo = {
      ...video,
      id: `vid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      views: video.views || 0,
      submittedToPlatform: Boolean(video.submittedToPlatform),
    };

    const updatedVideos = [...(campaign.videos || []), newVideo];
    return this.updateCampaign(campaignId, { videos: updatedVideos });
  },

  // Update a nested video in a campaign
  async updateCampaignVideo(
    campaignId: string,
    videoId: string,
    updates: Partial<CampaignVideo>
  ): Promise<Campaign> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const updatedVideos = (campaign.videos || []).map((v) => {
      if (v.id === videoId) {
        return { ...v, ...updates };
      }
      return v;
    });

    return this.updateCampaign(campaignId, { videos: updatedVideos });
  },

  // Delete a nested video from a campaign
  async deleteCampaignVideo(campaignId: string, videoId: string): Promise<Campaign> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const updatedVideos = (campaign.videos || []).filter((v) => v.id !== videoId);
    return this.updateCampaign(campaignId, { videos: updatedVideos });
  },

  // Editor (Editor) submits the single delivery Drive link
  async submitCampaignDelivery(campaignId: string, deliveryLink: string): Promise<Campaign> {
    return this.updateCampaign(campaignId, {
      deliveryLink: deliveryLink.trim(),
      status: 'تم التسليم',
    });
  },

  // ----------------------------------------------------
  // REQUESTS COLLECTION
  // ----------------------------------------------------
  async getRequests(): Promise<OperationalRequest[]> {
    if (db) {
      try {
        const snap = await getDocs(collection(db, COLLECTION_NAMES.REQUESTS));
        const list: OperationalRequest[] = [];
        snap.forEach((d) => list.push(d.data() as OperationalRequest));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        memoryRequests = list;
        saveLocalItems(STORAGE_KEY_REQUESTS, list);
        clearConnError();
        return list;
      } catch (err) {
        setConnError(describeFirestoreError(err));
      }
    }
    return memoryRequests;
  },

  async createRequest(
    input: Omit<OperationalRequest, 'id' | 'createdAt' | 'status'>
  ): Promise<OperationalRequest> {
    const newRequest: OperationalRequest = {
      ...input,
      id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    memoryRequests = [newRequest, ...memoryRequests];
    saveLocalItems(STORAGE_KEY_REQUESTS, memoryRequests);
    notifySubscribers();

    if (db) {
      try {
        await setDoc(doc(db, COLLECTION_NAMES.REQUESTS, newRequest.id), sanitizeForFirestore(newRequest));
      } catch (err) {
        recordFirestoreOpError(err);
      }
    }
    return newRequest;
  },

  async deleteRequest(id: string): Promise<void> {
    memoryRequests = memoryRequests.filter((r) => r.id !== id);
    saveLocalItems(STORAGE_KEY_REQUESTS, memoryRequests);
    notifySubscribers();

    if (db) {
      try {
        await deleteDoc(doc(db, COLLECTION_NAMES.REQUESTS, id));
      } catch (err) {
        recordFirestoreOpError(err);
      }
    }
  },

  async answerCodeRequest(id: string, code: string): Promise<OperationalRequest> {
    const index = memoryRequests.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Request not found');

    const updatedReq: OperationalRequest = {
      ...memoryRequests[index],
      codeResponse: code,
      status: 'answered',
      answeredAt: new Date().toISOString(),
    };

    memoryRequests[index] = updatedReq;
    saveLocalItems(STORAGE_KEY_REQUESTS, memoryRequests);
    notifySubscribers();

    if (db) {
      try {
        await updateDoc(doc(db, COLLECTION_NAMES.REQUESTS, id), {
          codeResponse: code,
          status: 'answered',
          answeredAt: updatedReq.answeredAt,
        });
      } catch (err) {
        recordFirestoreOpError(err);
      }
    }
    return updatedReq;
  },

  async answerAccountDataRequest(
    id: string,
    fields: AccountDataField[]
  ): Promise<OperationalRequest> {
    const index = memoryRequests.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Request not found');

    const updatedReq: OperationalRequest = {
      ...memoryRequests[index],
      accountDataResponse: fields,
      status: 'answered',
      answeredAt: new Date().toISOString(),
    };

    memoryRequests[index] = updatedReq;
    saveLocalItems(STORAGE_KEY_REQUESTS, memoryRequests);
    notifySubscribers();

    if (db) {
      try {
        await updateDoc(doc(db, COLLECTION_NAMES.REQUESTS, id), {
          accountDataResponse: fields,
          status: 'answered',
          answeredAt: updatedReq.answeredAt,
        });
      } catch (err) {
        recordFirestoreOpError(err);
      }
    }
    return updatedReq;
  },

  async answerFileDeliveryRequest(id: string, fileUrl: string): Promise<OperationalRequest> {
    const index = memoryRequests.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Request not found');

    const updatedReq: OperationalRequest = {
      ...memoryRequests[index],
      fileDeliveryResponse: fileUrl,
      status: 'answered',
      answeredAt: new Date().toISOString(),
    };

    memoryRequests[index] = updatedReq;
    saveLocalItems(STORAGE_KEY_REQUESTS, memoryRequests);
    notifySubscribers();

    if (db) {
      try {
        await updateDoc(doc(db, COLLECTION_NAMES.REQUESTS, id), {
          fileDeliveryResponse: fileUrl,
          status: 'answered',
          answeredAt: updatedReq.answeredAt,
        });
      } catch (err) {
        recordFirestoreOpError(err);
      }
    }
    return updatedReq;
  },

  // ----------------------------------------------------
  // NOTICES COLLECTION
  // ----------------------------------------------------
  async getNotices(): Promise<Notice[]> {
    if (db) {
      try {
        const snap = await getDocs(collection(db, COLLECTION_NAMES.NOTICES));
        const list: Notice[] = [];
        snap.forEach((d) => list.push(d.data() as Notice));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        memoryNotices = list;
        saveLocalItems(STORAGE_KEY_NOTICES, list);
        clearConnError();
        return list;
      } catch (err) {
        setConnError(describeFirestoreError(err));
      }
    }
    return memoryNotices;
  },

  async createNotice(
    input: Omit<Notice, 'id' | 'createdAt' | 'isRead' | 'readAt'>
  ): Promise<Notice> {
    const newNotice: Notice = {
      ...input,
      id: `notice-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    memoryNotices = [newNotice, ...memoryNotices];
    saveLocalItems(STORAGE_KEY_NOTICES, memoryNotices);
    notifySubscribers();

    if (db) {
      try {
        await setDoc(doc(db, COLLECTION_NAMES.NOTICES, newNotice.id), sanitizeForFirestore(newNotice));
      } catch (err) {
        recordFirestoreOpError(err);
      }
    }
    return newNotice;
  },

  async markNoticeAsRead(id: string): Promise<Notice> {
    const index = memoryNotices.findIndex((n) => n.id === id);
    if (index === -1) throw new Error('Notice not found');

    const updatedNotice: Notice = {
      ...memoryNotices[index],
      isRead: true,
      readAt: new Date().toISOString(),
    };

    memoryNotices[index] = updatedNotice;
    saveLocalItems(STORAGE_KEY_NOTICES, memoryNotices);
    notifySubscribers();

    if (db) {
      try {
        await updateDoc(doc(db, COLLECTION_NAMES.NOTICES, id), {
          isRead: true,
          readAt: updatedNotice.readAt,
        });
      } catch (err) {
        recordFirestoreOpError(err);
      }
    }
    return updatedNotice;
  },

  async deleteNotice(id: string): Promise<void> {
    memoryNotices = memoryNotices.filter((n) => n.id !== id);
    saveLocalItems(STORAGE_KEY_NOTICES, memoryNotices);
    notifySubscribers();

    if (db) {
      try {
        await deleteDoc(doc(db, COLLECTION_NAMES.NOTICES, id));
      } catch (err) {
        recordFirestoreOpError(err);
      }
    }
  },

  // ----------------------------------------------------
  // INCIDENTS COLLECTION
  // ----------------------------------------------------
  async getIncidents(): Promise<Incident[]> {
    // v4.2 guard: editors may NEVER read incidents (rules deny the list by
    // design). Never issue the Firestore read for them — it was a guaranteed
    // permission-denied that lit up the error banner on every editor launch.
    if (realtimeRole === 'editor') {
      return memoryIncidents;
    }
    if (db) {
      try {
        const snap = await getDocs(collection(db, COLLECTION_NAMES.INCIDENTS));
        const list: Incident[] = [];
        snap.forEach((d) => list.push(d.data() as Incident));
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        memoryIncidents = list;
        saveLocalItems(STORAGE_KEY_INCIDENTS, list);
        clearConnError();
        return list;
      } catch (err) {
        setConnError(describeFirestoreError(err));
      }
    }
    return memoryIncidents;
  },

  async createIncident(input: Omit<Incident, 'id'>): Promise<Incident> {
    const newIncident: Incident = {
      ...input,
      id: `incident-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };

    memoryIncidents = [newIncident, ...memoryIncidents];
    saveLocalItems(STORAGE_KEY_INCIDENTS, memoryIncidents);
    notifySubscribers();

    if (db) {
      try {
        await setDoc(doc(db, COLLECTION_NAMES.INCIDENTS, newIncident.id), sanitizeForFirestore(newIncident));
      } catch (err) {
        recordFirestoreOpError(err);
      }
    }
    return newIncident;
  },

  async updateIncident(id: string, updates: Partial<Incident>): Promise<Incident> {
    const index = memoryIncidents.findIndex((inc) => inc.id === id);
    if (index === -1) throw new Error('Incident not found');

    const updatedIncident: Incident = {
      ...memoryIncidents[index],
      ...updates,
    };

    memoryIncidents[index] = updatedIncident;
    saveLocalItems(STORAGE_KEY_INCIDENTS, memoryIncidents);
    notifySubscribers();

    if (db) {
      try {
        await updateDoc(doc(db, COLLECTION_NAMES.INCIDENTS, id), updates);
      } catch (err) {
        recordFirestoreOpError(err);
      }
    }
    return updatedIncident;
  },

  async deleteIncident(id: string): Promise<void> {
    memoryIncidents = memoryIncidents.filter((inc) => inc.id !== id);
    saveLocalItems(STORAGE_KEY_INCIDENTS, memoryIncidents);
    notifySubscribers();

    if (db) {
      try {
        await deleteDoc(doc(db, COLLECTION_NAMES.INCIDENTS, id));
      } catch (err) {
        recordFirestoreOpError(err);
      }
    }
  },
};
