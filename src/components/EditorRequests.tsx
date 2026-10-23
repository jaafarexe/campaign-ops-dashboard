import React, { useState } from 'react';
import {
  OperationalRequest,
  RequestType,
  REQUEST_TYPE_LABELS,
  AccountDataField,
} from '../data/types';
import { repo } from '../data/repo';
import {
  KeyRound,
  Mail,
  FileUp,
  Clock,
  CheckCircle2,
  ExternalLink,
  Send,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { formatArabicDate } from '../utils/formatters';

interface EditorRequestsProps {
  requests: OperationalRequest[];
  onRefresh: () => void;
}

export const EditorRequests: React.FC<EditorRequestsProps> = ({ requests, onRefresh }) => {
  // Input states keyed by request ID
  const [codeInputs, setCodeInputs] = useState<Record<string, string>>({});
  const [accountInputs, setAccountInputs] = useState<Record<string, Record<string, string>>>({});
  const [fileInputs, setFileInputs] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const answeredRequests = requests.filter((r) => r.status === 'answered');

  // Submit Type A: Single Code
  const handleSubmitCode = async (reqId: string, e: React.FormEvent) => {
    e.preventDefault();
    const code = codeInputs[reqId]?.trim();
    if (!code) return;

    setSubmittingId(reqId);
    try {
      await repo.answerCodeRequest(reqId, code);
      onRefresh();
    } finally {
      setSubmittingId(null);
    }
  };

  // Submit Type B: Dynamic Named Fields
  const handleSubmitAccountData = async (req: OperationalRequest, e: React.FormEvent) => {
    e.preventDefault();
    const fieldValues = accountInputs[req.id] || {};
    const filledFields: AccountDataField[] = (req.accountDataResponse || []).map((f) => ({
      id: f.id,
      name: f.name,
      value: fieldValues[f.id] || f.value || '',
    }));

    // Ensure all fields have values
    const hasEmpty = filledFields.some((f) => !f.value.trim());
    if (hasEmpty) {
      alert('يرجى ملء جميع الحقول المطلوبة قبل الإرسال.');
      return;
    }

    setSubmittingId(req.id);
    try {
      await repo.answerAccountDataRequest(req.id, filledFields);
      onRefresh();
    } finally {
      setSubmittingId(null);
    }
  };

  // Submit Type C: Single File Link
  const handleSubmitFile = async (reqId: string, e: React.FormEvent) => {
    e.preventDefault();
    const fileUrl = fileInputs[reqId]?.trim();
    if (!fileUrl) return;

    setSubmittingId(reqId);
    try {
      await repo.answerFileDeliveryRequest(reqId, fileUrl);
      onRefresh();
    } finally {
      setSubmittingId(null);
    }
  };

  const getTypeIcon = (type: RequestType) => {
    switch (type) {
      case 'code':
        return <KeyRound className="w-4 h-4 text-amber-400" />;
      case 'account_data':
        return <Mail className="w-4 h-4 text-indigo-400" />;
      case 'file_delivery':
        return <FileUp className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Overview Notice */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <h2 className="text-base font-bold text-white">
            الطلبات والبيانات المحددة من المشغّل
          </h2>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed">
          هنا تظهر لك طلبات المشغّل المباشرة (رموز تحقق، بيانات حسابات، تسليم ملفات محددة). قم بتعبئة الحقول المخصصة بدقة واضغط إرسال. لا توجد أي محادثة أو دردشة حرة.
        </p>
      </div>

      {/* SECTION 1: PENDING REQUESTS (Requires Editor's immediate action) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>الطلبات المعلقة وبانتظار ردك</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              {pendingRequests.length} معلق
            </span>
          </h3>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="text-center py-12 px-4 bg-neutral-900/40 rounded-2xl border border-neutral-800">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <p className="text-neutral-300 text-sm font-semibold mb-1">رائع يا المحرّر! لا توجد طلبات معلقة</p>
            <p className="text-neutral-500 text-xs">لقد قمت بالرد على كافة الطلبات السابقة</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-neutral-900 border border-amber-500/30 rounded-2xl p-5 shadow-lg shadow-black/40 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-neutral-800 border border-neutral-700">
                        {getTypeIcon(req.type)}
                      </div>
                      <span className="text-xs font-bold text-white">
                        {REQUEST_TYPE_LABELS[req.type]}
                      </span>
                    </div>

                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>مطلوب ردك</span>
                    </span>
                  </div>

                  {/* Subject & Description */}
                  <h4 className="text-base font-bold text-white mb-1.5 leading-snug">
                    {req.subject}
                  </h4>
                  {req.description && (
                    <p className="text-xs text-neutral-300 mb-4 bg-neutral-950 p-3 rounded-xl border border-neutral-800 leading-relaxed">
                      {req.description}
                    </p>
                  )}

                  {/* RIGID FORM TYPE A: Single Code Box */}
                  {req.type === 'code' && (
                    <form
                      onSubmit={(e) => handleSubmitCode(req.id, e)}
                      className="mt-4 pt-4 border-t border-neutral-800 space-y-3"
                    >
                      <div>
                        <label className="block text-xs font-semibold text-amber-300 mb-1">
                          أدخل رمز التحقق هنا:
                        </label>
                        <input
                          type="text"
                          required
                          value={codeInputs[req.id] || ''}
                          onChange={(e) =>
                            setCodeInputs({
                              ...codeInputs,
                              [req.id]: e.target.value,
                            })
                          }
                          placeholder="مثلاً: 582049"
                          className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-widest text-white focus:border-amber-400 focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submittingId === req.id || !codeInputs[req.id]?.trim()}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5 transform -scale-x-100" />
                        <span>{submittingId === req.id ? 'جارٍ الإرسال...' : 'إرسال رمز التحقق'}</span>
                      </button>
                    </form>
                  )}

                  {/* RIGID FORM TYPE B: Dynamic Defined Fields */}
                  {req.type === 'account_data' && (
                    <form
                      onSubmit={(e) => handleSubmitAccountData(req, e)}
                      className="mt-4 pt-4 border-t border-neutral-800 space-y-3"
                    >
                      <div className="text-xs text-neutral-400 mb-2 font-medium">
                        يرجى تعبئة الحقول المحددة من المشغّل أدناه:
                      </div>

                      <div className="space-y-2.5">
                        {req.accountDataResponse?.map((field) => (
                          <div key={field.id}>
                            <label className="block text-xs font-semibold text-neutral-200 mb-1">
                              {field.name}
                            </label>
                            <input
                              type="text"
                              required
                              value={accountInputs[req.id]?.[field.id] || ''}
                              onChange={(e) =>
                                setAccountInputs({
                                  ...accountInputs,
                                  [req.id]: {
                                    ...(accountInputs[req.id] || {}),
                                    [field.id]: e.target.value,
                                  },
                                })
                              }
                              placeholder={`أدخل ${field.name}...`}
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-400 focus:outline-none font-mono"
                            />
                          </div>
                        ))}
                      </div>

                      <button
                        type="submit"
                        disabled={submittingId === req.id}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition-colors cursor-pointer mt-2"
                      >
                        <Send className="w-3.5 h-3.5 transform -scale-x-100" />
                        <span>{submittingId === req.id ? 'جارٍ الإرسال...' : 'إرسال بيانات الحساب'}</span>
                      </button>
                    </form>
                  )}

                  {/* RIGID FORM TYPE C: Single File Link */}
                  {req.type === 'file_delivery' && (
                    <form
                      onSubmit={(e) => handleSubmitFile(req.id, e)}
                      className="mt-4 pt-4 border-t border-neutral-800 space-y-3"
                    >
                      <div>
                        <label className="block text-xs font-semibold text-emerald-300 mb-1">
                          رابط الملف المطلوب (أي خدمة تخزين سحابي):
                        </label>
                        <input
                          type="url"
                          required
                          value={fileInputs[req.id] || ''}
                          onChange={(e) =>
                            setFileInputs({
                              ...fileInputs,
                              [req.id]: e.target.value,
                            })
                          }
                          placeholder="https://example.com/file/..."
                          className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-emerald-400 focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submittingId === req.id || !fileInputs[req.id]?.trim()}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5 transform -scale-x-100" />
                        <span>{submittingId === req.id ? 'جارٍ الإرسال...' : 'تسليم رابط الملف'}</span>
                      </button>
                    </form>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-800/80 text-[11px] text-neutral-500 font-mono">
                  أرسله المشغّل بتاريخ: {formatArabicDate(req.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: ANSWERED REQUESTS (Historical Archive) */}
      {answeredRequests.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-neutral-800">
          <h3 className="text-base font-bold text-neutral-300 flex items-center gap-2">
            <span>الطلبات التي تم الرد عليها مسبقاً</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
              {answeredRequests.length}
            </span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {answeredRequests.map((req) => (
              <div
                key={req.id}
                className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-5 opacity-90 hover:opacity-100 transition-opacity"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-neutral-800">
                      {getTypeIcon(req.type)}
                    </div>
                    <span className="text-xs font-semibold text-neutral-300">
                      {REQUEST_TYPE_LABELS[req.type]}
                    </span>
                  </div>

                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>تم الرد</span>
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white mb-3">
                  {req.subject}
                </h4>

                {/* Response read-only display */}
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-xs space-y-1.5">
                  <div className="text-[11px] text-neutral-400 font-medium">إجابتك المسلّمة:</div>
                  
                  {req.type === 'code' && (
                    <div className="font-mono text-lg font-bold text-amber-300 tracking-wider">
                      {req.codeResponse}
                    </div>
                  )}

                  {req.type === 'account_data' && (
                    <div className="space-y-1">
                      {req.accountDataResponse?.map((f, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-neutral-400">{f.name}:</span>
                          <span className="font-mono text-white select-all">{f.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {req.type === 'file_delivery' && (
                    <a
                      href={req.fileDeliveryResponse}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-emerald-400 hover:underline flex items-center gap-1 truncate"
                    >
                      <span className="truncate">{req.fileDeliveryResponse}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-neutral-800/60 text-[10px] text-neutral-500 font-mono flex items-center justify-between">
                  <span>تاريخ الرد:</span>
                  <span>{req.answeredAt ? formatArabicDate(req.answeredAt) : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
