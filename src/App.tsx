/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * لوحة المحرّر v4 — one app, account-bound roles.
 *
 * Flow: Google sign-in (native on Android, popup on web) → role resolution
 * (appRoles by account email; owner/operator bootstrapped; unknown accounts
 * request an activation code) → role-scoped board.
 *
 * Owner additionally gets a board switcher (المالك / المشغّل / المحرر) to
 * audit exactly what each role sees.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { AppRole, AccessRequest, Campaign, OperationalRequest, Notice, Incident } from './data/types';
import { repo, startFirestoreRealtime, stopFirestoreRealtime } from './data/repo';
import { testFirebaseConnection } from './data/firebase';
import { AuthAccount, onAccountChange, googleSignIn, signOutAll } from './data/auth';
import { resolveRole, getAccessRequest, subscribeAccessRequest, ensureRoleFromActivation } from './data/roles';
import { AuthGate } from './components/AuthGate';
import { Header, ActiveTab, BoardKind } from './components/Header';
import { OperatorCampaigns } from './components/OperatorCampaigns';
import { OperatorRequests } from './components/OperatorRequests';
import { OperatorNotices } from './components/OperatorNotices';
import { OperatorIncidents } from './components/OperatorIncidents';
import { EditorCampaigns } from './components/EditorCampaigns';
import { EditorRequests } from './components/EditorRequests';
import { EditorNotices } from './components/EditorNotices';
import { OwnerView } from './components/OwnerView';
import { RoleAdmin } from './components/RoleAdmin';
import { Database, Loader2 } from 'lucide-react';

type Phase = 'loading' | 'signin' | 'gate' | 'app';

export default function App() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [accessRequest, setAccessRequest] = useState<AccessRequest | null>(null);
  // Owner-only board switcher: which board to render
  const [board, setBoard] = useState<BoardKind>('owner');

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [requests, setRequests] = useState<OperationalRequest[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connError, setConnError] = useState<string | null>(null);
  // Persistent cloud-connection indicator (driven by a real server read)
  const [connHealthy, setConnHealthy] = useState<boolean | null>(null);

  // Resolve role for a signed-in account
  const settleAccount = useCallback(async (acct: AuthAccount | null) => {
    if (!acct) {
      setAccount(null);
      setRole(null);
      setAccessRequest(null);
      setPhase('signin');
      return;
    }
    setAccount(acct);
    try {
      const r = await resolveRole(acct.email);
      if (r) {
        setRole(r);
        setAccessRequest(null);
        setBoard(r === 'owner' ? 'owner' : r === 'operator' ? 'operator' : 'editor');
        setPhase('app');
      } else {
        const req = await getAccessRequest(acct.email);
        setAccessRequest(req);
        setRole(null);
        setPhase('gate');
      }
    } catch (e) {
      setConnError(e instanceof Error ? e.message : 'تعذّر التحقق من الدور.');
      setPhase('gate');
    }
  }, []);

  // Auth state subscription (JS SDK state is the single source of truth)
  useEffect(() => {
    const unsub = onAccountChange((acct) => {
      settleAccount(acct);
    });
    return unsub;
  }, [settleAccount]);

  // v4.3: while in the GATE phase, follow the requester's OWN accessRequests
  // doc LIVE (onSnapshot via subscribeAccessRequest). v4.2 fetched it ONCE
  // (getDoc inside settleAccount) and never re-read it — when the owner
  // issued a code, the running app kept the stale `pending` snapshot, so
  // AuthGate stayed on the waiting text and the code-entry field never
  // appeared until an app restart. With the listener, the field renders the
  // moment the status flips to `code_issued`, and an `activated` snapshot
  // completes activation (role doc ensured) and enters the board — all
  // without a restart.
  useEffect(() => {
    if (phase !== 'gate' || !account) return;
    const unsub = subscribeAccessRequest(account.email, (req) => {
      setAccessRequest(req);
      if (req && req.status === 'activated') {
        ensureRoleFromActivation(account.email)
          .then((r) => {
            if (r) {
              setRole(r);
              setAccessRequest(null);
              setBoard(r === 'owner' ? 'owner' : r === 'operator' ? 'operator' : 'editor');
              setPhase('app');
            }
          })
          .catch(() => {
            /* transient — the next snapshot or a retry re-attempts */
          });
      }
    });
    return unsub;
  }, [phase, account]);

  // Load board data once the app phase is reached
  const loadData = useCallback(async () => {
    try {
      const [allCampaigns, allRequests, allNotices, allIncidents] = await Promise.all([
        repo.getCampaigns(),
        repo.getRequests(),
        repo.getNotices(),
        repo.getIncidents(),
      ]);
      setCampaigns(allCampaigns);
      setRequests(allRequests);
      setNotices(allNotices);
      setIncidents(allIncidents);
    } catch (err) {
      console.error('Failed to load board data', err);
    } finally {
      setConnError(repo.getConnectionError());
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (phase !== 'app' || !role) return;
    setIsLoading(true);
    // v4.2: listeners start ONLY now — signed in AND role resolved (the
    // owner's appRoles doc is bootstrapped by this point). Starting them at
    // module import (v4/v4.1) raced role resolution and got the
    // role-gated `incidents` list denied, which stuck the error banner.
    startFirestoreRealtime(role);
    loadData();
    const unsubscribe = repo.subscribe(() => {
      loadData();
    });
    // Startup connection check — real server read drives the header indicator
    testFirebaseConnection()
      .then((ok) => setConnHealthy(ok))
      .catch(() => setConnHealthy(false));
    return () => {
      unsubscribe();
      stopFirestoreRealtime();
    };
  }, [phase, role, loadData]);

  const handleSignIn = useCallback(async () => {
    const acct = await googleSignIn();
    await settleAccount(acct);
  }, [settleAccount]);

  const handleSignOut = useCallback(async () => {
    stopFirestoreRealtime();
    await signOutAll();
    setCampaigns([]);
    setRequests([]);
    setNotices([]);
    setIncidents([]);
    setConnHealthy(null);
    // onAccountChange will move us to the signin phase
  }, []);

  const refreshGate = useCallback(async () => {
    if (account) {
      const req = await getAccessRequest(account.email);
      setAccessRequest(req);
      if (req && req.status === 'activated') {
        // Activation completed — re-resolve the role (the owner-granted role now)
        const r = await resolveRole(account.email);
        if (r) {
          setRole(r);
          setBoard('editor');
          setPhase('app');
        }
      }
    }
  }, [account]);

  // ---------- PHASE: loading ----------
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center" dir="rtl">
        <div className="flex items-center gap-2 text-neutral-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          جارٍ التحقق من الجلسة...
        </div>
      </div>
    );
  }

  // ---------- PHASE: signin / gate (no role) ----------
  if (phase === 'signin' || phase === 'gate') {
    return (
      <AuthGate
        account={account}
        accessRequest={accessRequest}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onRequestCreated={refreshGate}
        onActivated={refreshGate}
      />
    );
  }

  // ---------- PHASE: app ----------
  if (!role || !account) return null;

  const effectiveBoard: BoardKind = role === 'owner' ? board : role === 'operator' ? 'operator' : 'editor';

  // Tab defaults per board
  const counts = {
    pendingRequestsCount: requests.filter((r) => r.status === 'pending').length,
    unreadNoticesCount: notices.filter((n) => !n.isRead).length,
    campaignsCount: campaigns.length,
    incidentsCount: incidents.length,
  };

  const renderBoard = () => {
    if (effectiveBoard === 'owner') {
      return (
        <div>
          {activeTab === 'roles' ? (
            <RoleAdmin currentUserEmail={account.email} />
          ) : (
            <OwnerView
              campaigns={campaigns}
              requests={requests}
              notices={notices}
              incidents={incidents}
              activeSubTab={
                activeTab === 'campaigns' || activeTab === 'requests' || activeTab === 'notices' || activeTab === 'incidents'
                  ? activeTab
                  : 'dashboard'
              }
              onSelectSubTab={(tab) => setActiveTab(tab)}
            />
          )}
        </div>
      );
    }
    if (effectiveBoard === 'operator') {
      return (
        <div>
          {activeTab === 'campaigns' && <OperatorCampaigns campaigns={campaigns} onRefresh={loadData} />}
          {activeTab === 'requests' && <OperatorRequests requests={requests} onRefresh={loadData} />}
          {activeTab === 'notices' && <OperatorNotices notices={notices} onRefresh={loadData} />}
          {activeTab === 'incidents' && <OperatorIncidents incidents={incidents} onRefresh={loadData} />}
        </div>
      );
    }
    // editor board — المحرّر sees exactly his board
    return (
      <div>
        {activeTab === 'campaigns' && <EditorCampaigns campaigns={campaigns} onRefresh={loadData} />}
        {activeTab === 'requests' && <EditorRequests requests={requests} onRefresh={loadData} />}
        {activeTab === 'notices' && <EditorNotices notices={notices} onRefresh={loadData} />}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200" dir="rtl">
      <Header
        accountEmail={account.email}
        onSignOut={handleSignOut}
        role={role}
        board={effectiveBoard}
        isOwner={role === 'owner'}
        onSelectBoard={(b) => {
          setBoard(b);
          // sensible tab defaults when switching boards
          if (b === 'owner') setActiveTab('dashboard');
          else setActiveTab('campaigns');
        }}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        connHealthy={connHealthy}
        {...counts}
      />

      {connError && (
        <div className="bg-rose-950/80 border-b border-rose-800/60 px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <p className="text-xs text-rose-200 leading-relaxed">
              <span className="font-bold">⚠️ {connError}</span>
              <span className="block sm:inline text-rose-300/80"> التغييرات قد لا تُحفظ — تحقق من الإنترنت ثم أعد المحاولة.</span>
            </p>
            <button
              onClick={() => loadData()}
              className="shrink-0 px-3 py-1.5 text-xs font-bold text-rose-100 bg-rose-800/60 hover:bg-rose-700/60 rounded-lg transition-colors cursor-pointer"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="py-24 text-center text-neutral-500 text-sm">جارٍ تحميل بيانات اللوحة...</div>
        ) : (
          renderBoard()
        )}
      </main>

      <footer className="border-t border-neutral-900 bg-neutral-950 py-5 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-neutral-400">لوحة المحرّر (Editor Board)</span>
            <span className="text-neutral-700">·</span>
            <span className="flex items-center gap-1.5 text-neutral-400">
              <Database className="w-3.5 h-5 text-amber-500/70" />
              <span>مستودع البيانات: 5 مجموعات سحابية على Firebase (campaigns, requests, notices, incidents, appRoles)</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-neutral-500" dir="ltr">{account.email}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
