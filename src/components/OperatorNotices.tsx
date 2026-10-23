import React, { useState } from 'react';
import {
  Notice,
  NoticePriority,
  NOTICE_PRIORITY_LABELS,
} from '../data/types';
import { repo } from '../data/repo';
import {
  Plus,
  Trash2,
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
  Megaphone,
} from 'lucide-react';
import { formatArabicDate } from '../utils/formatters';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface OperatorNoticesProps {
  notices: Notice[];
  onRefresh: () => void;
}

export const OperatorNotices: React.FC<OperatorNoticesProps> = ({ notices, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<NoticePriority>('normal');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenCreateModal = () => {
    setTitle('');
    setMessage('');
    setPriority('normal');
    setIsModalOpen(true);
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    await repo.createNotice({
      title: title.trim(),
      message: message.trim(),
      priority,
    });

    setIsModalOpen(false);
    onRefresh();
  };

  const handleDeleteNotice = (id: string, noticeTitle: string) => {
    setDeleteTarget({ id, title: noticeTitle });
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await repo.deleteNotice(deleteTarget.id);
      setDeleteTarget(null);
      onRefresh();
    } finally {
      setIsDeleting(false);
    }
  };

  const getPriorityBadge = (p: NoticePriority) => {
    switch (p) {
      case 'urgent':
        return (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {NOTICE_PRIORITY_LABELS.urgent}
          </span>
        );
      case 'important':
        return (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {NOTICE_PRIORITY_LABELS.important}
          </span>
        );
      case 'normal':
        return (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
            {NOTICE_PRIORITY_LABELS.normal}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>الإشعارات والتوجيهات المباشرة</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
              {notices.length} إشعار
            </span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            إشعارات في اتجاه واحد من المشغّل للمحرّر، بدون إمكانية الرد لضمان التركيز
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>إرسال إشعار جديد</span>
        </button>
      </div>

      {/* Notices List */}
      {notices.length === 0 ? (
        <div className="text-center py-16 px-4 bg-neutral-900/40 rounded-2xl border border-neutral-800">
          <Megaphone className="w-8 h-8 text-neutral-500 mx-auto mb-2 opacity-60" />
          <p className="text-neutral-400 text-sm mb-3">لا توجد إشعارات مرسلة حالياً</p>
          <button
            onClick={handleOpenCreateModal}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium underline underline-offset-4"
          >
            إرسال أول إشعار للمحرّر
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700/80 transition-all shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-neutral-800">
                    <Bell className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <h3 className="text-base font-bold text-white leading-snug">
                    {notice.title}
                  </h3>
                  {getPriorityBadge(notice.priority)}
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap pl-2">
                  {notice.message}
                </p>

                <div className="text-[11px] text-neutral-500 font-mono pt-1">
                  تاريخ الإرسال: {formatArabicDate(notice.createdAt)}
                </div>
              </div>

              {/* Read / Unread Status Badge + Delete */}
              <div className="flex items-center md:flex-col md:items-end justify-between md:justify-start gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-0 border-neutral-800">
                <div className="text-xs">
                  {notice.isRead ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>تمت القراءة بواسطة المحرّر</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>لم يُقرأ بعد</span>
                    </div>
                  )}
                  {notice.readAt && (
                    <div className="text-[10px] text-neutral-500 font-mono text-left mt-1">
                      {formatArabicDate(notice.readAt)}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteNotice(notice.id, notice.title)}
                  title="حذف الإشعار"
                  className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE NOTICE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 text-right shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">إرسال إشعار توجيهي جديد للمحرّر</h3>
            <p className="text-xs text-neutral-400 mb-5">
              الإشعار أحادي الاتجاه؛ سيتمكن المحرّر فقط من النقر على "تمت القراءة" دون كتابة ردود
            </p>

            <form onSubmit={handleCreateNotice} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">عنوان الإشعار</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="مثلاً: تحديث معايير التصدير أو موعد تسليم الدفعة..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1.5">مستوى الأهمية</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority('normal')}
                    className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                      priority === 'normal'
                        ? 'bg-neutral-800 border-neutral-600 text-white font-semibold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    عادي
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('important')}
                    className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                      priority === 'important'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-semibold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    هام
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('urgent')}
                    className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                      priority === 'urgent'
                        ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 font-semibold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    عاجل
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">نص التوجيه / الرسالة</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  placeholder="اكتب التوجيهات أو التعليمات بوضوح..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-400 focus:outline-none resize-none"
                />
              </div>

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
                  إرسال الإشعار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        title="تأكيد حذف الإشعار"
        message="هل أنت متأكد من حذف هذا الإشعار نهائياً؟"
        itemName={deleteTarget?.title}
        isDeleting={isDeleting}
        onConfirm={handleExecuteDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
