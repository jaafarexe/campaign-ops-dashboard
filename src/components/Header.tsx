import React, { useState, useRef, useEffect } from 'react';
import { AppRole } from '../data/types';
import {
  Layers,
  HelpCircle,
  Bell,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ShieldCheck,
  Video,
  Users,
  LogOut,
  Wifi,
  WifiOff,
} from 'lucide-react';

export type ActiveTab = 'campaigns' | 'requests' | 'notices' | 'incidents' | 'dashboard' | 'roles';
export type BoardKind = 'owner' | 'operator' | 'editor';

interface HeaderProps {
  accountEmail: string;
  onSignOut: () => void;
  role: AppRole;
  board: BoardKind;
  isOwner: boolean;
  onSelectBoard: (b: BoardKind) => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  connHealthy: boolean | null; // persistent cloud-connection indicator
  pendingRequestsCount: number;
  unreadNoticesCount: number;
  campaignsCount: number;
  incidentsCount: number;
}

const BOARD_LABELS: Record<BoardKind, string> = {
  owner: 'المالك',
  operator: 'المشغّل',
  editor: 'المحرر',
};

export const Header: React.FC<HeaderProps> = ({
  accountEmail,
  onSignOut,
  role,
  board,
  isOwner,
  onSelectBoard,
  activeTab,
  onSelectTab,
  connHealthy,
  pendingRequestsCount,
  unreadNoticesCount,
  campaignsCount,
  incidentsCount,
}) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleLabel = role === 'owner' ? 'المالك' : role === 'operator' ? 'المشغّل' : 'المحرّر';

  const tabBtn = (tab: ActiveTab, label: string, icon: React.ReactNode, badge?: React.ReactNode) => (
    <button
      key={tab}
      onClick={() => onSelectTab(tab)}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
        activeTab === tab
          ? 'bg-neutral-800 text-white shadow-sm'
          : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge}
    </button>
  );

  const countBadge = (n: number, tone: 'neutral' | 'amber' | 'rose') => {
    if (n <= 0) return undefined;
    const tones = {
      neutral: 'bg-neutral-700 text-neutral-200',
      amber: 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30',
      rose: 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30',
    };
    return (
      <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded ${tones[tone]}`}>{n}</span>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          {/* Zone 1: Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-neutral-950 font-bold text-base shadow-sm">
              ص
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-white tracking-tight whitespace-nowrap">لوحة المحرّر</span>
              <span className="hidden lg:inline text-xs text-neutral-400 font-medium">— {roleLabel}</span>
            </div>
          </div>

          {/* Zone 2: tabs + owner board switcher */}
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {/* Owner board switcher (owner only) */}
            {isOwner && (
              <div className="flex items-center gap-0.5 bg-neutral-800/70 border border-neutral-700/60 rounded-lg p-0.5 shrink-0">
                {(Object.keys(BOARD_LABELS) as BoardKind[]).map((b) => (
                  <button
                    key={b}
                    onClick={() => onSelectBoard(b)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors whitespace-nowrap ${
                      board === b ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {BOARD_LABELS[b]}
                  </button>
                ))}
              </div>
            )}

            {/* Operator board tabs */}
            {board === 'operator' && (
              <nav className="flex items-center gap-1 sm:gap-1.5">
                {tabBtn('campaigns', 'الحملات', <Layers className="w-4 h-4 text-amber-400" />, countBadge(campaignsCount, 'neutral'))}
                {tabBtn('requests', 'الطلبات', <HelpCircle className="w-4 h-4" />, countBadge(pendingRequestsCount, 'amber'))}
                {tabBtn('notices', 'الإشعارات', <Bell className="w-4 h-4" />, countBadge(unreadNoticesCount, 'rose'))}
                {tabBtn('incidents', 'الحوادث', <AlertTriangle className="w-4 h-4 text-rose-400" />, countBadge(incidentsCount, 'rose'))}
              </nav>
            )}

            {/* Editor board tabs (no incidents — Editor must never see them) */}
            {board === 'editor' && (
              <nav className="flex items-center gap-1 sm:gap-1.5">
                {tabBtn('campaigns', 'حملاتي', <Layers className="w-4 h-4 text-amber-400" />, countBadge(campaignsCount, 'neutral'))}
                {tabBtn('requests', 'الطلبات', <HelpCircle className="w-4 h-4" />, countBadge(pendingRequestsCount, 'amber'))}
                {tabBtn('notices', 'التنويهات', <Bell className="w-4 h-4" />, countBadge(unreadNoticesCount, 'rose'))}
              </nav>
            )}

            {/* Owner board: roles-management shortcut (OwnerView has its own sub-tabs) */}
            {board === 'owner' && (
              <button
                onClick={() => onSelectTab('roles')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'roles'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                }`}
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span>إدارة الأدوار</span>
              </button>
            )}
          </div>

          {/* Zone 3: connection indicator + account menu */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Persistent cloud-connection indicator */}
            <span
              title={connHealthy === null ? 'جارٍ فحص الاتصال...' : connHealthy ? 'متصل بالسحابة' : 'غير متصل'}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold border ${
                connHealthy === null
                  ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  : connHealthy
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              }`}
            >
              {connHealthy === null ? (
                <span className="w-2 h-2 rounded-full bg-neutral-500 animate-pulse" />
              ) : connHealthy ? (
                <Wifi className="w-3.5 h-3.5" />
              ) : (
                <WifiOff className="w-3.5 h-3.5" />
              )}
              <span className="hidden md:inline">{connHealthy === null ? '...' : connHealthy ? 'متصل بالسحابة' : 'غير متصل'}</span>
            </span>

            {/* Account menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                title="الحساب"
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-neutral-200 bg-neutral-800/90 border border-neutral-700/80 rounded-lg hover:bg-neutral-700 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                {role === 'owner' ? (
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                ) : role === 'operator' ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Video className="w-3.5 h-3.5 text-indigo-400" />
                )}
                <span className="hidden md:inline max-w-[140px] truncate" dir="ltr">{accountEmail}</span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>
              {accountMenuOpen && (
                <div className="absolute left-0 mt-2 w-56 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl py-1 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-neutral-800">
                    <p className="text-[11px] text-neutral-500 font-semibold mb-1">الحساب الحالي</p>
                    <p className="text-white font-semibold truncate" dir="ltr">{accountEmail}</p>
                    <p className="text-neutral-400 mt-0.5">الدور: {roleLabel}</p>
                  </div>
                  <button
                    onClick={() => {
                      setAccountMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-right text-rose-300 hover:bg-neutral-800 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
