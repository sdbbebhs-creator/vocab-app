/**
 * ============================================================================
 * THUẬT TOÁN LẶP LẠI NGẮT QUÃNG THẾ HỆ MỚI FSRS (FREE SPACED REPETITION SCHEDULER v4)
 * ============================================================================
 *
 * I. MÔ TẢ CÁCH HOẠT ĐỘNG CỦA THUẬT TOÁN FSRS:
 * FSRS quản lý trí nhớ của người học dựa trên Mô hình bộ nhớ DHP qua 3 chỉ số cốt lõi:
 * 1. Stability (S - Độ bền vững): Số ngày cần thiết để xác suất nhớ kiến thức
 *    giảm xuống còn 90%. Mục tiêu là tăng S sau mỗi lần nhớ đúng.
 * 2. Difficulty (D - Độ khó): Thể hiện độ phức tạp bản chất của thẻ (thang điểm 1 đến 10).
 *    Thẻ càng khó thì S tăng càng chậm.
 * 3. Retrievability (R - Khả năng gợi nhớ): Xác suất người học nhớ được kiến thức
 *    tại thời điểm hiện tại (giảm dần theo thời gian theo hàm mũ).
 *
 * Khi người học ôn tập, họ sẽ chọn 1 trong 4 nút phản hồi (Rating):
 * - 1: Again (Quên bài hoàn toàn)
 * - 2: Hard (Nhớ rất chật vật)
 * - 3: Good (Nhớ bình thường, phản xạ tự nhiên)
 * - 4: Easy (Nhớ quá dễ dàng, không cần nghĩ)
 *
 * II. BỘ 17 THAM SỐ MẶC ĐỊNH CHUẨN (w) VÀ CÔNG THỨC TOÁN HỌC (FSRS v4):
 * w = [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61]
 * Khả năng gợi nhớ hiện tại: R = (1 + factor * t / S) ^ decay
 * (Với factor = 19/3, decay = -0.5, t là số ngày đã trôi qua kể từ lần ôn cuối)
 */

import { Card, ReviewRating, FSRSState } from '../types';
import {
  fsrs,
  Rating,
  generatorParameters,
  State as FSRSStateLib,
  type Card as FSCard,
  createEmptyCard,
} from 'ts-fsrs';

// Re-export Rating từ thư viện chuẩn ts-fsrs
export { Rating };

// ============================================================================
// BỘ 17 THAM SỐ MẶC ĐỊNH (w) CHUẨN CỦA FSRS v4
// ============================================================================
export const FSRS_WEIGHTS = [
  0.4,  // w[0]: S0 khi rating = 1 (Again)
  0.6,  // w[1]: S0 khi rating = 2 (Hard)
  2.4,  // w[2]: S0 khi rating = 3 (Good)
  5.8,  // w[3]: S0 khi rating = 4 (Easy)
  4.93, // w[4]: Độ khó cơ sở ban đầu (D0 tại rating = 3)
  0.94, // w[5]: Hệ số điều chỉnh độ khó ban đầu theo rating
  0.86, // w[6]: Trọng số độ khó cũ khi cập nhật D (bảo toàn quán tính)
  0.01, // w[7]: Trọng số làm mịn (Mean Reversion) kéo D về D0
  1.49, // w[8]: Hệ số tăng trưởng độ bền vững S
  0.14, // w[9]: Số mũ làm chậm tốc độ tăng S khi S đã cao
  0.94, // w[10]: Tác động của độ gợi nhớ R đến mức tăng S
  2.18, // w[11]: Hệ số độ bền vững khi quên (Rating 1 - Again)
  0.05, // w[12]: Số mũ giảm S theo S cũ khi quên
  0.34, // w[13]: Tác động của (1 - R) khi quên
  1.26, // w[14]: Số mũ làm sâu thêm mức phạt khi quên
  0.29, // w[15]: Hệ số điều chỉnh phạt khi Hard (rating = 2)
  2.61, // w[16]: Hệ số thưởng khi đánh giá Easy (rating = 4)
] as const;

// Hằng số tính toán FSRS v4
export const FSRS_FACTOR = 19 / 3;            // factor = 19/3 (~6.3333)
export const FSRS_DECAY = -0.5;               // decay = -0.5
export const DEFAULT_REQUEST_RETENTION = 0.92;  // R_mục_tiêu = 92% (Chỉ số ghi nhớ chắc chắn nhất trên 90%)

/**
 * Lấy mục tiêu ghi nhớ hiện tại (Target Retention)
 * Mặc định: 0.92 (92% - Mức độ chắc chắn cao nhất trên 90% theo thuật toán FSRS v4)
 */
export function getActiveTargetRetention(): number {
  if (typeof window === 'undefined') return DEFAULT_REQUEST_RETENTION;
  try {
    const saved = localStorage.getItem('fsrs_target_retention');
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0.90 && parsed <= 0.98) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_REQUEST_RETENTION;
}

/**
 * Cập nhật mục tiêu ghi nhớ FSRS vào bộ nhớ cục bộ
 */
export function setActiveTargetRetention(val: number): void {
  if (typeof window === 'undefined') return;
  try {
    const clamped = Math.min(0.98, Math.max(0.7, val));
    localStorage.setItem('fsrs_target_retention', clamped.toFixed(4));
  } catch {
    // fallback
  }
}

// Re-export State để tương thích
export { FSRSState as State };

// ============================================================================
// CẤU HÌNH GIAO DIỆN & TIỆN ÍCH HIỂN THỊ
// ============================================================================

export const FSRS_STATE_LABELS: Record<number, { label: string; color: string }> = {
  [FSRSState.New]: {
    label: 'Mới',
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
  },
  [FSRSState.Learning]: {
    label: 'Đang học',
    color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
  },
  [FSRSState.Review]: {
    label: 'Ôn tập',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  [FSRSState.Relearning]: {
    label: 'Ôn lại',
    color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300',
  },
};

export const FSRS_RATING_CONFIG = {
  1: {
    key: 'again',
    rating: 1 as ReviewRating,
    label: 'Làm lại',
    subLabel: 'Again',
    color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900 hover:bg-rose-100',
    desc: 'Chưa nhớ được / Cần làm lại ngay',
    icon: '✕',
  },
  2: {
    key: 'hard',
    rating: 2 as ReviewRating,
    label: 'Cần gọt giũa',
    subLabel: 'Hard',
    color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900 hover:bg-amber-100',
    desc: 'Nhớ chật vật / Cần gọt giũa thêm',
    icon: '⚠',
  },
  3: {
    key: 'good',
    rating: 3 as ReviewRating,
    label: 'Trôi chảy',
    subLabel: 'Good',
    color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100',
    desc: 'Nhớ tự nhiên / Phản xạ trôi chảy',
    icon: '✓',
  },
  4: {
    key: 'easy',
    rating: 4 as ReviewRating,
    label: 'Thành thạo',
    subLabel: 'Easy',
    color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900 hover:bg-blue-100',
    desc: 'Nắm rất vững / Sử dụng thành thạo',
    icon: '★',
  },
} as const;

// ============================================================================
// HÀM TIỆN ÍCH NGÀY THÁNG (DATE HELPERS)
// ============================================================================

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayDate(): string {
  return formatDate(new Date());
}

export function addDays(baseDateStr: string, days: number): string {
  const parts = baseDateStr.split('-').map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

export function diffDays(d1: string, d2: string): number {
  const p1 = d1.split('-').map(Number);
  const p2 = d2.split('-').map(Number);
  const date1 = new Date(p1[0], p1[1] - 1, p1[2]).getTime();
  const date2 = new Date(p2[0], p2[1] - 1, p2[2]).getTime();
  return Math.round((date1 - date2) / (1000 * 60 * 60 * 24));
}

export function formatRelativeDate(targetDate: string): {
  label: string;
  isOverdue: boolean;
  isToday: boolean;
  diff: number;
} {
  const today = getTodayDate();
  const diff = diffDays(targetDate, today);

  if (diff === 0) {
    return { label: 'Hôm nay', isOverdue: false, isToday: true, diff: 0 };
  } else if (diff === 1) {
    return { label: 'Ngày mai', isOverdue: false, isToday: false, diff: 1 };
  } else if (diff === -1) {
    return { label: 'Quá hạn 1 ngày', isOverdue: true, isToday: false, diff: -1 };
  } else if (diff < -1) {
    return { label: `Quá hạn ${Math.abs(diff)} ngày`, isOverdue: true, isToday: false, diff };
  } else {
    return { label: `Trong ${diff} ngày`, isOverdue: false, isToday: false, diff };
  }
}

// ============================================================================
// II. CÁC HÀM TÍNH TOÁN CỐT LÕI (FSRS v4 MATHEMATICAL FORMULAS)
// ============================================================================

/**
 * 0. TÍNH KHẢ NĂNG GỢI NHỚ HIỆN TẠI (Retrievability - R):
 *
 * Công thức:
 *   R = (1 + factor * t / S) ^ decay
 *   Với factor = 19/3, decay = -0.5, t là số ngày đã trôi qua kể từ lần ôn cuối
 *
 * @param stability S: Độ bền vững trí nhớ hiện tại (ngày)
 * @param elapsedDays t: Số ngày đã trôi qua kể từ lần ôn cuối
 * @returns R: Khả năng gợi nhớ (từ 0.0 đến 1.0, tương ứng 0% - 100%)
 */
export function calculateRetrievability(stability: number, elapsedDays: number): number {
  if (stability <= 0) return 0;
  if (elapsedDays <= 0) return 1.0;

  // R = (1 + (19/3) * t / S) ^ (-0.5)
  const base = 1 + (FSRS_FACTOR * elapsedDays) / stability;
  const R = Math.pow(base, FSRS_DECAY);
  return Math.min(1.0, Math.max(0.0, R));
}

/**
 * 1. CẬP NHẬT ĐỘ KHÓ (Difficulty - D):
 *
 * Công thức:
 * - Lần đầu tiên (Độ khó ban đầu D0):
 *     D0 = w[4] - (rating - 3) * w[5]   (Giới hạn D0 từ 1 đến 10)
 *
 * - Lần ôn tập tiếp theo:
 *     D_mới = D_cũ * (1 - w[6]) + (w[4] - (rating - 3) * w[5]) * w[6]
 *
 * - Áp dụng cơ chế làm mịn (Mean Reversion) để chống lệch cực đoan:
 *     D_mới = w[7] * D0 + (1 - w[7]) * D_mới   (Giới hạn D từ 1 đến 10)
 *
 * @param dOld Độ khó hiện tại của thẻ
 * @param rating Đánh giá ôn tập (1 = Again, 2 = Hard, 3 = Good, 4 = Easy)
 * @param isFirstReview Thẻ mới ôn lần đầu hay đã có lịch sử
 */
export function calculateDifficulty(
  dOld: number,
  rating: ReviewRating,
  isFirstReview: boolean
): { dNew: number; d0: number } {
  const w = FSRS_WEIGHTS;

  // Tính D0 mục tiêu theo đánh giá hiện tại
  const rawD0 = w[4] - (rating - 3) * w[5];
  const d0 = Math.min(10, Math.max(1, rawD0));

  if (isFirstReview || dOld <= 0) {
    return { dNew: Number(d0.toFixed(4)), d0: Number(d0.toFixed(4)) };
  }

  // Lần ôn tập tiếp theo:
  // D_mới = D_cũ * (1 - w[6]) + (w[4] - (rating - 3) * w[5]) * w[6]
  let dNew = dOld * (1 - w[6]) + rawD0 * w[6];

  // Áp dụng cơ chế làm mịn (Mean Reversion):
  // D_mới = w[7] * D0 + (1 - w[7]) * D_mới
  dNew = w[7] * d0 + (1 - w[7]) * dNew;

  // Giới hạn D từ 1 đến 10
  const clampedD = Math.min(10, Math.max(1, dNew));
  return { dNew: Number(clampedD.toFixed(4)), d0: Number(d0.toFixed(4)) };
}

/**
 * 2. CẬP NHẬT ĐỘ BỀN VỮNG (Stability - S):
 *
 * Công thức:
 * * Lần đầu tiên (S0 khi thẻ mới):
 *   - Nếu rating = 1..4 tương ứng S0 = w[rating - 1]
 *     (1: w[0]=0.4, 2: w[1]=0.6, 3: w[2]=2.4, 4: w[3]=5.8)
 *
 * * Lần ôn tập tiếp theo (Thẻ đã có lịch sử):
 *   - Nếu trả lời SAI (Rating = 1 - Again):
 *       S_mới = w[11] * (S_cũ ^ -w[12]) * ((1 + (1 - R) * w[13]) ^ w[14])
 *
 *   - Nếu trả lời ĐÚNG (Rating = 2, 3, 4):
 *       Hệ số thưởng Easy: bonus = (rating == 4) ? w[15] : 1
 *       S_mới = S_cũ * (1 + exp(w[8]) * (11 - D_mới) * (S_cũ ^ -w[9]) * (exp((1 - R) * w[10]) - 1) * bonus)
 *
 * @param sOld Độ bền vững cũ
 * @param dNew Độ khó mới vừa cập nhật
 * @param R Khả năng gợi nhớ hiện tại
 * @param rating Đánh giá ôn tập
 * @param isFirstReview Thẻ mới hay đã ôn tập
 */
export function calculateStability(
  sOld: number,
  dNew: number,
  R: number,
  rating: ReviewRating,
  isFirstReview: boolean
): { sNew: number; bonus: number } {
  const w = FSRS_WEIGHTS;

  // 1. Lần đầu tiên (thẻ mới):
  if (isFirstReview || sOld <= 0) {
    const s0 = w[rating - 1];
    return { sNew: Number(s0.toFixed(4)), bonus: 1 };
  }

  // 2. Lần ôn tập tiếp theo:
  if (rating === 1) {
    // Trả lời SAI (Rating = 1 - Again)
    // S_mới = w[11] * (S_cũ ^ -w[12]) * ((1 + (1 - R) * w[13]) ^ w[14])
    const term1 = w[11] * Math.pow(sOld, -w[12]);
    const term2 = Math.pow(1 + (1 - R) * w[13], w[14]);
    const sNew = Math.max(0.1, term1 * term2);
    return { sNew: Number(sNew.toFixed(4)), bonus: 1 };
  } else {
    // Trả lời ĐÚNG (Rating = 2, 3, 4)
    // bonus = w[16] (Easy: 2.61), w[15] (Hard: 0.29), 1 (Good)
    const bonus = rating === 4 ? w[16] : rating === 2 ? w[15] : 1;

    // S_mới = S_cũ * (1 + exp(w[8]) * (11 - D_mới) * (S_cũ ^ -w[9]) * (exp((1 - R) * w[10]) - 1) * bonus)
    const factorD = 11 - dNew;
    const factorS = Math.pow(sOld, -w[9]);
    const factorR = Math.exp((1 - R) * w[10]) - 1;
    const growth = Math.exp(w[8]) * factorD * factorS * factorR * bonus;

    const sNew = Math.max(sOld, sOld * (1 + growth));
    return { sNew: Number(sNew.toFixed(4)), bonus };
  }
}

/**
 * 3. TÍNH KHOẢNG CÁCH LỊCH ÔN TIẾP THEO (Interval):
 *
 * Định nghĩa chuẩn FSRS:
 * Tại mục tiêu ghi nhớ chuẩn R = 0.9 (90%), Interval bằng chính Độ bền vững S.
 * Khi R_mục_tiêu thay đổi, áp dụng hệ số điều chỉnh mục tiêu:
 *   modifier = ((R_mục_tiêu ^ (1 / decay)) - 1) / ((0.9 ^ (1 / decay)) - 1)
 *   Interval = S_mới * modifier
 *
 * Kết quả Interval làm tròn thành số nguyên ngày, tối thiểu là 1 ngày.
 *
 * @param sNew Độ bền vững mới S_mới
 * @param desiredRetention Mục tiêu nhớ (mặc định 0.9 = 90%)
 */
export function calculateInterval(
  sNew: number,
  desiredRetention: number = DEFAULT_REQUEST_RETENTION
): number {
  if (sNew <= 0) return 1;

  const exponent = 1 / FSRS_DECAY;
  const standardMultiplier = Math.pow(DEFAULT_REQUEST_RETENTION, exponent) - 1;
  const targetMultiplier = Math.pow(desiredRetention, exponent) - 1;
  const modifier = standardMultiplier !== 0 ? targetMultiplier / standardMultiplier : 1;

  const rawInterval = sNew * modifier;
  return Math.max(1, Math.round(rawInterval));
}

// ============================================================================
// HỖ TRỢ THƯ VIỆN CHUẨN TS-FSRS VÀ ĐẢM BẢO THỨ TỰ TOÁN HỌC 4 NÚT
// ============================================================================

/**
 * Khởi tạo instance ts-fsrs với cấu hình không dùng short-term steps (lên lịch theo ngày)
 */
export function getFSRSInstance(targetRetention?: number) {
  const retention = targetRetention ?? getActiveTargetRetention();
  return fsrs(
    generatorParameters({
      request_retention: retention,
      enable_short_term: false, // Quản lý lặp lại ngắt quãng theo ngày (scheduled_days)
      enable_fuzz: false,
    })
  );
}

/**
 * Chuyển đổi định dạng Card của ứng dụng sang Card của ts-fsrs
 */
export function toFSRSCard(card: Card, now: Date = new Date()): FSCard {
  const empty = createEmptyCard(now);
  const isNew =
    (card.reps ?? 0) === 0 ||
    !card.last_review ||
    card.state === FSRSState.New ||
    (card.stability ?? 0) === 0;

  let lastReviewDate: Date | undefined = undefined;
  if (!isNew && card.last_review) {
    const parsed = new Date(card.last_review);
    if (!isNaN(parsed.getTime())) {
      lastReviewDate = parsed;
    }
  }

  let dueDate: Date = now;
  if (card.next_review) {
    const parsed = new Date(card.next_review);
    if (!isNaN(parsed.getTime())) {
      dueDate = parsed;
    }
  } else if (card.reviewDate) {
    const parsed = new Date(`${card.reviewDate}T00:00:00`);
    if (!isNaN(parsed.getTime())) {
      dueDate = parsed;
    }
  }

  return {
    ...empty,
    due: dueDate,
    stability: typeof card.stability === 'number' && card.stability > 0 ? card.stability : 0,
    difficulty: typeof card.difficulty === 'number' && card.difficulty > 0 ? card.difficulty : 0,
    elapsed_days: typeof card.elapsed_days === 'number' ? card.elapsed_days : 0,
    scheduled_days: typeof card.scheduled_days === 'number' ? card.scheduled_days : 0,
    reps: typeof card.reps === 'number' ? card.reps : (card.repetition || 0),
    lapses: typeof card.lapses === 'number' ? card.lapses : 0,
    state: isNew
      ? FSRSStateLib.New
      : card.state === FSRSState.Learning || card.state === FSRSState.Relearning
      ? FSRSStateLib.Learning
      : FSRSStateLib.Review,
    last_review: lastReviewDate,
  };
}

export interface FSRSNextIntervals {
  again: number; // "Làm lại" (+1d)
  hard: number;  // "Cần gọt giũa" (+4d)
  good: number;  // "Trôi chảy" (+8d)
  easy: number;  // "Thành thạo" (+15d trở lên)
}

/**
 * Hàm lấy thông tin 4 nút đánh giá FSRS
 * Gọi thư viện chuẩn ts-fsrs:
 * - Rating.Again (1) -> "Làm lại" (+1d)
 * - Rating.Hard (2) -> "Cần gọt giũa" (+4d)
 * - Rating.Good (3) -> "Trôi chảy" (+8d)
 * - Rating.Easy (4) -> "Thành thạo" (+15d trở lên)
 *
 * Đảm bảo khoảng cách ôn tập (scheduled_days / interval) tuân theo đúng thứ tự logic toán học:
 * Interval(Làm lại) <= Interval(Cần gọt giũa) < Interval(Trôi chảy) < Interval(Thành thạo)
 */
export const getFSRSNextIntervals = (
  card: Card,
  now: Date = new Date()
): FSRSNextIntervals => {
  const f = getFSRSInstance();
  const fsCard = toFSRSCard(card, now);
  const result = f.repeat(fsCard, now);

  // Mapping chuẩn Enum Rating từ ts-fsrs (tránh lỗi array index [0,1,2,3])
  const rawAgain = Math.max(1, result[Rating.Again].card.scheduled_days);
  const rawHard = Math.max(1, result[Rating.Hard].card.scheduled_days);
  const rawGood = Math.max(1, result[Rating.Good].card.scheduled_days);
  const rawEasy = Math.max(1, result[Rating.Easy].card.scheduled_days);

  // Đảm bảo thứ tự toán học chuẩn:
  // Interval(Làm lại) <= Interval(Cần gọt giũa) < Interval(Trôi chảy) < Interval(Thành thạo)
  const again = rawAgain;
  const hard = Math.max(again, rawHard);
  const good = Math.max(hard + 1, rawGood);
  const easy = Math.max(good + 1, rawEasy);

  return {
    again, // "Làm lại" (+1d)
    hard,  // "Cần gọt giũa" (+4d)
    good,  // "Trôi chảy" (+8d)
    easy,  // "Thành thạo" (+15d trở lên)
  };
};

// ============================================================================
// III.2. HÀM CẬP NHẬT CHỈ SỐ THẺ: reviewCard(card, rating, current_time)
// ============================================================================

export interface ReviewCardCalculationDetails {
  elapsedDays: number;
  retrievability: number;
  initialD0: number;
  newDifficulty: number;
  newStability: number;
  bonus: number;
  interval: number;
  stepExplanation: string[];
}

export interface ReviewCardResult<T extends Card = Card> {
  card: T;
  updatedCard: T; // Alias cho tương thích
  details: ReviewCardCalculationDetails;
  nextReviewDate: string;
}

/**
 * YÊU CẦU III.2: HÀM CẬP NHẬT reviewCard
 *
 * Thực hiện toàn bộ logic cập nhật thẻ bằng thuật toán FSRS:
 * 1. Tính số ngày đã trôi qua t kể từ lần ôn cuối
 * 2. Tính Retrievability R hiện tại
 * 3. Gọi thư viện ts-fsrs tính toán Độ khó D và Độ bền vững S
 * 4. Lấy khoảng cách Interval tương ứng cho nút được chọn (đảm bảo tính tăng dần)
 * 5. Cập nhật đầy đủ các trường: stability, difficulty, reps, lapses, state, last_review, next_review
 *
 * @param card Thẻ học hiện tại
 * @param rating 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
 * @param currentTime Thời điểm thực hiện ôn tập (mặc định hiện tại)
 */
export function reviewCard<T extends Card>(
  card: T,
  rating: ReviewRating,
  currentTime: Date = new Date()
): ReviewCardResult<T> {
  const todayStr = formatDate(currentTime);
  const isFirstReview = (card.reps ?? 0) === 0 || !card.last_review || (card.stability ?? 0) === 0;

  // Bước 1: Tính số ngày t đã trôi qua từ lần ôn trước
  let t = 0;
  if (card.last_review) {
    const lastDateStr = formatDate(new Date(card.last_review));
    t = Math.max(0, diffDays(todayStr, lastDateStr));
  } else if (card.reviewDate) {
    t = Math.max(0, diffDays(todayStr, card.reviewDate));
  }

  // Bước 2: Gọi ts-fsrs tính toán
  const f = getFSRSInstance();
  const fsCard = toFSRSCard(card, currentTime);
  const repeatRecord = f.repeat(fsCard, currentTime);
  const targetItem =
    rating === Rating.Again
      ? repeatRecord[Rating.Again]
      : rating === Rating.Hard
      ? repeatRecord[Rating.Hard]
      : rating === Rating.Good
      ? repeatRecord[Rating.Good]
      : repeatRecord[Rating.Easy];
  const nextFSCard = targetItem.card;

  // Bước 3: Lấy khoảng cách lịch ôn tiếp theo (Interval) từ getFSRSNextIntervals
  // Đảm bảo Interval(Làm lại) <= Interval(Cần gọt giũa) < Interval(Trôi chảy) < Interval(Thành thạo)
  const intervals = getFSRSNextIntervals(card, currentTime);
  let interval = intervals.again;
  if (rating === Rating.Hard) {
    interval = intervals.hard;
  } else if (rating === Rating.Good) {
    interval = intervals.good;
  } else if (rating === Rating.Easy) {
    interval = intervals.easy;
  }

  // Bước 4: Tính Khả năng gợi nhớ R hiện tại
  const currentStability = card.stability || 0;
  const currentDifficulty = card.difficulty || 0;
  const R = isFirstReview ? 1.0 : calculateRetrievability(currentStability, t);

  const sNew = Number(nextFSCard.stability.toFixed(4));
  const dNew = Number(nextFSCard.difficulty.toFixed(4));

  // Bước 5: Cập nhật trạng thái thẻ (State)
  let newState: number = FSRSState.Review;
  if (rating === Rating.Again) {
    newState = FSRSState.Learning;
  } else if (isFirstReview) {
    newState = rating >= Rating.Good ? FSRSState.Review : FSRSState.Learning;
  } else {
    newState = FSRSState.Review;
  }

  // Bước 6: Tính ngày đến hạn ôn tiếp theo
  const nextReviewDateObj = new Date(currentTime);
  nextReviewDateObj.setDate(nextReviewDateObj.getDate() + interval);
  const next_review = nextReviewDateObj.toISOString();
  const nextReviewDate = formatDate(nextReviewDateObj);

  const ratingLabel =
    rating === Rating.Again
      ? 'Làm lại'
      : rating === Rating.Hard
      ? 'Cần gọt giũa'
      : rating === Rating.Good
      ? 'Trôi chảy'
      : 'Thành thạo';

  const bonusValue = rating === Rating.Easy ? 2.61 : rating === Rating.Hard ? 0.29 : 1;

  // Soạn giải thích chi tiết từng bước tính toán bằng tiếng Việt
  const steps: string[] = [
    `1. Thời gian trôi qua: t = ${t} ngày kể từ lần ôn cuối.`,
    `2. Khả năng gợi nhớ hiện tại: R = ${(R * 100).toFixed(1)}% (hàm suy giảm với S cũ = ${currentStability} ngày).`,
    `3. Độ khó mới: D = ${dNew}/10 (điều chỉnh từ D cũ ${currentDifficulty}).`,
    `4. Độ bền vững mới: S = ${sNew} ngày ${
      rating === Rating.Again
        ? '(bị phạt do quên, ôn lại sớm)'
        : rating === Rating.Easy
        ? `(thưởng Easy bonus w[16]=${bonusValue}, độ bền vững vượt trội)`
        : rating === Rating.Hard
        ? `(phạt Hard w[15]=${bonusValue}, củng cố lại)`
        : '(tăng trưởng theo cấp số nhân)'
    }.`,
    `5. Khoảng cách ôn tiếp theo: Interval = ${interval} ngày (${ratingLabel}).`,
    `6. Lịch ôn kế tiếp: ${nextReviewDate} (${interval === 1 ? 'ngày mai' : `sau ${interval} ngày`}).`,
  ];

  const updatedCard: T = {
    ...card,
    stability: sNew,
    difficulty: dNew,
    reps: (card.reps || 0) + 1,
    lapses: rating === Rating.Again ? (card.lapses || 0) + 1 : card.lapses || 0,
    state: newState,
    last_review: currentTime.toISOString(),
    next_review: next_review,
    reviewDate: nextReviewDate,
    scheduled_days: interval,
    interval: interval,
    elapsed_days: t,
    repetition: (card.reps || 0) + 1,
    easeFactor: Number(((11 - dNew) * 0.3 + 1.3).toFixed(2)),
  };

  return {
    card: updatedCard,
    updatedCard,
    details: {
      elapsedDays: t,
      retrievability: Number(R.toFixed(4)),
      initialD0: dNew,
      newDifficulty: dNew,
      newStability: sNew,
      bonus: bonusValue,
      interval,
      stepExplanation: steps,
    },
    nextReviewDate,
  };
}

/**
 * Wrapper tương thích với giao diện gọi updateCardFSRS cũ
 */
export function updateCardFSRS<T extends Card>(
  card: T,
  rating: ReviewRating,
  reviewTime: Date = new Date()
): {
  updatedCard: T;
  nextReviewDate: string;
  log?: unknown;
} {
  const result = reviewCard(card, rating, reviewTime);
  return {
    updatedCard: result.updatedCard,
    nextReviewDate: result.nextReviewDate,
  };
}

/**
 * Xem trước khoảng thời gian ôn tập tiếp theo (+X ngày) cho cả 4 nút bấm
 * Mapping Enum Rating từ ts-fsrs:
 * Rating.Again (1) -> Nút "Làm lại"
 * Rating.Hard (2) -> Nút "Cần gọt giũa"
 * Rating.Good (3) -> Nút "Trôi chảy"
 * Rating.Easy (4) -> Nút "Thành thạo"
 *
 * Đảm bảo: Interval(Làm lại) <= Interval(Cần gọt giũa) < Interval(Trôi chảy) < Interval(Thành thạo)
 */
export function previewNextFSRSIntervals(
  card: Card,
  now: Date = new Date()
): Record<ReviewRating, { days: number; label: string }> {
  try {
    const intervals = getFSRSNextIntervals(card, now);
    return {
      [Rating.Again]: { days: intervals.again, label: `+${intervals.again}d` },
      [Rating.Hard]: { days: intervals.hard, label: `+${intervals.hard}d` },
      [Rating.Good]: { days: intervals.good, label: `+${intervals.good}d` },
      [Rating.Easy]: { days: intervals.easy, label: `+${intervals.easy}d` },
    };
  } catch (err) {
    console.warn('Lỗi xem trước FSRS intervals:', err);
    return {
      1: { days: 1, label: '+1d' },
      2: { days: 4, label: '+4d' },
      3: { days: 8, label: '+8d' },
      4: { days: 15, label: '+15d' },
    };
  }
}

// ============================================================================
// III.3. THUẬT TOÁN HÀNG ĐỢI ƯU TIÊN (PRIORITY QUEUE) & CHỈ SỐ QUÁ HẠN (OVERDUE INDEX)
// ============================================================================

/**
 * Cấu trúc Node trong Binary Max-Heap
 */
interface PriorityQueueNode<T> {
  item: T;
  priority: number; // Điểm ưu tiên cao hơn sẽ được lấy ra trước
}

/**
 * Hàng đợi ưu tiên (Priority Queue) dựa trên cấu trúc Max-Binary Heap
 * Độ phức tạp thời gian:
 * - Thêm phần tử (enqueue): O(log N)
 * - Lấy phần tử ưu tiên nhất (dequeue): O(log N)
 * - Xem phần tử đầu (peek): O(1)
 */
export class PriorityQueue<T> {
  private heap: PriorityQueueNode<T>[] = [];

  public enqueue(item: T, priority: number): void {
    this.heap.push({ item, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  public dequeue(): T | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop()!.item;

    const maxItem = this.heap[0].item;
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown(0);
    return maxItem;
  }

  public peek(): T | undefined {
    return this.heap[0]?.item;
  }

  public size(): number {
    return this.heap.length;
  }

  public isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * Xuất toàn bộ danh sách phần tử theo thứ tự ưu tiên giảm dần
   */
  public toSortedArray(): T[] {
    const clone = new PriorityQueue<T>();
    for (const node of this.heap) {
      clone.enqueue(node.item, node.priority);
    }
    const result: T[] = [];
    while (!clone.isEmpty()) {
      const item = clone.dequeue();
      if (item !== undefined) result.push(item);
    }
    return result;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].priority <= this.heap[parentIndex].priority) break;

      const temp = this.heap[index];
      this.heap[index] = this.heap[parentIndex];
      this.heap[parentIndex] = temp;

      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      let largest = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (leftChild < length && this.heap[leftChild].priority > this.heap[largest].priority) {
        largest = leftChild;
      }
      if (rightChild < length && this.heap[rightChild].priority > this.heap[largest].priority) {
        largest = rightChild;
      }
      if (largest === index) break;

      const temp = this.heap[index];
      this.heap[index] = this.heap[largest];
      this.heap[largest] = temp;

      index = largest;
    }
  }
}

/**
 * TÍNH CHỈ SỐ QUÁ HẠN (Overdue Index) THEO YÊU CẦU ĐỀ BÀI:
 *
 * ĐỊNH NGHĨA KHOA HỌC:
 * Overdue Index = Số ngày thực tế từ lần ôn cuối / Interval định trước
 *
 * Ý nghĩa:
 * - Nếu thẻ được lên lịch 5 ngày, hôm nay đã là ngày thứ 10:
 *   Overdue Index = 10 / 5 = 2.0 (nguy cơ quên gấp đôi chu kỳ!)
 * - Thẻ nào có Overdue Index càng cao chứng tỏ nguy cơ suy giảm trí nhớ
 *   càng nghiêm trọng và cần được đưa lên đầu hàng đợi để ôn tập ngay!
 *
 * @param card Thẻ học
 * @param currentTime Thời điểm hiện tại
 */
export function calculateOverdueIndex(
  card: Card,
  todayStr: string = getTodayDate()
): {
  overdueDays: number;
  overdueIndex: number;
  priorityScore: number;
  isOverdue: boolean;
  isDueToday: boolean;
} {
  const cardReviewDate = card.reviewDate || todayStr;
  const diff = diffDays(todayStr, cardReviewDate); // today - reviewDate

  const isOverdue = diff > 0;
  const isDueToday = diff === 0;
  const overdueDays = Math.max(0, diff);

  // Interval định trước
  const scheduledInterval = Math.max(1, card.scheduled_days || card.interval || 1);

  // Số ngày thực tế kể từ lần ôn cuối
  let tActual = scheduledInterval + overdueDays;
  if (card.last_review) {
    const lastRevStr = formatDate(new Date(card.last_review));
    tActual = Math.max(1, diffDays(todayStr, lastRevStr));
  }

  // Overdue Index = Số ngày thực tế từ lần ôn cuối / Interval định trước
  let overdueIndex = 1.0;
  if (isOverdue) {
    overdueIndex = tActual / scheduledInterval;
  } else if (isDueToday) {
    overdueIndex = 1.0;
  } else {
    // Chưa đến hạn
    overdueIndex = Math.max(0, tActual / scheduledInterval);
  }

  // TÍNH ĐIỂM ƯU TIÊN CHO HÀNG ĐỢI:
  // Thẻ quá hạn nhiều nhất (Overdue Index cao nhất) sẽ có điểm cao nhất
  let priorityScore = 0;
  if (isOverdue) {
    // Thẻ quá hạn: Điểm cơ sở 1000 + (Overdue Index * 100) + overdueDays
    priorityScore = 1000 + overdueIndex * 100 + overdueDays;
  } else if (isDueToday) {
    // Thẻ đến hạn hôm nay:
    // Ưu tiên thẻ học lại (1) > thẻ mới (0) > thẻ có chu kỳ ngắn
    if (card.state === FSRSState.Learning || card.state === FSRSState.Relearning) {
      priorityScore = 800 + (card.difficulty || 5);
    } else if (card.state === FSRSState.New) {
      priorityScore = 300;
    } else {
      priorityScore = 500 + (1 / scheduledInterval) * 50 + (card.difficulty || 0);
    }
  } else {
    // Chưa đến hạn: điểm âm
    priorityScore = diff;
  }

  return {
    overdueDays,
    overdueIndex: Number(overdueIndex.toFixed(2)),
    priorityScore,
    isOverdue,
    isDueToday,
  };
}

/**
 * YÊU CẦU III.3: LỌC VÀ SẮP XẾP THẺ CẦN HỌC HÔM NAY BẰNG PRIORITY QUEUE
 *
 * Hàm lọc ra các thẻ cần học trong ngày hôm nay (next_review <= thời gian hiện tại / reviewDate <= today).
 * Sắp xếp các thẻ theo "Chỉ số quá hạn" (Overdue Index = Số ngày thực tế từ lần ôn cuối / Interval định trước),
 * thẻ nào quá hạn nhiều nhất sẽ được xếp lên đầu hàng đợi để ôn trước.
 *
 * @param cards Danh sách thẻ đầu vào
 * @param currentTime Thời gian kiểm tra (mặc định hiện tại)
 * @returns Danh sách thẻ đã lọc và sắp xếp ưu tiên
 */
export function getTodayDueCardsPriorityQueue<T extends Card>(
  cards: T[],
  currentTime: Date = new Date()
): T[] {
  const todayStr = formatDate(currentTime);
  const pq = new PriorityQueue<T>();

  for (const card of cards) {
    const isDue = (card.next_review && new Date(card.next_review) <= currentTime) ||
                  (card.reviewDate && card.reviewDate <= todayStr);

    if (isDue) {
      const { priorityScore } = calculateOverdueIndex(card, todayStr);
      pq.enqueue(card, priorityScore);
    }
  }

  return pq.toSortedArray();
}

/**
 * Hàm tương thích gọi lịch xếp hàng đợi
 */
export function scheduleCardsPriorityQueue<T extends Card>(
  cards: T[],
  options: {
    filterDueTodayOnly?: boolean;
    todayDate?: string;
  } = {}
): T[] {
  const { filterDueTodayOnly = true, todayDate = getTodayDate() } = options;
  const pq = new PriorityQueue<T>();

  for (const card of cards) {
    const analysis = calculateOverdueIndex(card, todayDate);
    if (filterDueTodayOnly) {
      if (analysis.isOverdue || analysis.isDueToday) {
        pq.enqueue(card, analysis.priorityScore);
      }
    } else {
      pq.enqueue(card, analysis.priorityScore);
    }
  }

  return pq.toSortedArray();
}

/**
 * Trả về thông tin tên và màu badge cho trạng thái FSRS
 */
export function getFSRSStateInfo(state?: number): {
  state: number;
  nameEn: string;
  nameVi: string;
  badgeBg: string;
  badgeColor: string;
} {
  switch (state) {
    case FSRSState.Learning:
      return {
        state: FSRSState.Learning,
        nameEn: 'Learning',
        nameVi: 'Đang học',
        badgeBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
        badgeColor: 'text-amber-800 dark:text-amber-300',
      };
    case FSRSState.Review:
      return {
        state: FSRSState.Review,
        nameEn: 'Review',
        nameVi: 'Ôn tập',
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
        badgeColor: 'text-emerald-800 dark:text-emerald-300',
      };
    case FSRSState.Relearning:
      return {
        state: FSRSState.Relearning,
        nameEn: 'Relearning',
        nameVi: 'Học lại',
        badgeBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
        badgeColor: 'text-rose-800 dark:text-rose-300',
      };
    case FSRSState.New:
    default:
      return {
        state: FSRSState.New,
        nameEn: 'New',
        nameVi: 'Mới',
        badgeBg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
        badgeColor: 'text-blue-800 dark:text-blue-300',
      };
  }
}

/**
 * Khởi tạo dữ liệu thẻ FSRS mặc định
 */
export function createDefaultFSRSCard(reviewDateStr?: string): Card {
  const today = getTodayDate();
  const dateStr = reviewDateStr || today;
  return {
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    state: FSRSState.New,
    last_review: undefined,
    next_review: new Date(`${dateStr}T00:00:00`).toISOString(),
    reviewDate: dateStr,
    scheduled_days: 0,
    interval: 1,
    elapsed_days: 0,
    repetition: 0,
    easeFactor: 2.5,
  };
}
