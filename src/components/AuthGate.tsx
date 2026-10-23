import React, { useState } from 'react';
import { AuthAccount } from '../data/auth';
import { AccessRequest } from '../data/types';
import { requestActivationCode, activateWithCode } from '../data/roles';
import { LogIn, KeyRound, Loader2, LogOut, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthGateProps {
  account: AuthAccount | null; // null → not signed in
  accessRequest: AccessRequest | null; // only when signed in but roleless
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onRequestCreated: () => void; // refresh the request state
  onActivated: () => void; // refresh role resolution
}

export const AuthGate: React.FC<AuthGateProps> = ({
  account,
  accessRequest,
  onSignIn,
  onSignOut,
  onRequestCreated,
  onActivated,
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      after?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ — أعد المحاولة.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-neutral-950 font-bold text-2xl shadow">
              ص
            </div>
          </div>
          <h1 className="text-xl font-bold text-white text-center mb-2">لوحة المحرّر</h1>
          <p className="text-sm text-neutral-400 text-center mb-6 leading-relaxed">
            الدخول بحساب جوجل — الحساب هو الذي يحدد لوحتك تلقائياً.
          </p>

          {error && (
            <div className="mb-4 flex items-start gap-2 bg-rose-950/60 border border-rose-800/60 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-200 leading-relaxed">{error}</p>
            </div>
          )}
          {okMsg && (
            <div className="mb-4 flex items-start gap-2 bg-emerald-950/60 border border-emerald-800/60 rounded-xl px-3 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-200 leading-relaxed">{okMsg}</p>
            </div>
          )}

          {/* ---------- NOT SIGNED IN ---------- */}
          {!account && (
            <button
              onClick={() => run(onSignIn)}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-neutral-900 font-bold text-sm hover:bg-neutral-200 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              تسجيل الدخول بحساب جوجل
            </button>
          )}

          {/* ---------- SIGNED IN, NO ROLE ---------- */}
          {account && !accessRequest && (
            <div className="space-y-4">
              <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-neutral-400">مسجّل الدخول باسم</p>
                <p className="text-sm font-bold text-white mt-1" dir="ltr">{account.email}</p>
              </div>
              <p className="text-sm text-neutral-300 text-center leading-relaxed">
                هذا الحساب غير مصرّح بعد. اطلب كود التفعيل من المالك ليفتح لك لوحتك.
              </p>
              <button
                onClick={() =>
                  run(() => requestActivationCode(account.email, account.displayName ?? ''), () => {
                    setOkMsg('تم إرسال الطلب — بانتظار إصدار الكود من المالك.');
                    onRequestCreated();
                  })
                }
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 text-neutral-950 font-bold text-sm hover:bg-amber-400 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                طلب كود التفعيل
              </button>
              <button
                onClick={() => run(onSignOut)}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                تسجيل الخروج
              </button>
            </div>
          )}

          {/* ---------- SIGNED IN, REQUEST PENDING / CODE ISSUED ---------- */}
          {account && accessRequest && accessRequest.status !== 'activated' && (
            <div className="space-y-4">
              <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-neutral-400">مسجّل الدخول باسم</p>
                <p className="text-sm font-bold text-white mt-1" dir="ltr">{account.email}</p>
              </div>

              {accessRequest.status === 'pending' && (
                <p className="text-sm text-neutral-300 text-center leading-relaxed">
                  طلبك وصل — <span className="text-amber-400 font-bold">بانتظار إصدار الكود</span> من المالك.
                </p>
              )}

              {accessRequest.status === 'code_issued' && (
                <div className="space-y-3">
                  <p className="text-sm text-neutral-300 text-center leading-relaxed">
                    صدر لك كود تفعيل — أدخله هنا لفتح لوحتك (صالح 24 ساعة، لمرة واحدة).
                  </p>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    inputMode="numeric"
                    dir="ltr"
                    className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-center text-2xl font-mono font-bold text-white tracking-[0.5em] placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() =>
                      run(() => activateWithCode(account.email, code), () => {
                        setOkMsg('تم التفعيل — أهلاً بك في لوحتك.');
                        onActivated();
                      })
                    }
                    disabled={busy || code.length !== 6}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 text-neutral-950 font-bold text-sm hover:bg-amber-400 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    تفعيل الحساب
                  </button>
                  <button
                    onClick={() =>
                      run(() => requestActivationCode(account.email, account.displayName ?? ''), () => {
                        setOkMsg('تم طلب كود جديد.');
                        onRequestCreated();
                      })
                    }
                    disabled={busy}
                    className="w-full text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    لم يصلك الكود؟ اطلب كوداً جديداً
                  </button>
                </div>
              )}

              <button
                onClick={() => run(onSignOut)}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                تسجيل الخروج
              </button>
            </div>
          )}
        </div>
        <p className="text-center text-[11px] text-neutral-600 mt-4">
          حسابك = لوحتك. لا تُشارك كود التفعيل مع أحد.
        </p>
      </div>
    </div>
  );
};
