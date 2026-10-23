import React, { useState } from 'react';
import {
  Campaign,
  CAMPAIGN_STATUS_COLORS,
} from '../data/types';
import { repo } from '../data/repo';
import {
  FolderArchive,
  ExternalLink,
  FileText,
  Video,
  CheckCircle2,
  Sparkles,
  Link as LinkIcon,
  Save,
  Check,
  Play,
} from 'lucide-react';
import { formatNumberArabic } from '../utils/formatters';

interface EditorCampaignsProps {
  campaigns: Campaign[];
  onRefresh: () => void;
}

export const EditorCampaigns: React.FC<EditorCampaignsProps> = ({ campaigns, onRefresh }) => {
  const [deliveryInputs, setDeliveryInputs] = useState<Record<string, string>>({});
  const [savingCampaignId, setSavingCampaignId] = useState<string | null>(null);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const [isStartingId, setIsStartingId] = useState<string | null>(null);

  const handleStartEditing = async (campaignId: string) => {
    setIsStartingId(campaignId);
    try {
      await repo.updateCampaign(campaignId, { status: 'قيد المونتاج' });
      onRefresh();
    } finally {
      setIsStartingId(null);
    }
  };

  const handleSaveDelivery = async (campaignId: string, e: React.FormEvent) => {
    e.preventDefault();
    const link = deliveryInputs[campaignId]?.trim();
    if (!link) return;

    setSavingCampaignId(campaignId);
    try {
      await repo.submitCampaignDelivery(campaignId, link);
      setJustSavedId(campaignId);
      setTimeout(() => setJustSavedId(null), 2500);
      onRefresh();
    } finally {
      setSavingCampaignId(campaignId);
      setSavingCampaignId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner for Editor */}
      <div className="bg-gradient-to-l from-neutral-900 to-neutral-900/60 border border-neutral-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>حملات المونتاج والتسليم</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            أهلاً يا المحرّر 👋 إليك حملات العمل المعتمدة
          </h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            العمل الآن بنظام الحملات الموحدة: افتح رابط البريف للاطلاع على توجيهات الدفعة كاملة، وعند الانتهاء ضع رابط مجلد Drive الوحيد (ملف مضغوط ZIP لجميع مقاطع الحملة + ملف الكابشنز).
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-300">
            إجمالي الحملات: <strong className="font-mono text-white mr-1">{campaigns.length}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-300">
            حملات تم تسليمها: <strong className="font-mono text-emerald-400 mr-1">
              {campaigns.filter((c) => c.status === 'تم التسليم' || c.status === 'اكتمل النشر والتسليم').length}
            </strong>
          </div>
        </div>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <div className="text-center py-16 px-4 bg-neutral-900/40 rounded-2xl border border-neutral-800">
          <p className="text-neutral-400 text-sm">لا توجد حملات مسندة حالياً</p>
        </div>
      ) : (
        <div className="space-y-5">
          {campaigns.map((camp) => {
            const statusConfig = CAMPAIGN_STATUS_COLORS[camp.status] || {
              bg: 'bg-neutral-800',
              text: 'text-neutral-300',
              border: 'border-neutral-700',
            };
            const videoCount = camp.videos?.length || 0;
            const currentDeliveryLink = deliveryInputs[camp.id] !== undefined
              ? deliveryInputs[camp.id]
              : camp.deliveryLink || '';

            return (
              <div
                key={camp.id}
                className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700/80 transition-all shadow-sm space-y-4"
              >
                {/* Header: Code + Name + Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-lg text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl shrink-0">
                      {camp.code}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-white leading-snug">
                        {camp.name}
                      </h3>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        تحتوي على <strong className="text-white font-mono">{videoCount}</strong> مقاطع تابعة للحملة
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className={`text-xs px-3 py-1 rounded-full font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                      {camp.status}
                    </span>

                    {camp.status === 'تم إرسال البريف' && (
                      <button
                        type="button"
                        onClick={() => handleStartEditing(camp.id)}
                        disabled={isStartingId === camp.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-full transition-colors cursor-pointer whitespace-nowrap shadow-sm shadow-amber-500/10"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>{isStartingId === camp.id ? 'جارٍ البدء...' : 'بدء المونتاج'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Brief Link Card */}
                <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-neutral-300 truncate">
                    <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-semibold text-white">رابط ملف البريف الموحد:</span>
                    <span className="font-mono text-neutral-400 truncate max-w-[280px]">
                      {camp.briefLink}
                    </span>
                  </div>
                  {camp.briefLink && (
                    <a
                      href={camp.briefLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shrink-0"
                    >
                      <span>فتح ملف البريف</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* Single Delivery Link Form */}
                <div className="p-4 rounded-xl bg-neutral-950/80 border border-emerald-500/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                      <FolderArchive className="w-4 h-4" />
                      <span>رابط مجلد التسليم Drive (ZIP المقاطع + ملف الكابشنز):</span>
                    </div>
                    {camp.deliveryLink && (
                      <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>تم حفظ رابط التسليم</span>
                      </span>
                    )}
                  </div>

                  <form
                    onSubmit={(e) => handleSaveDelivery(camp.id, e)}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1"
                  >
                    <input
                      type="url"
                      value={currentDeliveryLink}
                      onChange={(e) =>
                        setDeliveryInputs({
                          ...deliveryInputs,
                          [camp.id]: e.target.value,
                        })
                      }
                      placeholder="https://example.com/folders/..."
                      required
                      className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-400 focus:outline-none"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={savingCampaignId === camp.id || !currentDeliveryLink.trim()}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {justSavedId === camp.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>تم الحفظ!</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>{savingCampaignId === camp.id ? 'جارٍ الحفظ...' : 'تسليم الرابط'}</span>
                          </>
                        )}
                      </button>

                      {camp.deliveryLink && (
                        <a
                          href={camp.deliveryLink}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl"
                          title="فتح الرابط المحفوظ"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </form>
                </div>

                {/* Read-Only Nested Videos List */}
                {videoCount > 0 && (
                  <div className="pt-2 border-t border-neutral-800 space-y-2">
                    <div className="text-xs font-bold text-neutral-400 flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5" />
                      <span>حالة نشر مقاطع الحملة (للاطلاع فقط):</span>
                    </div>

                    <div className="space-y-1.5">
                      {camp.videos.map((vid, idx) => (
                        <div
                          key={vid.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-neutral-950/50 rounded-xl border border-neutral-800/80 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-neutral-500 font-bold text-[11px] w-4">
                              #{idx + 1}
                            </span>
                            <span className="font-semibold text-neutral-200">
                              {vid.title}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 text-[10px]">
                              {vid.platform}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] self-end sm:self-center">
                            {vid.publishedLink ? (
                              <a
                                href={vid.publishedLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-amber-400 hover:underline flex items-center gap-1 font-mono"
                              >
                                <span>مشاهدة المنشور</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-neutral-500">قيد التجهيز للنشر</span>
                            )}

                            <span className="font-mono text-white font-semibold">
                              {formatNumberArabic(vid.views)} مشاهدة
                            </span>

                            {vid.submittedToPlatform && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold text-[10px]">
                                مقدم للمنصة
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
