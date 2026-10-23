import React, { useState, useEffect, useCallback } from 'react';
import { AppRole, RoleDoc, AccessRequest, APP_ROLE_LABELS } from '../data/types';
import {
  OWNER_EMAIL,
  listRoles,
  assignRole,
  removeRole,
  listAccessRequests,
  issueActivationCode,
} from '../data/roles';
import {
  Users,
  KeyRound,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface RoleAdminProps {
  currentUserEmail: string;
}

const ROLE_BADGE: Record<AppRole, string> = {
  owner: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  operator: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  editor: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
};

export const RoleAdmin: React.FC<RoleAdminProps> = ({ currentUserEmail }) => {
  const [roles, setRoles] = useState<RoleDoc[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('editor');
  // v4.2: at code issuance the OWNER chooses the role the code grants.
  const [grantRoles, setGrantRoles] = useState<Record<string, AppRole>>({});
  const [issuedCode, setIssuedCode] = useState<{ email: string; code: string; role: AppRole } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [r, q] = await Promise.all([listRoles(), listAccessRequests()]);
      setRoles(r);
      setRequests(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر تحميل الأدوار.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async (fn: () => Promise<void>, okText?: string) => {
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      await fn();
      if (okText) setOkMsg(okText);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ — أعد المحاولة.');
    } finally {
      setBusy(false);
    }
  };

  const requestStatusLabel = (r: AccessRequest) => {
    if (r.status === 'activated') return <span className="text-emerald-300">مفعّل</span>;
    if (r.status === 'code_issued') {
      const expired = r.codeExpiresAt && new Date(r.codeExpiresAt).getTime() < Date.now();
      return expired ? <span className="text-rose-300">انتهى الكود</span> : <span className="text-amber-300">كود مصدَر</span>;
    }
    return <span className="text-sky-300">بانتظار الكود</span>;
  };

  if (loading) {
    return <div className="py-16 text-center text-neutral-500 text-sm">جارٍ تحميل الأدوار...</div>;
  }

  return (
    <div className="space-y-8" dir="rtl">
      {error && (
        <div className="flex items-start gap-2 bg-rose-950/60 border border-rose-800/60 rounded-xl px-3 py-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-200">{error}</p>
        </div>
      )}
      {okMsg && (
        <div className="flex items-start gap-2 bg-emerald-950/60 border border-emerald-800/60 rounded-xl px-3 py-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-200">{okMsg}</p>
        </div>
      )}

      {/* ============ ROLE LIST ============ */}
      <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white">إدارة الأدوار</h2>
        </div>

        <div className="space-y-2 mb-5">
          {roles.length === 0 && <p className="text-sm text-neutral-500">لا توجد أدوار بعد.</p>}
          {roles.map((r) => (
            <div
              key={r.email}
              className="flex items-center justify-between gap-3 bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate" dir="ltr">{r.email}</p>
                {r.email === currentUserEmail && <p className="text-[11px] text-neutral-500">أنت</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${ROLE_BADGE[r.role]}`}>
                  {APP_ROLE_LABELS[r.role]}
                </span>
                {r.email !== OWNER_EMAIL && (
                  <button
                    onClick={() => run(() => removeRole(r.email), 'تمت إزالة الدور.')}
                    disabled={busy}
                    title="إزالة الدور"
                    className="p-2 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-neutral-800 pt-4">
          <p className="text-xs text-neutral-400 font-semibold mb-2">إضافة دور جديد</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="البريد الإلكتروني"
              dir="ltr"
              className="flex-1 px-3 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as AppRole)}
              className="px-3 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="editor">محرر (المحرّر)</option>
              <option value="operator">مشغّل</option>
            </select>
            <button
              onClick={() =>
                run(() => assignRole(newEmail, newRole), 'تمت إضافة الدور.').then(() => setNewEmail(''))
              }
              disabled={busy || !newEmail.trim()}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              إضافة
            </button>
          </div>
        </div>
      </section>

      {/* ============ ACTIVATION REQUESTS ============ */}
      <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">طلبات التفعيل</h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
            {requests.filter((r) => r.status !== 'activated').length} معلّق
          </span>
        </div>

        {issuedCode && (
          <div className="mb-4 bg-amber-950/50 border border-amber-700/50 rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-amber-200/80 mb-1">
              كود التفعيل لـ <span dir="ltr" className="font-mono">{issuedCode.email}</span> — يمنح دور{' '}
              <span className="font-bold text-amber-300">{APP_ROLE_LABELS[issuedCode.role]}</span> — مرّره لصاحب الحساب خارج التطبيق
            </p>
            <p className="text-3xl font-mono font-bold text-amber-300 tracking-[0.4em]" dir="ltr">{issuedCode.code}</p>
            <p className="text-[11px] text-amber-200/60 mt-1 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" /> صالح 24 ساعة · لمرة واحدة · مرتبط بهذا البريد فقط
            </p>
          </div>
        )}

        <div className="space-y-2">
          {requests.length === 0 && <p className="text-sm text-neutral-500">لا توجد طلبات.</p>}
          {requests.map((r) => (
            <div
              key={r.email}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate" dir="ltr">{r.email}</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  {r.displayName && <span>{r.displayName} · </span>}
                  الحالة: {requestStatusLabel(r)}
                  {r.status === 'code_issued' && r.grantedRole && (
                    <span> · الدور عند التفعيل: {APP_ROLE_LABELS[r.grantedRole]}</span>
                  )}
                  {r.status === 'code_issued' && r.codeExpiresAt && (
                    <span> · ينتهي {new Date(r.codeExpiresAt).toLocaleString('ar-SY')}</span>
                  )}
                </p>
              </div>
              {r.status !== 'activated' && (
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={grantRoles[r.email] ?? r.grantedRole ?? 'editor'}
                    onChange={(e) =>
                      setGrantRoles((prev) => ({ ...prev, [r.email]: e.target.value as AppRole }))
                    }
                    disabled={busy}
                    title="الدور الذي سيمنحه الكود عند التفعيل"
                    className="px-2.5 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-50"
                  >
                    <option value="operator">مشغّل</option>
                    <option value="editor">محرر</option>
                  </select>
                  <button
                    onClick={() =>
                      run(async () => {
                        const role = grantRoles[r.email] ?? r.grantedRole ?? 'editor';
                        const code = await issueActivationCode(r.email, role);
                        setIssuedCode({ email: r.email, code, role });
                      }, 'تم إصدار الكود.')
                    }
                    disabled={busy}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 text-xs font-bold hover:bg-amber-400 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    إصدار كود
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
