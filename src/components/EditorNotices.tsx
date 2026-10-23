import React from 'react';
import {
  Notice,
  NoticePriority,
  NOTICE_PRIORITY_LABELS,
} from '../data/types';
import { repo } from '../data/repo';
import {
  Bell,
  CheckCircle2,
  Check,
  Megaphone,
} from 'lucide-react';
import { formatArabicDate } from '../utils/formatters';

interface EditorNoticesProps {
  notices: Notice[];
  onRefresh: () => void;
}

export const EditorNotices: React.FC<EditorNoticesProps> = ({ notices, onRefresh }) => {
  const handleMarkAsRead = async (id: string) => {
    await repo.markNoticeAsRead(id);
    onRefresh();
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

  const unreadCount = notices.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-4 h-4 text-amber-400" />
          <h2 className="text-base font-bold text-white">
            إشعارات وتوجيهات المشغّل المباشرة
          </h2>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed">
          هذه التوجيهات صادرة من المشغّل للاطلاع الفوري. عند قراءة أي إشعار، اضغط على زر "تمت القراءة" لتأكيد اطلاعك له. (التواصل أحادي الاتجاه لتفادي أي تشتيت).
        </p>
      </div>

      {/* Notices List */}
      {notices.length === 0 ? (
        <div className="text-center py-16 px-4 bg-neutral-900/40 rounded-2xl border border-neutral-800">
          <Megaphone className="w-8 h-8 text-neutral-500 mx-auto mb-2 opacity-60" />
          <p className="text-neutral-400 text-sm">لا توجد إشعارات حالياً</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className={`rounded-2xl p-5 border transition-all flex flex-col md:flex-row md:items-start justify-between gap-4 ${
                !notice.isRead
                  ? 'bg-neutral-900 border-amber-500/30 shadow-md shadow-amber-500/5'
                  : 'bg-neutral-900/60 border-neutral-800 opacity-85'
              }`}
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${!notice.isRead ? 'bg-amber-500/20 text-amber-400' : 'bg-neutral-800 text-neutral-400'}`}>
                    <Bell className="w-4 h-4" />
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
                  تاريخ الإشعار: {formatArabicDate(notice.createdAt)}
                </div>
              </div>

              {/* Action: Mark as read button */}
              <div className="shrink-0 flex items-center md:flex-col md:items-end justify-between md:justify-start gap-2 pt-3 md:pt-0 border-t md:border-0 border-neutral-800">
                {!notice.isRead ? (
                  <button
                    onClick={() => handleMarkAsRead(notice.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>تمت القراءة</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تم تأكيد القراءة</span>
                  </div>
                )}

                {notice.readAt && (
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {formatArabicDate(notice.readAt)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
