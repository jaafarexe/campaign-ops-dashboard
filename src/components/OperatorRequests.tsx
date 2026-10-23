import React, { useState } from 'react';
import {
  OperationalRequest,
  RequestType,
  REQUEST_TYPE_LABELS,
  AccountDataField,
} from '../data/types';
import { repo } from '../data/repo';
import {
  Plus,
  Trash2,
  KeyRound,
  Mail,
  FileUp,
  Clock,
  CheckCircle,
  Copy,
  Check,
  ExternalLink,
  PlusCircle,
  X,
  Filter,
} from 'lucide-react';
import { formatArabicDate } from '../utils/formatters';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface OperatorRequestsProps {
  requests: OperationalRequest[];
  onRefresh: () => void;
}

export const OperatorRequests: React.FC<OperatorRequestsProps> = ({ requests, onRefresh }) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'answered'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form State
  const [requestType, setRequestType] = useState<RequestType>('code');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  // Dynamic fields for Type B:
  const [customFields, setCustomFields] = useState<string[]>([
    'البريد الإلكتروني',
    'كلمة المرور المؤقتة',
  ]);
  const [newFieldName, setNewFieldName] = useState('');

  const handleOpenCreateModal = () => {
    setRequestType('code');
    setSubject('');
    setDescription('');
    setCustomFields(['البريد الإلكتروني', 'كلمة المرور المؤقتة']);
    setNewFieldName('');
    setIsModalOpen(true);
  };

  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    setCustomFields([...customFields, newFieldName.trim()]);
    setNewFieldName('');
  };

  const handleRemoveField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;

    if (requestType === 'account_data' && customFields.length === 0) {
      alert('يرجى تحديد حقل واحد على الأقل لطلب بيانات الحساب.');
      return;
    }

    const accountFields: AccountDataField[] | undefined =
      requestType === 'account_data'
        ? customFields.map((f, i) => ({
            id: `field-${Date.now()}-${i}`,
            name: f,
            value: '',
          }))
        : undefined;

    await repo.createRequest({
      type: requestType,
      subject: subject.trim(),
      description: description.trim() || undefined,
      accountDataResponse: accountFields,
    });
    setIsModalOpen(false);
    onRefresh();
  };

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; subject: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await repo.deleteRequest(deleteTarget.id);
      setDeleteTarget(null);
      onRefresh();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredRequests = requests.filter((r) => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

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
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>الطلبات الموجهة للمحرّر</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
              {requests.length} طلب
            </span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            إرسال طلبات محددة وصارمة الحقول (رموز تحقق، بيانات حسابات، تسليم ملفات) خالية من أي شات
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>إرسال طلب جديد</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-neutral-400 pl-2 shrink-0">
          <Filter className="w-3.5 h-3.5" />
          <span>الحالة:</span>
        </div>
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
            filterStatus === 'all'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
          }`}
        >
          الكل ({requests.length})
        </button>
        <button
          onClick={() => setFilterStatus('pending')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
            filterStatus === 'pending'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
          }`}
        >
          قيد الانتظار ({requests.filter((r) => r.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilterStatus('answered')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
            filterStatus === 'answered'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
          }`}
        >
          تم الرد ({requests.filter((r) => r.status === 'answered').length})
        </button>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-16 px-4 bg-neutral-900/40 rounded-2xl border border-neutral-800">
          <p className="text-neutral-400 text-sm mb-3">لا توجد طلبات تطابق هذه الحالة</p>
          <button
            onClick={handleOpenCreateModal}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium underline underline-offset-4"
          >
            إرسال أول طلب للمحرّر الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((req) => {
            const isAnswered = req.status === 'answered';

            return (
              <div
                key={req.id}
                className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between hover:border-neutral-700/80 transition-all shadow-sm"
              >
                <div>
                  {/* Top Bar: Type + Status + Delete */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-neutral-800 border border-neutral-700">
                        {getTypeIcon(req.type)}
                      </div>
                      <span className="text-xs font-semibold text-neutral-300">
                        {REQUEST_TYPE_LABELS[req.type]}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${
                          isAnswered
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {isAnswered ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            <span>تم الرد</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            <span>قيد الانتظار</span>
                          </>
                        )}
                      </span>

                      <button
                        onClick={() => setDeleteTarget({ id: req.id, subject: req.subject })}
                        title="حذف الطلب"
                        className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Subject & Description */}
                  <h3 className="text-base font-bold text-white mb-1 leading-snug">
                    {req.subject}
                  </h3>
                  {req.description && (
                    <p className="text-xs text-neutral-400 mb-3 leading-relaxed">
                      {req.description}
                    </p>
                  )}

                  {/* Response Display Box (Fixed structured fields) */}
                  <div className="mt-4 pt-3 border-t border-neutral-800/80">
                    {!isAnswered ? (
                      <div className="p-3 rounded-xl bg-neutral-950/60 border border-dashed border-neutral-800 text-xs text-neutral-400 text-center">
                        <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1 opacity-80" />
                        <span>بانتظار إدخال المحرّر للبيانات المطلوبة بدقة...</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-xs font-semibold text-emerald-400 flex items-center justify-between">
                          <span>رد المحرّر المستلم:</span>
                          {req.answeredAt && (
                            <span className="text-[11px] text-neutral-500 font-mono">
                              {formatArabicDate(req.answeredAt)}
                            </span>
                          )}
                        </div>

                        {/* Type A Response: Single Code Field */}
                        {req.type === 'code' && (
                          <div className="p-4 rounded-xl bg-neutral-950 border border-amber-500/30 flex items-center justify-between gap-3">
                            <span className="font-mono text-2xl font-black text-amber-300 tracking-widest">
                              {req.codeResponse || '—'}
                            </span>
                            {req.codeResponse && (
                              <button
                                onClick={() => handleCopy(`code-${req.id}`, req.codeResponse!)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
                              >
                                {copiedKey === `code-${req.id}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>تم النسخ</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>نسخ الرمز</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Type B Response: Dynamic Named Fields */}
                        {req.type === 'account_data' && (
                          <div className="space-y-2 bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-xs">
                            {req.accountDataResponse?.map((field, idx) => (
                              <div
                                key={field.id || idx}
                                className="flex items-center justify-between gap-2 py-1.5 border-b border-neutral-800/80 last:border-0"
                              >
                                <span className="text-neutral-400 font-medium">{field.name}:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-white select-all">
                                    {field.value || '—'}
                                  </span>
                                  {field.value && (
                                    <button
                                      onClick={() => handleCopy(`field-${req.id}-${idx}`, field.value)}
                                      title="نسخ القيمة"
                                      className="p-1 text-neutral-400 hover:text-amber-300"
                                    >
                                      {copiedKey === `field-${req.id}-${idx}` ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Type C Response: File Delivery Link */}
                        {req.type === 'file_delivery' && (
                          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs flex items-center justify-between gap-3">
                            <span className="font-mono text-white truncate max-w-[240px]">
                              {req.fileDeliveryResponse || '—'}
                            </span>
                            {req.fileDeliveryResponse && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => handleCopy(`file-${req.id}`, req.fileDeliveryResponse!)}
                                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
                                  title="نسخ الرابط"
                                >
                                  {copiedKey === `file-${req.id}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <a
                                  href={req.fileDeliveryResponse}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
                                >
                                  <span>فتح الرابط</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Timestamp */}
                <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                  <span>أُرسل بتاريخ:</span>
                  <span>{formatArabicDate(req.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE REQUEST MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 text-right max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">إرسال طلب مهيكل جديد للمحرّر</h3>
            <p className="text-xs text-neutral-400 mb-5">
              اختر نوع الطلب وحدد الحقول التي سيملأها المحرّر بدقة دون أي محادثة حرة
            </p>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
              {/* Request Type Selector */}
              <div>
                <label className="block text-neutral-300 font-semibold mb-2">نوع الطلب</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestType('code')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      requestType === 'code'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <KeyRound className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                    <span>رمز تحقق</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRequestType('account_data')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      requestType === 'account_data'
                        ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300 font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <Mail className="w-5 h-5 mx-auto mb-1 text-indigo-400" />
                    <span>بيانات حساب</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRequestType('file_delivery')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      requestType === 'file_delivery'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <FileUp className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                    <span>تسليم ملف</span>
                  </button>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">موضوع الطلب</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  placeholder={
                    requestType === 'code'
                      ? 'مثال: رمز دخول حساب تيك توك الرئيسي'
                      : requestType === 'account_data'
                      ? 'مثال: بيانات تسجيل الدخول لحساب كاب كت'
                      : 'مثال: تسليم حزمة الخطوط والمؤثرات للمشروع V1'
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Description / Instructions */}
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">تعليمات وتفاصيل إضافية (اختياري)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="أية توضيحات للمحرّر بشأن الطلب..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-400 focus:outline-none resize-none"
                />
              </div>

              {/* Dynamic Fields definition for Type B */}
              {requestType === 'account_data' && (
                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3">
                  <div className="font-semibold text-white flex items-center justify-between">
                    <span>الحقول المطلوب من المحرّر تعبئتها:</span>
                    <span className="text-[11px] text-neutral-400 font-normal">
                      {customFields.length} حقول
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {customFields.map((field, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800"
                      >
                        <span className="text-neutral-200">{field}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveField(idx)}
                          className="text-neutral-500 hover:text-rose-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Field Input */}
                  <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
                    <input
                      type="text"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      placeholder="اسم الحقل الجديد (مثلاً: كود المصادقة الثنائية)"
                      className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white focus:border-indigo-400 focus:outline-none text-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddField();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddField}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>إضافة</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Field format preview notice */}
              <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-[11px] text-neutral-400">
                {requestType === 'code' && '💡 سيظهر للمحرّر مربع إدخال وحيد مخصص لإدخال رمز التحقق فقط.'}
                {requestType === 'account_data' && '💡 سيظهر للمحرّر حقل إدخال منفصل لكل بند من البنود أعلاه.'}
                {requestType === 'file_delivery' && '💡 سيظهر للمحرّر حقل مخصص لوضع رابط الملف المرفوع فقط.'}
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer"
                >
                  إرسال الطلب الآن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        title="تأكيد حذف الطلب"
        message="هل أنت متأكد من حذف هذا الطلب نهائياً؟"
        itemName={deleteTarget?.subject}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
