import { RankTierDefinition, RankTierKey, UserRankData, ReviewRating } from '../types';
import { diffDays, getTodayDate } from './fsrs';

export const RANK_TIERS: RankTierDefinition[] = [
  {
    key: 'wood',
    level: 1,
    nameVi: 'Tập Sự',
    titleVi: 'Người Gieo Mầm Tri Thức',
    minStreak: 0,
    minExp: 0,
    icon: '🪵',
    color: '#a16207',
    bgGradient: 'from-amber-800/15 via-stone-700/10 to-transparent',
    borderColor: 'border-stone-500/40 dark:border-stone-600/50',
    textColor: 'text-stone-700 dark:text-stone-300',
    badgeClass: 'bg-stone-200/80 dark:bg-stone-800/80 text-stone-800 dark:text-stone-200 border-stone-400/40',
    minDailyCardsToMaintain: 1,
    perks: [
      'Khởi đầu hành trình ôn tập ngắt quãng',
      'Mặc định chuỗi lửa 0 ngày - bắt đầu thắp lửa',
      'Được tặng 1 Khiên bảo vệ Rank tân thủ'
    ],
  },
  {
    key: 'bronze',
    level: 2,
    nameVi: 'Đồng',
    titleVi: 'Tia Lửa Khởi Sắc',
    minStreak: 3,
    minExp: 100,
    icon: '🥉',
    color: '#b45309',
    bgGradient: 'from-amber-600/20 via-orange-600/15 to-transparent',
    borderColor: 'border-amber-600/50 dark:border-amber-500/60',
    textColor: 'text-amber-800 dark:text-amber-300',
    badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-500/50',
    minDailyCardsToMaintain: 1,
    perks: [
      'Duy trì ngọn lửa bùng cháy từ 3 ngày liên tục',
      'Mở khóa bảng thống kê chuyên sâu FSRS',
      'Kích hoạt huy hiệu Đồng phát sáng'
    ],
  },
  {
    key: 'silver',
    level: 3,
    nameVi: 'Bạc',
    titleVi: 'Ý Chí Bền Bỉ',
    minStreak: 7,
    minExp: 300,
    icon: '🥈',
    color: '#64748b',
    bgGradient: 'from-slate-400/20 via-cyan-500/15 to-transparent',
    borderColor: 'border-slate-400/60 dark:border-slate-400/70',
    textColor: 'text-slate-700 dark:text-slate-200',
    badgeClass: 'bg-slate-200/90 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-400/60',
    minDailyCardsToMaintain: 2,
    perks: [
      'Chuỗi 1 tuần kiên trì không bỏ lỡ',
      'Thưởng thêm +1 Khiên bảo vệ Rank dự trữ',
      'Tia lửa bạc ánh kim viền bảng ôn tập'
    ],
  },
  {
    key: 'gold',
    level: 4,
    nameVi: 'Vàng',
    titleVi: 'Chiến Binh Chuyên Cần',
    minStreak: 14,
    minExp: 700,
    icon: '🥇',
    color: '#eab308',
    bgGradient: 'from-yellow-500/25 via-amber-500/20 to-orange-500/15',
    borderColor: 'border-yellow-400 dark:border-yellow-500/80',
    textColor: 'text-yellow-800 dark:text-yellow-300',
    badgeClass: 'bg-yellow-100 dark:bg-yellow-950/70 text-yellow-900 dark:text-yellow-200 border-yellow-400 shadow-xs',
    minDailyCardsToMaintain: 3,
    perks: [
      '2 tuần rèn luyện kỷ luật thép',
      'Nhân đôi tỷ lệ nhận điểm EXP từ bài tập ngữ cảnh',
      'Hiệu ứng hào quang hoàng kim trong Daily Review'
    ],
  },
  {
    key: 'platinum',
    level: 5,
    nameVi: 'Bạch Kim',
    titleVi: 'Bản Lĩnh Kiên Cường',
    minStreak: 21,
    minExp: 1300,
    icon: '💎',
    color: '#06b6d4',
    bgGradient: 'from-cyan-500/25 via-teal-500/20 to-blue-500/15',
    borderColor: 'border-cyan-400 dark:border-cyan-500/80',
    textColor: 'text-cyan-800 dark:text-cyan-300',
    badgeClass: 'bg-cyan-100 dark:bg-cyan-950/70 text-cyan-900 dark:text-cyan-200 border-cyan-400 shadow-sm',
    minDailyCardsToMaintain: 4,
    perks: [
      '3 tuần chuyển hóa trí nhớ ngắn hạn thành dài hạn',
      'Thưởng thêm +1 Khiên bảo vệ tụt hạng',
      'Hiệu ứng tia lửa băng tuyết phát sáng'
    ],
  },
  {
    key: 'diamond',
    level: 6,
    nameVi: 'Kim Cương',
    titleVi: 'Bậc Thầy Trí Nhớ',
    minStreak: 30,
    minExp: 2200,
    icon: '🔮',
    color: '#a855f7',
    bgGradient: 'from-purple-500/25 via-fuchsia-500/20 to-pink-500/15',
    borderColor: 'border-purple-400 dark:border-purple-500/80',
    textColor: 'text-purple-800 dark:text-purple-300',
    badgeClass: 'bg-purple-100 dark:bg-purple-950/70 text-purple-900 dark:text-purple-200 border-purple-400 shadow-md shadow-purple-500/20',
    minDailyCardsToMaintain: 5,
    perks: [
      '1 tháng trọn vẹn không bỏ sót một ngày nào',
      'Độ bền trí nhớ FSRS đạt ngưỡng ổn định vượt trội',
      'Hiệu ứng tinh thể tím huyền ảo tỏa sáng rực rỡ'
    ],
  },
  {
    key: 'master',
    level: 7,
    nameVi: 'Huyền Thoại',
    titleVi: 'Đại Sư Ngôn Ngữ',
    minStreak: 60,
    minExp: 4500,
    icon: '👑',
    color: '#ef4444',
    bgGradient: 'from-rose-500/25 via-red-600/20 to-amber-500/15',
    borderColor: 'border-rose-400 dark:border-rose-500',
    textColor: 'text-rose-800 dark:text-rose-300',
    badgeClass: 'bg-rose-100 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200 border-rose-400 shadow-lg shadow-rose-500/30',
    minDailyCardsToMaintain: 6,
    perks: [
      '60 ngày tôi luyện phản xạ song ngữ tự nhiên',
      'Top 1% người học kỷ luật bền bỉ nhất',
      'Vương miện Huyền Thoại và ngọn lửa đỏ ruby thiêu đốt'
    ],
  },
  {
    key: 'challenger',
    level: 8,
    nameVi: 'Thần Thoại',
    titleVi: 'Ngọn Lửa Bất Tử',
    minStreak: 100,
    minExp: 8000,
    icon: '🏆',
    color: '#f59e0b',
    bgGradient: 'from-amber-400/30 via-rose-500/25 to-indigo-600/20',
    borderColor: 'border-amber-300 dark:border-amber-400 ring-2 ring-amber-400/60',
    textColor: 'text-amber-900 dark:text-amber-200',
    badgeClass: 'bg-gradient-to-r from-amber-200 via-orange-200 to-rose-200 dark:from-amber-900/80 dark:via-orange-900/80 dark:to-rose-900/80 text-amber-950 dark:text-amber-100 border-amber-300 shadow-xl shadow-amber-500/40 animate-pulse',
    minDailyCardsToMaintain: 7,
    perks: [
      '100 ngày thần thoại - Kỷ lục cao nhất của ứng dụng',
      'Trí nhớ vĩnh cửu, làm chủ kho từ vựng và ngữ pháp',
      'Huy hiệu Thần Thoại Tối Thượng vĩnh viễn'
    ],
  },
];

const STORAGE_KEY = 'user_rank_data_v1';

export function getRankTierByKey(key: RankTierKey): RankTierDefinition {
  const found = RANK_TIERS.find((t) => t.key === key);
  return found || RANK_TIERS[0];
}

export function getNextRankTier(key: RankTierKey): RankTierDefinition | null {
  const idx = RANK_TIERS.findIndex((t) => t.key === key);
  if (idx >= 0 && idx < RANK_TIERS.length - 1) {
    return RANK_TIERS[idx + 1];
  }
  return null;
}

export function calculateTierFromProgress(streak: number, exp: number): RankTierKey {
  // Find highest tier meeting both streak or high exp requirements
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    const tier = RANK_TIERS[i];
    if (streak >= tier.minStreak && exp >= tier.minExp) {
      return tier.key;
    }
  }
  return 'wood';
}

/**
 * Calculate progress of daily rank protection
 */
export function getRankDefenseProgress(
  data: UserRankData,
  details?: { remainingCount?: number; totalCount?: number }
): {
  current: number;
  target: number;
  percent: number;
  isProtected: boolean;
  remaining: number;
} {
  const today = getTodayDate();
  const isProtected = Boolean(data.todayProtected && data.lastCompletedAllScheduleDate === today);

  if (isProtected) {
    const total = details?.totalCount || Math.max(1, data.todayReviewedCount || 1);
    return {
      current: total,
      target: total,
      percent: 100,
      isProtected: true,
      remaining: 0,
    };
  }

  // If exact remaining and total counts are provided
  if (details && typeof details.totalCount === 'number' && typeof details.remainingCount === 'number') {
    const target = Math.max(1, details.totalCount);
    const remaining = Math.max(0, details.remainingCount);
    const current = Math.max(0, target - remaining);
    const percent = remaining === 0 ? 100 : Math.min(95, Math.round((current / target) * 100));
    return {
      current,
      target,
      percent,
      isProtected: false,
      remaining,
    };
  }

  const current = data.lastStudyDate === today ? (data.todayReviewedCount || 0) : 0;
  return {
    current,
    target: Math.max(1, current + 1),
    percent: Math.min(90, Math.round((current / Math.max(1, current + 1)) * 100)),
    isProtected: false,
    remaining: 1,
  };
}

/**
 * Load user rank data from localStorage.
 * Defaults streak to 0 as requested by user.
 */
export function getUserRankData(): UserRankData {
  const today = getTodayDate();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: UserRankData = JSON.parse(saved);
      // Ensure valid fields
      if (typeof parsed.streakCount !== 'number') parsed.streakCount = 0;
      if (typeof parsed.currentExp !== 'number') parsed.currentExp = 0;
      if (typeof parsed.shieldsCount !== 'number') parsed.shieldsCount = 1;
      if (!parsed.tierKey) parsed.tierKey = 'wood';

      // Check if today is officially protected (only true when all cards for today were completed)
      if (parsed.lastCompletedAllScheduleDate === today) {
        parsed.todayProtected = true;
      } else {
        parsed.todayProtected = false;
      }

      if (parsed.lastStudyDate !== today) {
        parsed.todayReviewedCount = 0;
      }

      return parsed;
    }
  } catch (e) {
    console.warn('Error reading rank data from storage:', e);
  }

  // Default initial state: streak is 0!
  const defaultData: UserRankData = {
    tierKey: 'wood',
    currentExp: 0,
    streakCount: 0, // Mặc định streek lửa là 0 theo yêu cầu!
    bestStreak: 0,
    todayReviewedCount: 0,
    todayProtected: false,
    lastStudyDate: null,
    lastCompletedAllScheduleDate: null,
    celebrationShownDate: null,
    shieldsCount: 1, // 1 Khiên bảo vệ tân thủ
    totalDaysProtected: 0,
    demotionsCount: 0,
    recentRankUpMessage: null,
  };

  saveUserRankData(defaultData);
  return defaultData;
}

export function saveUserRankData(data: UserRankData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Also sync the streak count into legacy study_streak_count for backward compatibility
    localStorage.setItem('study_streak_count', data.streakCount.toString());
    if (data.lastStudyDate) {
      localStorage.setItem('study_last_date', data.lastStudyDate);
    }
  } catch (e) {
    console.error('Failed to save user rank data:', e);
  }
}

/**
 * Daily check for rank decay.
 * If user missed a day of completing scheduled cards:
 * - If they have a shield: consume shield, prevent decay!
 * - If no shield: streak resets to 0, and rank is demoted by 1 tier (if > wood)!
 */
export function checkDailyRankDecay(todayDate: string): {
  rankData: UserRankData;
  decayed: boolean;
  shieldUsed: boolean;
  prevRank?: string;
} {
  const current = getUserRankData();
  const referenceDate = current.lastCompletedAllScheduleDate || current.lastStudyDate;
  if (!referenceDate) {
    // Brand new user, streak is 0, no decay needed
    return { rankData: current, decayed: false, shieldUsed: false };
  }

  const diff = diffDays(todayDate, referenceDate);

  if (diff <= 1) {
    // 0: studied/completed today, 1: completed yesterday. All good!
    current.todayProtected = (current.lastCompletedAllScheduleDate === todayDate);
    saveUserRankData(current);
    return { rankData: current, decayed: false, shieldUsed: false };
  }

  // Diff >= 2: Missed at least 1 full day of study!
  if (current.shieldsCount > 0) {
    // Shield activated!
    current.shieldsCount -= 1;
    current.todayProtected = false;
    saveUserRankData(current);
    return { rankData: current, decayed: false, shieldUsed: true };
  }

  // No shield: Rank Decay!
  const prevTier = getRankTierByKey(current.tierKey);
  const currentLevel = prevTier.level;
  let newTierKey: RankTierKey = 'wood';

  if (currentLevel > 1) {
    // Demote 1 tier
    const demotedTier = RANK_TIERS.find((t) => t.level === currentLevel - 1);
    newTierKey = demotedTier ? demotedTier.key : 'wood';
  }

  const decayedData: UserRankData = {
    ...current,
    streakCount: 0, // Reset streak to 0
    tierKey: newTierKey,
    todayProtected: false,
    todayReviewedCount: 0,
    demotionsCount: current.demotionsCount + 1,
    recentRankUpMessage: `⚠️ Bạn đã bỏ lỡ ngày học! Chuỗi lửa về 0 và rank bị tụt xuống ${getRankTierByKey(newTierKey).nameVi}. Hãy hoàn thành tất cả lịch thẻ hôm nay để thắp lại ngọn lửa!`,
  };

  saveUserRankData(decayedData);
  return {
    rankData: decayedData,
    decayed: true,
    shieldUsed: false,
    prevRank: prevTier.nameVi,
  };
}

/**
 * Record single card review or context output.
 * Awards base EXP and updates stats without prematurely triggering rank protection or streak increase.
 * Rank protection and streak increase are ONLY triggered when ALL scheduled cards are completed.
 */
export function recordStudyForRank(params: {
  rating?: ReviewRating;
  isContextOutput?: boolean;
  todayDate: string;
}): {
  rankData: UserRankData;
  rankUp: boolean;
  justProtectedRank: boolean;
  newTier?: RankTierDefinition;
  expGained: number;
  prevProgressPercent: number;
  currentProgressPercent: number;
  targetCards: number;
} {
  const current = getUserRankData();
  const { rating, isContextOutput, todayDate } = params;

  // Calculate EXP gained
  let exp = 10; // Base 10 EXP per card
  if (rating === 3) exp += 5; // Good / Trôi chảy: +15 EXP
  if (rating === 4) exp += 10; // Easy / Thành thạo: +20 EXP
  if (isContextOutput) exp += 50; // Output 5 contexts: +50 EXP huge boost!

  const prevTier = getRankTierByKey(current.tierKey);
  const prevTodayCount = current.lastStudyDate === todayDate ? (current.todayReviewedCount || 0) : 0;
  const newReviewedCount = prevTodayCount + 1;
  const newExp = current.currentExp + exp;

  // Check if eligible for Rank Up from EXP
  const calculatedTierKey = calculateTierFromProgress(current.streakCount, newExp);
  const calculatedTier = getRankTierByKey(calculatedTierKey);

  let rankUp = false;
  let finalTierKey = current.tierKey;

  if (calculatedTier.level > prevTier.level) {
    rankUp = true;
    finalTierKey = calculatedTierKey;
  }

  const updatedData: UserRankData = {
    ...current,
    tierKey: finalTierKey,
    currentExp: newExp,
    todayReviewedCount: newReviewedCount,
    // Note: todayProtected is maintained if already protected today, but not granted until all cards are completed
    todayProtected: current.lastCompletedAllScheduleDate === todayDate,
    lastStudyDate: todayDate,
    recentRankUpMessage: rankUp ? `🎉 Chúc mừng! Bạn đã thăng hạng lên Rank ${calculatedTier.nameVi} (${calculatedTier.titleVi})!` : null,
  };

  saveUserRankData(updatedData);

  return {
    rankData: updatedData,
    rankUp,
    justProtectedRank: false, // Never prematurely set to true here
    newTier: rankUp ? calculatedTier : undefined,
    expGained: exp,
    prevProgressPercent: updatedData.todayProtected ? 100 : Math.min(90, prevTodayCount * 15),
    currentProgressPercent: updatedData.todayProtected ? 100 : Math.min(90, newReviewedCount * 15),
    targetCards: Math.max(1, newReviewedCount + 1),
  };
}

/**
 * Triggers when the user finishes reviewing ALL due cards (vocab + grammar) for today.
 * ONLY at this point does streak increase (+1), rank gets protected, and the single celebration can erupt!
 */
export function recordAllCardsCompletedForRank(params: {
  todayDate: string;
  cardsReviewedCount?: number;
}): {
  rankData: UserRankData;
  rankUp: boolean;
  justProtectedRank: boolean;
  shouldShowCelebration: boolean;
  newTier?: RankTierDefinition;
  expGained: number;
} {
  const current = getUserRankData();
  const { todayDate, cardsReviewedCount = 1 } = params;

  // Bonus points for completing all cards of the day:
  // Base 60 EXP + 15 EXP per card reviewed
  const exp = Math.max(60, 40 + cardsReviewedCount * 15);

  const prevTier = getRankTierByKey(current.tierKey);
  const wasAlreadyProtectedToday = (current.lastCompletedAllScheduleDate === todayDate);
  const wasCelebratedToday = (current.celebrationShownDate === todayDate);

  // Update streak if first time completing all schedule today
  let newStreak = current.streakCount;
  let isFirstCompletionToday = false;

  if (current.lastCompletedAllScheduleDate !== todayDate) {
    isFirstCompletionToday = true;
    if (current.lastCompletedAllScheduleDate) {
      const diff = diffDays(todayDate, current.lastCompletedAllScheduleDate);
      if (diff === 1) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }
  }

  const newExp = current.currentExp + exp;
  const newReviewedCount = (current.todayReviewedCount || 0) + cardsReviewedCount;
  const bestStreak = Math.max(current.bestStreak, newStreak);

  // Check if eligible for Rank Up
  const calculatedTierKey = calculateTierFromProgress(newStreak, newExp);
  const calculatedTier = getRankTierByKey(calculatedTierKey);

  let rankUp = false;
  let finalTierKey = current.tierKey;

  if (calculatedTier.level > prevTier.level) {
    rankUp = true;
    finalTierKey = calculatedTierKey;
  }

  // Bonus shield when hitting streak milestones (7, 14, 21, 30 days)
  let newShields = current.shieldsCount;
  if (isFirstCompletionToday && (newStreak === 7 || newStreak === 14 || newStreak === 21 || newStreak === 30)) {
    newShields = Math.min(3, newShields + 1);
  }

  // Check if celebration should be shown: ONLY 1 TIME PER DAY!
  let shouldShowCelebration = false;
  let newCelebrationShownDate = current.celebrationShownDate || null;
  if (!wasCelebratedToday) {
    shouldShowCelebration = true;
    newCelebrationShownDate = todayDate;
  }

  const updatedData: UserRankData = {
    ...current,
    tierKey: finalTierKey,
    currentExp: newExp,
    streakCount: newStreak,
    bestStreak,
    todayReviewedCount: newReviewedCount,
    todayProtected: true, // Officially protected!
    lastStudyDate: todayDate,
    lastCompletedAllScheduleDate: todayDate,
    celebrationShownDate: newCelebrationShownDate,
    shieldsCount: newShields,
    totalDaysProtected: isFirstCompletionToday ? current.totalDaysProtected + 1 : current.totalDaysProtected,
    recentRankUpMessage: rankUp ? `🎉 Chúc mừng! Bạn đã thăng hạng lên Rank ${calculatedTier.nameVi} (${calculatedTier.titleVi})!` : null,
  };

  saveUserRankData(updatedData);

  return {
    rankData: updatedData,
    rankUp,
    justProtectedRank: isFirstCompletionToday,
    shouldShowCelebration,
    newTier: rankUp ? calculatedTier : undefined,
    expGained: exp,
  };
}

// Alias for backward compatibility
export const recordAllVocabCompletedForRank = recordAllCardsCompletedForRank;

/**
 * Add a Rank Shield (Streak Freeze)
 */
export function addRankShield(): { success: boolean; newCount: number } {
  const current = getUserRankData();
  if (current.shieldsCount >= 3) {
    return { success: false, newCount: current.shieldsCount };
  }
  const updated = {
    ...current,
    shieldsCount: current.shieldsCount + 1,
  };
  saveUserRankData(updated);
  return { success: true, newCount: updated.shieldsCount };
}

/**
 * Record EXP and rewards earned from playing review mini-games
 */
export function recordGameCompletionForRank(params: {
  expEarned: number;
  todayDate: string;
}): {
  rankData: UserRankData;
  rankUp: boolean;
  newTier?: RankTierDefinition;
  expGained: number;
  prevProgressPercent: number;
  currentProgressPercent: number;
} {
  const current = getUserRankData();
  const { expEarned, todayDate } = params;
  const exp = Math.max(5, Math.round(expEarned));

  const prevTier = getRankTierByKey(current.tierKey);
  const newExp = current.currentExp + exp;

  const calculatedTierKey = calculateTierFromProgress(current.streakCount, newExp);
  const calculatedTier = getRankTierByKey(calculatedTierKey);

  let rankUp = false;
  let finalTierKey = current.tierKey;

  if (calculatedTier.level > prevTier.level) {
    rankUp = true;
    finalTierKey = calculatedTierKey;
  }

  const prevProgress = getRankDefenseProgress(current);

  const updatedData: UserRankData = {
    ...current,
    tierKey: finalTierKey,
    currentExp: newExp,
    lastStudyDate: todayDate,
    recentRankUpMessage: rankUp ? `🎉 Chúc mừng! Bạn đã thăng hạng lên Rank ${calculatedTier.nameVi} (${calculatedTier.titleVi}) từ đấu trường mini-game!` : null,
  };

  saveUserRankData(updatedData);
  const currentProgress = getRankDefenseProgress(updatedData);

  return {
    rankData: updatedData,
    rankUp,
    newTier: rankUp ? calculatedTier : undefined,
    expGained: exp,
    prevProgressPercent: prevProgress.percent,
    currentProgressPercent: currentProgress.percent,
  };
}
