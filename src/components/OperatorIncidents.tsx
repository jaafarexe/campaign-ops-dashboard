import React, { useState } from 'react';
import {
  Incident,
  IncidentType,
  IncidentPlatform,
  ALL_INCIDENT_TYPES,
  ALL_INCIDENT_PLATFORMS,
} from '../data/types';
import { repo } from '../data/repo';
import {
  Plus,
  Trash2,
  AlertTriangle,
  Calendar,
  AtSign,
  Film,
  Filter,
} from 'lucide-react';
import { formatArabicDate } from '../utils/formatters';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface OperatorIncidentsProps {
  incidents: Incident[];
  onRefresh: () => void;
}

export const OperatorIncidents: React.FC<OperatorIncidentsProps> = ({ incidents, onRefresh }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [type, setType] = useState<IncidentType>('حظر حساب');
  const [platform, setPlatform] = useState<IncidentPlatform>('TikTok');
  const [accountHandle, setAccountHandle] = useState('');
  const [relatedBriefCode, setRelatedBriefCode] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenCreateModal = () => {
    setType('حظر حساب');
    setPlatform('TikTok');
    setAccountHandle('');
    setRelatedBriefCode('C1');
    setDate(new Date().toISOString().split('T')[0]);
    setNote('');
    setIsModalOpen(true);
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountHandle.trim() || !relatedBriefCode.trim()) return;

    await repo.createIncident({
      type,
      platform,
      accountHandle: accountHandle.trim().startsWith('@') ? accountHandle.trim() : `@${accountHandle.trim()}`,
      relatedBriefCode: relatedBriefCode.trim().toUpperCase(),
      date,
      note: note.trim(),
    });

    setIsModalOpen(false);
    onRefresh();
  };

  const handleDeleteIncident = (id: string, incidentType: string, handle: string) => {
    setDeleteTarget({ id, label: `${incidentType} - ${handle}` });
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await repo.deleteIncident(deleteTarget.id);
      setDeleteTarget(null);
      onRefresh();
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredIncidents = filterType === 'all'
    ? incidents
    : incidents.filter((inc) => inc.type === filterType);

  const getIncidentBadgeColor = (t: IncidentType) => {
    switch (t) {
      case 'حظر حساب':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'تقييد حساب':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'رفض من المنصة':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'خطأ مونتاج':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'تأخير تسليم':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>سجل الحوادث والمشاكل التشغيلية</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
              {incidents.length} حادثة
            </span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            توثيق حالات حظر وتقييد الحسابات، رفض المنصة، وأخطاء المونتاج لاحتساب معدلات الجودة والأمان
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>إضافة حادثة</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <div className="flex items-center gap-1.5 text-neutral-400 pl-2 shrink-0">
          <Filter className="w-3.5 h-3.5" />
          <span>نوع الحادثة:</span>
        </div>
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
            filterType === 'all'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
          }`}
        >
          الكل ({incidents.length})
        </button>
        {ALL_INCIDENT_TYPES.map((t) => {
          const count = incidents.filter((i) => i.type === t).length;
          return (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
                filterType === t
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              {t} ({count})
            </button>
          );
        })}
      </div>

      {/* Incidents List */}
      {filteredIncidents.length === 0 ? (
        <div className="text-center py-16 px-4 bg-neutral-900/40 rounded-2xl border border-neutral-800">
          <AlertTriangle className="w-8 h-8 text-neutral-500 mx-auto mb-2 opacity-60" />
          <p className="text-neutral-400 text-sm mb-3">لا توجد حوادث مسجلة ضمن هذا التصنيف</p>
          <button
            onClick={handleOpenCreateModal}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium underline underline-offset-4"
          >
            تسجيل حادثة جديدة الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIncidents.map((incident) => {
            const badgeClass = getIncidentBadgeColor(incident.type);

            return (
              <div
                key={incident.id}
                className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700/80 transition-all shadow-sm flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Type Badge + Platform + Delete */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${badgeClass}`}>
                        {incident.type}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {incident.platform}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteIncident(incident.id, incident.type, incident.accountHandle)}
                      title="حذف الحادثة"
                      className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Account & Related Brief Code */}
                  <div className="flex items-center gap-4 mb-2 text-xs">
                    <div className="flex items-center gap-1.5 text-neutral-300">
                      <AtSign className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-mono font-semibold text-white select-all">{incident.accountHandle}</span>
                    </div>
                    <span className="text-neutral-700">·</span>
                    <div className="flex items-center gap-1.5 text-neutral-300">
                      <Film className="w-3.5 h-3.5 text-sky-400" />
                      <span className="text-neutral-400">البريف المرتبط:</span>
                      <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        {incident.relatedBriefCode}
                      </span>
                    </div>
                  </div>

                  {/* Note */}
                  {incident.note && (
                    <p className="text-xs text-neutral-300 bg-neutral-950/80 p-3 rounded-xl border border-neutral-800 leading-relaxed mt-3">
                      {incident.note}
                    </p>
                  )}
                </div>

                {/* Date footer */}
                <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>تاريخ التسجيل:</span>
                  </div>
                  <span>{formatArabicDate(incident.date)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD INCIDENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 text-right shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">تسجيل حادثة تشغيلية جديدة</h3>
            <p className="text-xs text-neutral-400 mb-5">
              سجل تفاصيل الحادثة بدقة ليتم احتساب معدلات الأمان ونسب الحظر في لوحة إحصائيات المالك
            </p>

            <form onSubmit={handleCreateIncident} className="space-y-4 text-xs">
              {/* Type dropdown */}
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">نوع الحادثة</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as IncidentType)}
                  aria-label="نوع الحادثة"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                >
                  {ALL_INCIDENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Platform dropdown */}
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">المنصة المتأثرة</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as IncidentPlatform)}
                  aria-label="المنصة المتأثرة"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                >
                  {ALL_INCIDENT_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Handle */}
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">معرّف الحساب (Account Handle)</label>
                <input
                  type="text"
                  value={accountHandle}
                  onChange={(e) => setAccountHandle(e.target.value)}
                  required
                  placeholder="@clips.account1"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Related Brief Code & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">كود الحملة المرتبطة</label>
                  <input
                    type="text"
                    value={relatedBriefCode}
                    onChange={(e) => setRelatedBriefCode(e.target.value)}
                    required
                    placeholder="C1"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">التاريخ</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">ملاحظة توضيحية موجزة</label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="وصف مختصر للسبب أو تفاصيل الحادثة..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-400 focus:outline-none resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
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
                  حفظ الحادثة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        title="تأكيد حذف الحادثة"
        message="هل أنت متأكد من حذف هذه الحادثة نهائياً؟"
        itemName={deleteTarget?.label}
        isDeleting={isDeleting}
        onConfirm={handleExecuteDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
