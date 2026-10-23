import React, { useState } from 'react';
import {
  Campaign,
  CampaignStatus,
  CampaignVideo,
  ALL_CAMPAIGN_STATUSES,
  CAMPAIGN_STATUS_COLORS,
  VideoPlatform,
  ALL_VIDEO_PLATFORMS,
} from '../data/types';
import { repo } from '../data/repo';
import {
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Layers,
  FolderArchive,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
  Share2,
  Eye,
  Check,
  Video,
} from 'lucide-react';
import { formatArabicDate, formatNumberArabic } from '../utils/formatters';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface OperatorCampaignsProps {
  campaigns: Campaign[];
  onRefresh: () => void;
}

export const OperatorCampaigns: React.FC<OperatorCampaignsProps> = ({ campaigns, onRefresh }) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);

  // Campaign Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [briefLink, setBriefLink] = useState('');
  const [status, setStatus] = useState<CampaignStatus>('تم إرسال البريف');

  // Add Video Form State
  const [activeAddVideoCampaignId, setActiveAddVideoCampaignId] = useState<string | null>(null);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoPlatform, setNewVideoPlatform] = useState<VideoPlatform>('TikTok');

  // Video Edit Modal
  const [editingVideoCampaignId, setEditingVideoCampaignId] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState<CampaignVideo | null>(null);
  const [videoPublishedLink, setVideoPublishedLink] = useState('');
  const [videoViews, setVideoViews] = useState('');
  const [videoSubmittedToPlatform, setVideoSubmittedToPlatform] = useState(false);

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'campaign' | 'video';
    campaignId: string;
    videoId?: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenCreateCampaign = async () => {
    const nextCode = await repo.getNextCampaignCode();
    setCode(nextCode);
    setName('');
    setBriefLink('');
    setStatus('تم إرسال البريف');
    setEditingCampaign(null);
    setIsCampaignModalOpen(true);
  };

  const handleOpenEditCampaign = (camp: Campaign) => {
    setEditingCampaign(camp);
    setCode(camp.code);
    setName(camp.name);
    setBriefLink(camp.briefLink || '');
    setStatus(camp.status);
    setIsCampaignModalOpen(true);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !briefLink.trim()) return;

    if (editingCampaign) {
      await repo.updateCampaign(editingCampaign.id, {
        code: code.trim() || editingCampaign.code,
        name: name.trim(),
        briefLink: briefLink.trim(),
        status,
      });
    } else {
      await repo.createCampaign({
        code: code.trim() || 'C1',
        name: name.trim(),
        briefLink: briefLink.trim(),
        status,
        videos: [],
      });
    }

    setIsCampaignModalOpen(false);
    onRefresh();
  };

  const handleStatusChange = async (campaignId: string, newStatus: CampaignStatus) => {
    await repo.updateCampaign(campaignId, { status: newStatus });
    onRefresh();
  };

  const handleAddVideo = async (campaignId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideoTitle.trim()) return;

    await repo.addVideoToCampaign(campaignId, {
      title: newVideoTitle.trim(),
      platform: newVideoPlatform,
      views: 0,
      submittedToPlatform: false,
    });

    setNewVideoTitle('');
    setActiveAddVideoCampaignId(null);
    onRefresh();
  };

  const handleOpenEditVideo = (campaignId: string, video: CampaignVideo) => {
    setEditingVideoCampaignId(campaignId);
    setEditingVideo(video);
    setVideoPublishedLink(video.publishedLink || '');
    setVideoViews(String(video.views || 0));
    setVideoSubmittedToPlatform(Boolean(video.submittedToPlatform));
  };

  const handleSaveVideoEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideoCampaignId || !editingVideo) return;

    const viewsNum = parseInt(videoViews, 10) || 0;
    await repo.updateCampaignVideo(editingVideoCampaignId, editingVideo.id, {
      publishedLink: videoPublishedLink.trim() || undefined,
      views: viewsNum,
      submittedToPlatform: videoSubmittedToPlatform,
    });

    setEditingVideo(null);
    setEditingVideoCampaignId(null);
    onRefresh();
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'campaign') {
        await repo.deleteCampaign(deleteTarget.campaignId);
      } else if (deleteTarget.type === 'video' && deleteTarget.videoId) {
        await repo.deleteCampaignVideo(deleteTarget.campaignId, deleteTarget.videoId);
      }
      setDeleteTarget(null);
      onRefresh();
    } catch (err) {
      console.error('Delete error', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCampaigns = filterStatus === 'all'
    ? campaigns
    : campaigns.filter((c) => c.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>إدارة الحملات الإنتاجية (Campaigns)</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
              {campaigns.length} حملة
            </span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            كل حملة تغطي دفعة مقاطع كاملة ببريف موحد ورابط تسليم Drive واحد من المونتير المحرّر
          </p>
        </div>

        <button
          onClick={handleOpenCreateCampaign}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>إنشاء حملة جديدة</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
            filterStatus === 'all'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
          }`}
        >
          الكل ({campaigns.length})
        </button>
        {ALL_CAMPAIGN_STATUSES.map((st) => {
          const count = campaigns.filter((c) => c.status === st).length;
          return (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
                filterStatus === st
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              {st} ({count})
            </button>
          );
        })}
      </div>

      {/* Campaigns List */}
      {filteredCampaigns.length === 0 ? (
        <div className="text-center py-16 px-4 bg-neutral-900/40 rounded-2xl border border-neutral-800">
          <Layers className="w-8 h-8 text-neutral-500 mx-auto mb-2 opacity-60" />
          <p className="text-neutral-400 text-sm mb-3">لا توجد حملات مسجلة ضمن هذا التصنيف</p>
          <button
            onClick={handleOpenCreateCampaign}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium underline underline-offset-4"
          >
            إنشاء أول حملة عمل الآن
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCampaigns.map((camp) => {
            const statusConfig = CAMPAIGN_STATUS_COLORS[camp.status] || {
              bg: 'bg-neutral-800',
              text: 'text-neutral-300',
              border: 'border-neutral-700',
            };
            const isExpanded = expandedCampaignId === camp.id;
            const videoCount = camp.videos?.length || 0;
            const publishedVideosCount = camp.videos?.filter((v) => Boolean(v.publishedLink)).length || 0;
            const platformSubmittedCount = camp.videos?.filter((v) => v.submittedToPlatform).length || 0;
            const campaignTotalViews = camp.videos?.reduce((acc, v) => acc + (v.views || 0), 0) || 0;

            return (
              <div
                key={camp.id}
                className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700/80 transition-all shadow-sm space-y-4"
              >
                {/* Main Bar: Code + Title + Status + Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start md:items-center gap-3">
                    <span className="font-mono font-bold text-lg text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl shrink-0">
                      {camp.code}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-white leading-snug">
                        {camp.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-neutral-400">
                        <span>{videoCount} مقاطع مسجلة</span>
                        <span className="text-neutral-700">·</span>
                        <span>{publishedVideosCount} منشورة</span>
                        <span className="text-neutral-700">·</span>
                        <span className="font-mono text-amber-400 font-semibold">{formatNumberArabic(campaignTotalViews)} مشاهدة</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    {/* Status Selector */}
                    <select
                      value={camp.status}
                      onChange={(e) => handleStatusChange(camp.id, e.target.value as CampaignStatus)}
                      aria-label="تغيير حالة الحملة"
                      className={`text-xs px-2.5 py-1.5 rounded-xl font-bold border bg-neutral-950 focus:outline-none focus:ring-1 focus:ring-amber-400 ${statusConfig.text} ${statusConfig.border}`}
                    >
                      {ALL_CAMPAIGN_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>

                    {/* Edit Campaign */}
                    <button
                      onClick={() => handleOpenEditCampaign(camp)}
                      title="تعديل تفاصيل الحملة"
                      className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete Campaign with Confirmation Modal */}
                    <button
                      onClick={() =>
                        setDeleteTarget({
                          type: 'campaign',
                          campaignId: camp.id,
                          name: `حملة (${camp.code}) - ${camp.name}`,
                        })
                      }
                      title="حذف الحملة"
                      className="p-2 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Expand/Collapse Toggle */}
                    <button
                      onClick={() => setExpandedCampaignId(isExpanded ? null : camp.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                    >
                      <span>{isExpanded ? 'إخفاء المقاطع' : 'عرض المقاطع'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Meta Links Strip: Brief Link + Editor Delivery Drive Link */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs">
                  {/* Brief link */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-neutral-400 truncate">
                      <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="font-semibold text-neutral-300">ملف البريف الموحد:</span>
                      <span className="truncate max-w-[200px] text-neutral-400 font-mono">{camp.briefLink}</span>
                    </div>
                    {camp.briefLink && (
                      <a
                        href={camp.briefLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-amber-400 hover:underline font-semibold shrink-0"
                      >
                        <span>فتح البريف</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* Delivery Drive link from Editor */}
                  <div className="flex items-center justify-between gap-2 border-t md:border-t-0 md:border-r border-neutral-800 pt-2 md:pt-0 md:pr-3">
                    <div className="flex items-center gap-1.5 text-neutral-400 truncate">
                      <FolderArchive className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-semibold text-neutral-300">مجلد التسليم (المحرّر):</span>
                      {camp.deliveryLink ? (
                        <span className="truncate max-w-[180px] text-emerald-400 font-mono">{camp.deliveryLink}</span>
                      ) : (
                        <span className="text-neutral-500">بانتظار تسليم المحرّر...</span>
                      )}
                    </div>
                    {camp.deliveryLink && (
                      <a
                        href={camp.deliveryLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-400 hover:underline font-semibold shrink-0"
                      >
                        <span>فتح مجلد Drive</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Nested Videos View (Expanded) */}
                {isExpanded && (
                  <div className="pt-3 border-t border-neutral-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-amber-400" />
                        <span>قائمة مقاطع الحملة ({videoCount})</span>
                      </h4>

                      <button
                        onClick={() => setActiveAddVideoCampaignId(camp.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3 stroke-[3]" />
                        <span>إضافة مقطع للحملة</span>
                      </button>
                    </div>

                    {/* Add Video inline form */}
                    {activeAddVideoCampaignId === camp.id && (
                      <form
                        onSubmit={(e) => handleAddVideo(camp.id, e)}
                        className="p-3 bg-neutral-950 rounded-xl border border-amber-500/30 space-y-3 text-xs"
                      >
                        <div className="font-semibold text-amber-400">إضافة مقطع جديد للحملة:</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              value={newVideoTitle}
                              onChange={(e) => setNewVideoTitle(e.target.value)}
                              placeholder="عنوان المقطع / الهوك الرئيسي..."
                              required
                              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                            />
                          </div>
                          <div>
                            <select
                              value={newVideoPlatform}
                              onChange={(e) => setNewVideoPlatform(e.target.value as VideoPlatform)}
                              aria-label="المنصة المستهدفة للمقطع"
                              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                            >
                              {ALL_VIDEO_PLATFORMS.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setActiveAddVideoCampaignId(null)}
                            className="px-3 py-1.5 text-neutral-400 hover:text-white"
                          >
                            إلغاء
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg cursor-pointer"
                          >
                            حفظ المقطع
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Videos Table/List */}
                    {videoCount === 0 ? (
                      <div className="text-center py-6 text-neutral-500 text-xs bg-neutral-950/50 rounded-xl border border-neutral-800">
                        لم يتم إضافة أي مقاطع لهذه الحملة بعد. اضغط على "إضافة مقطع للحملة".
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {camp.videos.map((vid, idx) => (
                          <div
                            key={vid.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-950/70 border border-neutral-800/80 rounded-xl text-xs hover:border-neutral-700 transition-colors"
                          >
                            <div className="flex items-start sm:items-center gap-2.5">
                              <span className="font-mono text-neutral-500 font-bold w-5 shrink-0">
                                #{idx + 1}
                              </span>
                              <div>
                                <div className="font-semibold text-white leading-snug">
                                  {vid.title}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400 mt-1">
                                  <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-medium">
                                    {vid.platform}
                                  </span>
                                  {vid.publishedLink ? (
                                    <a
                                      href={vid.publishedLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-amber-400 hover:underline flex items-center gap-1 font-mono"
                                    >
                                      <span>رابط النشر</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ) : (
                                    <span className="text-neutral-500">لم يُنشر بعد</span>
                                  )}
                                  <span className="text-neutral-700">·</span>
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
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              <button
                                onClick={() => handleOpenEditVideo(camp.id, vid)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 rounded-lg transition-colors cursor-pointer"
                              >
                                تحديث النشر والمشاهدات
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteTarget({
                                    type: 'video',
                                    campaignId: camp.id,
                                    videoId: vid.id,
                                    name: vid.title,
                                  })
                                }
                                title="حذف المقطع"
                                className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

      {/* CREATE / EDIT CAMPAIGN MODAL */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 text-right shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">
              {editingCampaign ? `تعديل الحملة (${editingCampaign.code})` : 'إنشاء حملة عمل جديدة'}
            </h3>
            <p className="text-xs text-neutral-400 mb-5">
              حدد كود الحملة ورابط البريف الموحد الشامل لكافة مقاطع الحملة
            </p>

            <form onSubmit={handleSaveCampaign} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-neutral-300 font-semibold mb-1">كود الحملة</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    placeholder="C1"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-neutral-300 font-semibold mb-1">اسم الحملة</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="مثلاً: حملة إطلاق الذكاء الاصطناعي - الدفعة الأولى"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  رابط ملف البريف الموحد (Notion, Google Docs, Figma...)
                </label>
                <input
                  type="url"
                  value={briefLink}
                  onChange={(e) => setBriefLink(e.target.value)}
                  required
                  placeholder="https://example.com/document/..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">حالة الحملة</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CampaignStatus)}
                  aria-label="حالة الحملة"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                >
                  {ALL_CAMPAIGN_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsCampaignModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer"
                >
                  {editingCampaign ? 'حفظ التعديلات' : 'إنشاء الحملة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT VIDEO METRICS MODAL */}
      {editingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 text-right shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              تحديث بيانات النشر والمشاهدات للمقطع
            </h3>
            <p className="text-xs text-neutral-400 mb-4 line-clamp-1">{editingVideo.title}</p>

            <form onSubmit={handleSaveVideoEdits} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">رابط المقطع المنشور</label>
                <input
                  type="url"
                  value={videoPublishedLink}
                  onChange={(e) => setVideoPublishedLink(e.target.value)}
                  placeholder="https://tiktok.com/@... أو https://youtube.com/shorts/..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">عدد المشاهدات</label>
                <input
                  type="number"
                  min="0"
                  value={videoViews}
                  onChange={(e) => setVideoViews(e.target.value)}
                  placeholder="0"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                  <input
                    type="checkbox"
                    checked={videoSubmittedToPlatform}
                    onChange={(e) => setVideoSubmittedToPlatform(e.target.checked)}
                    className="w-4 h-4 rounded bg-neutral-950 border-neutral-800 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <span className="font-semibold">تم تقديم المقطع إلى المنصة</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingVideo(null)}
                  className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-xl"
                >
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        title={deleteTarget?.type === 'campaign' ? 'تأكيد حذف الحملة' : 'تأكيد حذف المقطع'}
        message={
          deleteTarget?.type === 'campaign'
            ? 'هل أنت متأكد من حذف هذه الحملة وجميع المقاطع التابعة لها نهائياً؟'
            : 'هل أنت متأكد من حذف هذا المقطع من الحملة؟'
        }
        itemName={deleteTarget?.name}
        isDeleting={isDeleting}
        onConfirm={handleExecuteDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
