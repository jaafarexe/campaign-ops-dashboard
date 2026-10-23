import React, { useState } from 'react';
import {
  Campaign,
  OperationalRequest,
  Notice,
  Incident,
  ALL_CAMPAIGN_STATUSES,
  CAMPAIGN_STATUS_COLORS,
  REQUEST_TYPE_LABELS,
  ALL_INCIDENT_TYPES,
  ALL_INCIDENT_PLATFORMS,
  IncidentPlatform,
  IncidentType,
} from '../data/types';
import {
  BarChart3,
  Layers,
  HelpCircle,
  Bell,
  AlertTriangle,
  Eye,
  CheckCircle2,
  Clock,
  ExternalLink,
  KeyRound,
  Mail,
  FileUp,
  ShieldAlert,
  Percent,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  FolderArchive,
  Video,
} from 'lucide-react';
import { formatArabicDate, formatNumberArabic } from '../utils/formatters';

interface OwnerViewProps {
  campaigns: Campaign[];
  requests: OperationalRequest[];
  notices: Notice[];
  incidents: Incident[];
  activeSubTab: 'dashboard' | 'campaigns' | 'requests' | 'notices' | 'incidents';
  onSelectSubTab: (tab: 'dashboard' | 'campaigns' | 'requests' | 'notices' | 'incidents') => void;
}

export const OwnerView: React.FC<OwnerViewProps> = ({
  campaigns,
  requests,
  notices,
  incidents,
  activeSubTab,
  onSelectSubTab,
}) => {
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);

  // --- STATS COMPUTATIONS ---
  // 1. All videos flat list
  const allVideos = campaigns.flatMap((c) => c.videos || []);
  const totalVideosCount = allVideos.length;

  // 2. Publication and View counts
  const videosPublishedCount = allVideos.filter((v) => Boolean(v.publishedLink && v.publishedLink.trim())).length;
  const videosSubmittedToPlatformCount = allVideos.filter((v) => Boolean(v.submittedToPlatform)).length;
  const totalViews = allVideos.reduce((acc, v) => acc + (v.views || 0), 0);
  const avgViewsPerPublished = videosPublishedCount > 0 ? Math.round(totalViews / videosPublishedCount) : 0;

  // 3. Campaigns by status count
  const campaignsByStatus = ALL_CAMPAIGN_STATUSES.reduce((acc, status) => {
    acc[status] = campaigns.filter((c) => c.status === status).length;
    return acc;
  }, {} as Record<string, number>);

  // 4. Ban rates per platform from incidents
  const computePlatformBanStats = (plat: IncidentPlatform) => {
    const platIncidents = incidents.filter((i) => i.platform === plat);
    const uniqueAccounts = new Set(platIncidents.map((i) => i.accountHandle.toLowerCase()));
    const bannedAccounts = new Set(
      platIncidents
        .filter((i) => i.type === 'حظر حساب' || i.type === 'تقييد حساب')
        .map((i) => i.accountHandle.toLowerCase())
    );

    const totalInUse = uniqueAccounts.size;
    const banned = bannedAccounts.size;
    const banRate = totalInUse > 0 ? (banned / totalInUse) * 100 : 0;

    return {
      platform: plat,
      totalInUse,
      banned,
      banRate: banRate.toFixed(1),
    };
  };

  const platformStats = ALL_INCIDENT_PLATFORMS.map((p) => computePlatformBanStats(p));

  // Overall Ban Stats
  const allAccountsInUse = new Set(
    incidents.map((i) => `${i.platform}:${i.accountHandle.toLowerCase()}`)
  ).size;
  const allBannedAccounts = new Set(
    incidents
      .filter((i) => i.type === 'حظر حساب' || i.type === 'تقييد حساب')
      .map((i) => `${i.platform}:${i.accountHandle.toLowerCase()}`)
  ).size;
  const overallBanRate =
    allAccountsInUse > 0 ? ((allBannedAccounts / allAccountsInUse) * 100).toFixed(1) : '0.0';

  // 5. Errors & Rejection Rate
  const incidentCountsByType = ALL_INCIDENT_TYPES.reduce((acc, type) => {
    acc[type] = incidents.filter((i) => i.type === type).length;
    return acc;
  }, {} as Record<IncidentType, number>);

  const rejectedPlatformCount = incidents.filter((i) => i.type === 'رفض من المنصة').length;
  // Total submitted videos
  const totalSubmittedVideos = videosSubmittedToPlatformCount;
  const rejectionRate =
    totalSubmittedVideos > 0 ? ((rejectedPlatformCount / totalSubmittedVideos) * 100).toFixed(1) : '0.0';

  const filteredCampaigns = campaignFilter === 'all'
    ? campaigns
    : campaigns.filter((c) => c.status === campaignFilter);

  return (
    <div className="space-y-6">
      {/* Read-Only Banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>منظور المالك (Owner View) — وضع القراءة والتحليل الإحصائي (بدون أزرار تعديل أو حذف)</span>
        </div>
        <div className="flex items-center gap-3 text-neutral-400">
          <span>الحملات: <strong className="text-white font-mono">{campaigns.length}</strong></span>
          <span>·</span>
          <span>إجمالي المقاطع: <strong className="text-white font-mono">{totalVideosCount}</strong></span>
        </div>
      </div>

      {/* Owner Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs border-b border-neutral-800">
        <button
          onClick={() => onSelectSubTab('dashboard')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap shrink-0 ${
            activeSubTab === 'dashboard'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>لوحة الإحصائيات الشاملة</span>
        </button>

        <button
          onClick={() => onSelectSubTab('campaigns')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap shrink-0 ${
            activeSubTab === 'campaigns'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-400" />
          <span>الحملات والمقاطع ({campaigns.length})</span>
        </button>

        <button
          onClick={() => onSelectSubTab('requests')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap shrink-0 ${
            activeSubTab === 'requests'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>الطلبات والردود ({requests.length})</span>
        </button>

        <button
          onClick={() => onSelectSubTab('notices')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap shrink-0 ${
            activeSubTab === 'notices'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>الإشعارات ({notices.length})</span>
        </button>

        <button
          onClick={() => onSelectSubTab('incidents')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap shrink-0 ${
            activeSubTab === 'incidents'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>سجل الحوادث ({incidents.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. STATISTICS DASHBOARD (لوحة الإحصائيات) */}
      {/* ========================================================================= */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Section A & B: KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4">
              <div className="text-xs text-neutral-400 mb-1 flex items-center justify-between">
                <span>المقاطع المنشورة</span>
                <Video className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <div className="text-2xl font-mono font-bold text-white">{videosPublishedCount}</div>
              <div className="text-[11px] text-neutral-500 mt-1">
                من إجمالي <strong className="text-white font-mono">{totalVideosCount}</strong> مقاطع
              </div>
            </div>

            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4">
              <div className="text-xs text-neutral-400 mb-1 flex items-center justify-between">
                <span>المقدمة إلى المنصة</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="text-2xl font-mono font-bold text-purple-300">
                {videosSubmittedToPlatformCount}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                مقاطع تم تسليمها واعتمادها
              </div>
            </div>

            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4">
              <div className="text-xs text-neutral-400 mb-1 flex items-center justify-between">
                <span>إجمالي المشاهدات</span>
                <Eye className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-2xl font-mono font-bold text-amber-300">
                {formatNumberArabic(totalViews)}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1 font-mono">
                مجموع كافة المقاطع المنشورة
              </div>
            </div>

            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4">
              <div className="text-xs text-neutral-400 mb-1 flex items-center justify-between">
                <span>متوسط المشاهدات للمقطع</span>
                <Percent className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-2xl font-mono font-bold text-emerald-400">
                {formatNumberArabic(avgViewsPerPublished)}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1 font-mono">
                مشاهدة / فيديو منشور
              </div>
            </div>
          </div>

          {/* Section A Detail: Campaigns by Status Pipeline */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>توزيع الحملات حسب مرحلة العمل (Campaign Status Pipeline)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {ALL_CAMPAIGN_STATUSES.map((st) => {
                const colorConfig = CAMPAIGN_STATUS_COLORS[st];
                return (
                  <div key={st} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className={`text-[11px] font-semibold ${colorConfig.text}`}>{st}</div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {campaignsByStatus[st] || 0}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section C: BAN RATES (معدلات الحظر والتقييد لكل منصة وإجمالياً) */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>معدلات حظر الحسابات (Ban Rates by Platform)</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  تُحسب نسبة الحظر بقسمة عدد الحسابات المحظورة/المقيدة على إجمالي الحسابات المستخدمة في سجل الحوادث
                </p>
              </div>

              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                معدل الحظر الإجمالي: {overallBanRate}%
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400">
                    <th className="py-2.5 px-3 font-semibold">المنصة</th>
                    <th className="py-2.5 px-3 font-semibold">الحسابات النشطة المستخدمة</th>
                    <th className="py-2.5 px-3 font-semibold">الحسابات المحظورة / المقيدة</th>
                    <th className="py-2.5 px-3 font-semibold text-left">معدل الحظر (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 font-mono">
                  {platformStats.map((row) => (
                    <tr key={row.platform} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="py-3 px-3 font-sans font-bold text-white">{row.platform}</td>
                      <td className="py-3 px-3 text-neutral-300">{row.totalInUse} حساب</td>
                      <td className="py-3 px-3 text-rose-400 font-semibold">{row.banned} حساب</td>
                      <td className="py-3 px-3 text-left">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            parseFloat(row.banRate) > 0
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          {row.banRate}%
                        </span>
                      </td>
                    </tr>
                  ))}

                  {/* Overall Total Row */}
                  <tr className="bg-neutral-950 font-bold border-t-2 border-neutral-800">
                    <td className="py-3 px-3 font-sans text-amber-300">الإجمالي العام (كافة المنصات)</td>
                    <td className="py-3 px-3 text-white">{allAccountsInUse} حساب</td>
                    <td className="py-3 px-3 text-rose-400">{allBannedAccounts} حساب</td>
                    <td className="py-3 px-3 text-left">
                      <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {overallBanRate}%
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section D: ERRORS & REJECTIONS (تفصيل الحوادث ونسبة الرفض) */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-purple-400" />
              <span>تحليل الأخطاء وحالات الرفض (Operational Errors)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              {ALL_INCIDENT_TYPES.map((t) => (
                <div key={t} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[11px] text-neutral-400 truncate">{t}</div>
                  <div className="text-lg font-mono font-bold text-white mt-1">
                    {incidentCountsByType[t]}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-purple-300">
                <strong>معادلة نسبة رفض المنصة:</strong> عدد حالات الرفض من المنصة ({rejectedPlatformCount}) ÷ إجمالي الفيديوهات المقدمة للمنصة ({totalSubmittedVideos})
              </div>
              <div className="font-mono font-bold text-purple-200 text-sm">
                معدل الرفض: {rejectionRate}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CAMPAIGNS (عرض الحملات والمقاطع للقراءة فقط) */}
      {/* ========================================================================= */}
      {activeSubTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>استعراض الحملات والمقاطع (للقراءة فقط)</span>
            </h3>

            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <button
                onClick={() => setCampaignFilter('all')}
                className={`px-2.5 py-1 rounded-lg ${campaignFilter === 'all' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
              >
                الكل ({campaigns.length})
              </button>
              {ALL_CAMPAIGN_STATUSES.map((st) => (
                <button
                  key={st}
                  onClick={() => setCampaignFilter(st)}
                  className={`px-2 py-1 rounded-lg text-[11px] whitespace-nowrap ${
                    campaignFilter === st ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {st} ({campaigns.filter((c) => c.status === st).length})
                </button>
              ))}
            </div>
          </div>

          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-16 px-4 bg-neutral-900/40 rounded-2xl border border-neutral-800">
              <p className="text-neutral-400 text-sm">لا توجد حملات مطابقة للفلتر</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCampaigns.map((camp) => {
                const isExpanded = expandedCampaignId === camp.id;
                const statusColor = CAMPAIGN_STATUS_COLORS[camp.status] || {
                  bg: 'bg-neutral-800',
                  text: 'text-neutral-300',
                  border: 'border-neutral-700',
                };
                const videoCount = camp.videos?.length || 0;
                const publishedVideos = camp.videos?.filter((v) => Boolean(v.publishedLink)).length || 0;
                const campaignViews = camp.videos?.reduce((acc, v) => acc + (v.views || 0), 0) || 0;

                return (
                  <div
                    key={camp.id}
                    className="bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-700/80 transition-all shadow-sm"
                  >
                    <div className="p-4 sm:p-5 space-y-3">
                      {/* Top Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-base text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl shrink-0">
                            {camp.code}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-white">{camp.name}</h4>
                            <div className="text-xs text-neutral-400 mt-0.5 flex items-center gap-3">
                              <span>المقاطع: <strong className="font-mono text-white">{videoCount}</strong></span>
                              <span>·</span>
                              <span>المنشور: <strong className="font-mono text-violet-400">{publishedVideos}</strong></span>
                              <span>·</span>
                              <span>المشاهدات: <strong className="font-mono text-amber-300">{formatNumberArabic(campaignViews)}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <span className={`text-xs px-3 py-1 rounded-full font-bold border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                            {camp.status}
                          </span>

                          <button
                            type="button"
                            onClick={() => setExpandedCampaignId(isExpanded ? null : camp.id)}
                            className="p-1.5 text-neutral-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                            title={isExpanded ? 'طي تفاصيل المقاطع' : 'عرض تفاصيل المقاطع'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Brief Link and Delivery Link Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 bg-neutral-950 rounded-xl border border-neutral-800/80 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-neutral-400 truncate">
                            <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="font-semibold text-neutral-300">البريف:</span>
                            <span className="font-mono truncate">{camp.briefLink}</span>
                          </div>
                          {camp.briefLink && (
                            <a
                              href={camp.briefLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-400 hover:underline flex items-center gap-1 font-semibold shrink-0"
                            >
                              <span>فتح</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        <div className="p-2.5 bg-neutral-950 rounded-xl border border-neutral-800/80 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-neutral-400 truncate">
                            <FolderArchive className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="font-semibold text-neutral-300">تسليم المحرّر:</span>
                            {camp.deliveryLink ? (
                              <span className="font-mono text-emerald-300 truncate">{camp.deliveryLink}</span>
                            ) : (
                              <span className="text-neutral-500 italic">لم يُسلَّم بعد</span>
                            )}
                          </div>
                          {camp.deliveryLink && (
                            <a
                              href={camp.deliveryLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold shrink-0"
                            >
                              <span>فتح المجلد</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Nested Videos Section */}
                    {isExpanded && (
                      <div className="p-4 bg-neutral-950/60 border-t border-neutral-800 space-y-3">
                        <div className="text-xs font-bold text-neutral-300 flex items-center justify-between">
                          <span>مقاطع الحملة ({videoCount}):</span>
                        </div>

                        {videoCount === 0 ? (
                          <div className="text-xs text-neutral-500 py-3 text-center">
                            لا توجد مقاطع مضافة لهذه الحملة بعد
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {camp.videos.map((vid, idx) => (
                              <div
                                key={vid.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-neutral-900/90 rounded-xl border border-neutral-800 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-neutral-500 font-bold text-[11px] w-5">
                                    #{idx + 1}
                                  </span>
                                  <span className="font-semibold text-white">
                                    {vid.title}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono text-[10px]">
                                    {vid.platform}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 text-xs self-end sm:self-center">
                                  {vid.publishedLink ? (
                                    <a
                                      href={vid.publishedLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-amber-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                                    >
                                      <span>مشاهدة المنشور</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ) : (
                                    <span className="text-neutral-500 text-[11px]">لم يُنشر</span>
                                  )}

                                  <span className="font-mono text-white font-bold text-[11px]">
                                    {formatNumberArabic(vid.views || 0)} مشاهدة
                                  </span>

                                  {vid.submittedToPlatform ? (
                                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold text-[10px]">
                                      مقدم للمنصة
                                    </span>
                                  ) : (
                                    <span className="text-neutral-600 text-[10px]">غير مقدم للمنصة</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. REQUESTS (عرض للقراءة فقط) */}
      {/* ========================================================================= */}
      {activeSubTab === 'requests' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span>سجل الطلبات والردود (للقراءة فقط)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {req.type === 'code' ? (
                      <KeyRound className="w-4 h-4 text-amber-400" />
                    ) : req.type === 'account_data' ? (
                      <Mail className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <FileUp className="w-4 h-4 text-emerald-400" />
                    )}
                    <span className="text-xs font-semibold text-neutral-300">
                      {REQUEST_TYPE_LABELS[req.type]}
                    </span>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${
                      req.status === 'answered'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {req.status === 'answered' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>تم الرد</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3" />
                        <span>قيد الانتظار</span>
                      </>
                    )}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white">{req.subject}</h4>
                {req.description && (
                  <p className="text-xs text-neutral-400">{req.description}</p>
                )}

                {req.status === 'answered' ? (
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-1.5">
                    <div className="text-[11px] text-emerald-400 font-semibold">رد المحرّر:</div>
                    {req.type === 'code' && (
                      <div className="font-mono text-xl font-bold text-amber-300">
                        {req.codeResponse}
                      </div>
                    )}
                    {req.type === 'account_data' && (
                      <div className="space-y-1">
                        {req.accountDataResponse?.map((f, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
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
                        className="text-emerald-400 hover:underline font-mono truncate block"
                      >
                        {req.fileDeliveryResponse}
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800 text-xs text-neutral-500">
                    بانتظار رد المحرّر...
                  </div>
                )}

                <div className="pt-2 border-t border-neutral-800 text-[11px] text-neutral-500 font-mono">
                  تاريخ الإرسال: {formatArabicDate(req.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. NOTICES (عرض للقراءة فقط) */}
      {/* ========================================================================= */}
      {activeSubTab === 'notices' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" />
            <span>سجل الإشعارات المرسلة (للقراءة فقط)</span>
          </h3>

          <div className="space-y-3">
            {notices.map((notice) => (
              <div
                key={notice.id}
                className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-amber-400" />
                    <h4 className="text-sm font-bold text-white">{notice.title}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
                      {notice.priority}
                    </span>
                  </div>
                  <p className="text-neutral-300 leading-relaxed pl-2">{notice.message}</p>
                  <div className="text-[11px] text-neutral-500 font-mono">
                    تاريخ الإرسال: {formatArabicDate(notice.createdAt)}
                  </div>
                </div>

                <div className="shrink-0">
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. INCIDENTS (عرض للقراءة فقط) */}
      {/* ========================================================================= */}
      {activeSubTab === 'incidents' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>سجل الحوادث والمشاكل (للقراءة فقط)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 text-xs space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                      {incident.type}
                    </span>
                    <span className="font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                      {incident.platform}
                    </span>
                  </div>
                  <span className="font-mono text-neutral-400 text-[11px]">{incident.date}</span>
                </div>

                <div className="flex items-center gap-3 text-neutral-300">
                  <div>الحساب: <strong className="text-white font-mono">{incident.accountHandle}</strong></div>
                  <span>·</span>
                  <div>الرمز/الحملة: <strong className="text-amber-300 font-mono">{incident.relatedBriefCode}</strong></div>
                </div>

                {incident.note && (
                  <p className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 text-neutral-300">
                    {incident.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
