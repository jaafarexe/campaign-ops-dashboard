/**
 * Types for "لوحة المحرّر" (Editor Board)
 * Collections: campaigns, requests, notices, incidents
 * Work unit is CAMPAIGN with nested videos.
 * Hard constraint: NO payment data anywhere.
 */

export type CampaignStatus = 
  | 'تم إرسال البريف'
  | 'قيد المونتاج'
  | 'تم التسليم'
  | 'جارٍ النشر'
  | 'اكتمل النشر والتسليم';

export const ALL_CAMPAIGN_STATUSES: CampaignStatus[] = [
  'تم إرسال البريف',
  'قيد المونتاج',
  'تم التسليم',
  'جارٍ النشر',
  'اكتمل النشر والتسليم',
];

export const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, { bg: string; text: string; border: string }> = {
  'تم إرسال البريف': {
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    border: 'border-sky-500/20',
  },
  'قيد المونتاج': {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
  },
  'تم التسليم': {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  'جارٍ النشر': {
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
    border: 'border-violet-500/20',
  },
  'اكتمل النشر والتسليم': {
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    border: 'border-teal-500/20',
  },
};

export type VideoPlatform = 'TikTok' | 'Instagram' | 'YouTube' | 'أخرى';

export const ALL_VIDEO_PLATFORMS: VideoPlatform[] = [
  'TikTok',
  'Instagram',
  'YouTube',
  'أخرى',
];

export interface CampaignVideo {
  id: string;
  title: string; // العنوان / الهوك
  platform: VideoPlatform;
  publishedLink?: string;
  views: number;
  submittedToPlatform: boolean;
}

export interface Campaign {
  id: string;
  code: string; // e.g. 'C1', 'C2'... auto-suggested, editable
  name: string;
  briefLink: string; // رابط ملف البريف الموحد للحملة كاملة
  deliveryLink?: string; // رابط مجلد Drive من المحرّر (ملف مضغوط ZIP لجميع الفيديوهات + ملف الكابشنز)
  status: CampaignStatus;
  videos: CampaignVideo[];
  createdAt: string;
  updatedAt: string;
}

// Request Types
export type RequestType = 
  | 'code'           // Type A: طلب رمز تحقق
  | 'account_data'   // Type B: طلب بيانات حساب/بريد
  | 'file_delivery'; // Type C: طلب تسليم ملف

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  code: 'طلب رمز تحقق',
  account_data: 'طلب بيانات حساب / بريد',
  file_delivery: 'طلب تسليم ملف',
};

export interface AccountDataField {
  id: string;
  name: string; // Operator defined field label, e.g. "البريد الإلكتروني", "كلمة المرور المؤقتة"
  value: string; // Filled by Editor
}

export interface OperationalRequest {
  id: string;
  type: RequestType;
  subject: string; // الموضوع
  description?: string; // تفاصيل إضافية من المشغل
  status: 'pending' | 'answered'; // قيد الانتظار -> تم الرد
  codeResponse?: string; // Type A only
  accountDataResponse?: AccountDataField[]; // Type B only
  fileDeliveryResponse?: string; // Type C only
  createdAt: string;
  answeredAt?: string;
}

// Notice Types
export type NoticePriority = 'normal' | 'important' | 'urgent';

export const NOTICE_PRIORITY_LABELS: Record<NoticePriority, string> = {
  normal: 'عادي',
  important: 'هام',
  urgent: 'عاجل',
};

export interface Notice {
  id: string;
  title: string;
  message: string;
  priority: NoticePriority;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// Incident Types
export type IncidentType = 
  | 'حظر حساب'
  | 'تقييد حساب'
  | 'رفض من المنصة'
  | 'خطأ مونتاج'
  | 'تأخير تسليم';

export const ALL_INCIDENT_TYPES: IncidentType[] = [
  'حظر حساب',
  'تقييد حساب',
  'رفض من المنصة',
  'خطأ مونتاج',
  'تأخير تسليم',
];

export type IncidentPlatform = 'TikTok' | 'Instagram' | 'YouTube';

export const ALL_INCIDENT_PLATFORMS: IncidentPlatform[] = [
  'TikTok',
  'Instagram',
  'YouTube',
];

export interface Incident {
  id: string;
  type: IncidentType;
  platform: IncidentPlatform;
  accountHandle: string;
  relatedBriefCode: string;
  date: string; // ISO date string (e.g. 2026-10-15)
  note: string;
}

export type UserRole = 'operator' | 'editor' | 'owner';

// ---- v4: account-bound roles (appRoles collection) ----
export type AppRole = 'owner' | 'operator' | 'editor';

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  owner: 'المالك',
  operator: 'المشغّل',
  editor: 'المحرّر',
};

export interface RoleDoc {
  email: string; // doc id = lowercase email
  role: AppRole;
  displayName?: string;
  createdAt: string;
  updatedAt?: string;
}

// ---- v4: activation codes (accessRequests collection) ----
// v4.2: the OWNER issues each code and CHOOSES the role it grants
// (operator or editor) — stored on the request as grantedRole.
export type AccessRequestStatus = 'pending' | 'code_issued' | 'activated';

export interface AccessRequest {
  email: string; // doc id = lowercase email
  displayName?: string;
  requestedAt: string;
  status: AccessRequestStatus;
  grantedRole?: AppRole; // role the owner chose at code issuance (v4.2)
  code?: string;
  codeIssuedAt?: string;
  codeExpiresAt?: string;
  codeUsed?: boolean;
  codeEntered?: string;
  activatedAt?: string;
}
