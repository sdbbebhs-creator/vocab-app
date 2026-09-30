import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Database, Sparkles, Flame, Clock, Sun, Moon, Brain, Shield, ShieldCheck, ShieldAlert, Award, LogOut, UserCircle } from 'lucide-react';
import { UserRankData } from '../types';
import { getRankTierByKey } from '../utils/rankSystem';

interface NavbarProps {
  onOpenAddModal: () => void;
  onOpenBackupModal: () => void;
  onOpenOptimizer?: () => void;
  onLoadSampleData: () => void;
  hasItems: boolean;
  streakCount: number;
  isStreakJumping?: boolean;
  onStreakClick?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  rankData?: UserRankData;
  onOpenRankModal?: () => void;
  onLogoClick?: () => void;
  userEmail?: string | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddModal,
  onOpenBackupModal,
  onOpenOptimizer,
  onLoadSampleData,
  hasItems,
  streakCount,
  isStreakJumping = false,
  onStreakClick,
  isDarkMode,
  onToggleDarkMode,
  rankData,
  onOpenRankModal,
  onLogoClick,
  userEmail,
  onLogout,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  const currentTier = rankData ? getRankTierByKey(rankData.tierKey) : null;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
      setDateStr(
        now.toLocaleDateString('vi-VN', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 shadow-2xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo and title */}
        <div
          onClick={onLogoClick}
          className="flex items-center gap-2.5 sm:gap-3 min-w-0 cursor-pointer group select-none"
          title="Bấm để cuộn lên đầu / Màn hình chính"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xs shadow-emerald-600/20 shrink-0 group-hover:scale-105 transition-transform">
            <BookOpen size={20} className="sm:w-[22px] sm:h-[22px]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm xs:text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 truncate max-w-[150px] xs:max-w-[220px] sm:max-w-none group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                FSRS Ôn Tập Thông Minh
              </h1>
              <span className="hidden md:inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-transparent dark:border-emerald-500/30 rounded-full shrink-0">
                FSRS v4 Scheduler
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 hidden sm:block truncate">
              Kho từ vựng & ngữ pháp với thuật toán lặp lại ngắt quãng FSRS v4 và hàng đợi ưu tiên
            </p>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Theme Toggle Button */}
          <button
            type="button"
            id="btn-toggle-theme"
            onClick={onToggleDarkMode}
            className="inline-flex items-center justify-center gap-1.5 h-9 sm:h-10 px-2 sm:px-2.5 text-xs font-semibold bg-slate-100 dark:bg-slate-900 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shrink-0"
            title={isDarkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối hài hòa'}
            aria-label="Đổi giao diện sáng/tối"
          >
            {isDarkMode ? (
              <Sun size={15} className="text-amber-400 animate-pulse" />
            ) : (
              <Moon size={15} className="text-indigo-600" />
            )}
            <span className="hidden xl:inline">{isDarkMode ? 'Tối' : 'Sáng'}</span>
          </button>

          {/* Rank Tier Badge */}
          {currentTier && (
            <button
              type="button"
              id="navbar-rank-badge"
              onClick={onOpenRankModal}
              className={`relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border-2 text-xs font-black transition-all cursor-pointer active:scale-95 shadow-xs hover:scale-105 shrink-0 ${currentTier.badgeClass}`}
              title={`Đẳng Cấp: Rank ${currentTier.nameVi} (${currentTier.titleVi}) - ${
                rankData?.todayProtected ? 'Đã bảo vệ rank hôm nay!' : 'Chưa bảo vệ rank hôm nay! Bấm để xem chi tiết.'
              }`}
            >
              <span className="text-sm leading-none">{currentTier.icon}</span>
              <span className="hidden md:inline font-black tracking-tight">
                Rank {currentTier.nameVi}
              </span>

              {/* Status indicator dot: Green (protected) or Pulsing Amber (risk) */}
              <span
                className={`w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-900 shrink-0 ${
                  rankData?.todayProtected
                    ? 'bg-emerald-500'
                    : 'bg-rose-500 animate-ping'
                }`}
                title={rankData?.todayProtected ? 'Hôm nay: An toàn' : 'Hôm nay: Cần ôn tập để giữ Rank!'}
              />
            </button>
          )}

          {/* Streak indicator with steady glowing flame (No bobbing/jumping) */}
          <div
            id="navbar-streak-badge"
            onClick={onStreakClick || onOpenRankModal}
            className={`relative overflow-visible flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-black select-none transition-all group cursor-pointer active:scale-95 shrink-0 ${
              streakCount === 0
                ? 'bg-slate-100 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-amber-400 dark:hover:border-amber-500/70 hover:text-amber-600 dark:hover:text-amber-300'
                : 'fire-streak-box bg-gradient-to-r from-amber-500/20 via-orange-500/25 to-rose-500/20 dark:from-amber-500/25 dark:via-orange-500/35 dark:to-rose-500/25 border-2 border-amber-400 dark:border-amber-500/80 text-amber-950 dark:text-amber-200 shadow-sm'
            }`}
            title={
              streakCount === 0
                ? 'Chuỗi lửa: 0 ngày. Hoàn thành tất cả lịch thẻ hôm nay để thắp sáng ngọn lửa!'
                : `Chuỗi ôn tập: ${streakCount} ngày liên tiếp (Bấm để xem chi tiết)`
            }
          >
            {/* Ambient fire glow background (Only when streak > 0) */}
            {streakCount > 0 && (
              <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-orange-600/20 to-transparent pointer-events-none opacity-80" />
            )}

            {/* Flame Icon (Steady glowing flame, zero vertical bobbing) */}
            <div className="relative flex items-center justify-center shrink-0">
              <Flame
                size={18}
                className={
                  streakCount === 0
                    ? 'text-slate-400 dark:text-slate-500 group-hover:text-amber-500 transition-colors'
                    : 'flame-burning text-amber-500 dark:text-amber-400 fill-amber-400 dark:fill-amber-300'
                }
              />
            </div>

            <span
              className={`tabular-nums font-black text-sm tracking-tight ${
                streakCount === 0
                  ? 'text-slate-700 dark:text-slate-300 group-hover:text-amber-600 dark:group-hover:text-amber-200'
                  : 'text-amber-950 dark:text-amber-100 drop-shadow-[0_1px_4px_rgba(245,158,11,0.6)]'
              }`}
            >
              {streakCount}
            </span>
            <span
              className={`font-extrabold text-[11px] uppercase tracking-wider hidden sm:inline ${
                streakCount === 0 ? 'text-slate-400 dark:text-slate-500' : 'text-orange-800 dark:text-amber-300'
              }`}
            >
              ngày
            </span>
          </div>

          {/* Clock widget (desktop only) */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-mono text-xs">
            <Clock size={14} className="text-slate-400" />
            <span className="font-semibold text-slate-900 dark:text-slate-100">{timeStr}</span>
            <span className="text-slate-400 text-[11px]">| {dateStr}</span>
          </div>

          {/* Sample data button (if empty or available) */}
          {!hasItems && (
            <button
              type="button"
              id="btn-sample-data"
              onClick={onLoadSampleData}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-500/25 border border-teal-200 dark:border-teal-500/30 rounded-xl transition-all cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Nạp mẫu</span>
            </button>
          )}

          {/* Backup & Sync button */}
          <button
            type="button"
            id="btn-open-backup"
            onClick={onOpenBackupModal}
            className="inline-flex items-center justify-center gap-1.5 h-9 sm:h-10 px-2 sm:px-2.5 text-xs font-semibold bg-slate-100 dark:bg-slate-900 hover:bg-slate-200/80 dark:hover:bg-slate-800 active:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shrink-0"
            title="Dữ liệu, Xuất / Nhập và Sao lưu"
            aria-label="Dữ liệu & Backup"
          >
            <Database size={15} />
            <span className="hidden xl:inline">Dữ liệu & Backup</span>
          </button>

          {/* Add item button */}
          <button
            type="button"
            id="btn-open-add"
            onClick={onOpenAddModal}
            className="inline-flex items-center justify-center gap-1.5 h-9 sm:h-10 px-2.5 sm:px-3.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs shadow-emerald-600/30 transition-all cursor-pointer shrink-0"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Thêm mới</span>
          </button>

          {/* Account / logout */}
          {userEmail && (
            <button
              type="button"
              id="btn-logout"
              onClick={onLogout}
              className="inline-flex items-center justify-center gap-1.5 h-9 sm:h-10 px-2 sm:px-2.5 text-xs font-semibold bg-slate-100 dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-500/15 text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-300 rounded-xl border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shrink-0"
              title={`Đăng xuất (${userEmail})`}
              aria-label="Đăng xuất"
            >
              <UserCircle size={15} />
              <span className="hidden xl:inline max-w-[140px] truncate">{userEmail}</span>
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
