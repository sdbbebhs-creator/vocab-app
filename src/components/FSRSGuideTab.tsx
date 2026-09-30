import React, { useState, useMemo } from 'react';
import {
  Brain,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  Calculator,
  Layers,
  Heart,
  Smile,
  Zap,
  Award,
} from 'lucide-react';
import {
  calculateRetrievability,
  reviewCard,
} from '../utils/fsrs';
import { ReviewRating, Card, FSRSState } from '../types';

interface FSRSGuideTabProps {
  onOpenOptimizer?: () => void;
}

export const FSRSGuideTab: React.FC<FSRSGuideTabProps> = ({ onOpenOptimizer }) => {
  // Bộ mô phỏng tính toán đơn giản, trực quan cho trẻ con / người mới bắt đầu
  const [simStability, setSimStability] = useState<number>(3.0);
  const [simDifficulty, setSimDifficulty] = useState<number>(5.0);
  const [simElapsedDays, setSimElapsedDays] = useState<number>(3);
  const [simRating, setSimRating] = useState<ReviewRating>(3);
  const [simIsFirstReview, setSimIsFirstReview] = useState<boolean>(false);

  // Tính toán kết quả mô phỏng theo thời gian thực
  const simResult = useMemo(() => {
    const mockCard: Card = {
      stability: simIsFirstReview ? 0 : simStability,
      difficulty: simIsFirstReview ? 0 : simDifficulty,
      reps: simIsFirstReview ? 0 : 2,
      lapses: 0,
      state: simIsFirstReview ? FSRSState.New : FSRSState.Review,
      last_review: new Date(Date.now() - simElapsedDays * 24 * 60 * 60 * 1000).toISOString(),
      next_review: new Date().toISOString(),
      reviewDate: '2026-09-24',
      interval: simStability,
      scheduled_days: simStability,
    };

    return reviewCard(mockCard, simRating, new Date());
  }, [simStability, simDifficulty, simElapsedDays, simRating, simIsFirstReview]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner thân thiện & dễ hiểu */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-600 to-indigo-700 text-white p-6 sm:p-8 lg:p-10 shadow-lg">
        <div className="relative z-10 max-w-3xl space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-amber-200 text-xs font-bold tracking-wider uppercase border border-white/20">
            <Sparkles size={14} className="text-amber-300 animate-spin" />
            <span>Bí Quyết Ghi Nhớ Siêu Đẳng Dành Cho Bạn</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
            Thuật Toán FSRS Là Gì? (Giải Thích Siêu Dễ Hiểu!)
          </h1>

          <p className="text-sm sm:text-base text-emerald-50 leading-relaxed font-medium">
            Tưởng tượng bộ não của bạn như một <strong className="text-amber-300">bãi cỏ xanh</strong>. FSRS là người bạn dẫn đường thông minh, giúp bạn biến bãi cỏ thành một <strong className="text-white">con đường đá kiên cố</strong> để học từ nào là nhớ mãi từ đó, không tốn thời gian học đi học lại!
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs sm:text-sm font-semibold">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/20 backdrop-blur-sm border border-white/10">
              <Smile size={16} className="text-emerald-300" />
              <span>Học ít - Nhớ dai cả đời</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/20 backdrop-blur-sm border border-white/10">
              <Clock size={16} className="text-amber-300" />
              <span>Nhắc đúng lúc bạn sắp quên</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/20 backdrop-blur-sm border border-white/10">
              <Flame size={16} className="text-rose-300" />
              <span>Cây nào héo thì tưới trước</span>
            </div>

            {onOpenOptimizer && (
              <button
                type="button"
                onClick={onOpenOptimizer}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 active:scale-95 text-slate-900 font-bold shadow-md transition-all cursor-pointer ml-auto"
              >
                <Sparkles size={15} className="text-emerald-600" />
                <span>Bác Sĩ Đo Nhịp Não (FSRS Optimizer)</span>
              </button>
            )}
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute -right-12 -bottom-16 w-80 h-80 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
      </div>

      {/* PHẦN 1: CÂU CHUYỆN BÃI CỎ VÀ TẠI SAO HỌC NHỒI NHÉT LẠI DỞ */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
              1. Câu Chuyện "Bãi Cỏ & Con Đường Mòn"
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Tại sao học nhồi nhét 1 ngày 50 lần vừa mệt vừa quên, còn FSRS lại nhớ cả đời?
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div className="space-y-3.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
              🌿 Khi bạn gặp một từ vựng mới:
            </p>
            <p>
              Nó giống như bước chân đầu tiên của bạn đi qua một bãi cỏ rậm rạp. Cỏ chỉ hơi ngả một chút xíu. Nếu bạn không quay lại, chỉ <strong>sau 1 ngày cỏ sẽ đứng thẳng dậy</strong> và lối đi biến mất tiêu (quên sạch từ đó!).
            </p>
            <p>
              ❌ <strong>Học nhồi nhét (Cramming):</strong> Dẫm 50 lần lên cỏ trong 1 buổi chiều. Cỏ dập nát, nhưng tuần sau nó vẫn mọc um tùm trở lại, bạn lại quên mất.
            </p>
            <p>
              ✅ <strong>FSRS nhắc bạn thông minh:</strong>
            </p>
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2 font-medium text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
                <span><strong>Lần 1 (Ngày mai):</strong> Nhắc lại 1 cái, cỏ xẹp xuống thành vệt rõ hơn (nhớ được 3 ngày).</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
                <span><strong>Lần 2 (3 ngày sau):</strong> Đi qua tiếp, thành đường mòn đất đỏ (nhớ được 10 ngày).</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
                <span><strong>Lần 3 (2 tuần sau):</strong> Con đường trở thành đường bê tông (nhớ cả tháng).</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">4</span>
                <span><strong>Lần 4 (vài tháng sau):</strong> Biến thành xa lộ cao tốc vĩnh cửu, không bao giờ quên được nữa!</span>
              </div>
            </div>
          </div>

          {/* Minh họa trực quan */}
          <div className="bg-slate-50 dark:bg-slate-950/70 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3 text-center">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              <span>Đồ thị trí nhớ: Nhắc lại đúng lúc để trí nhớ luôn trên 90%</span>
            </div>

            <div className="relative h-48 w-full flex items-end justify-center">
              <svg viewBox="0 0 400 180" className="w-full h-full overflow-visible">
                {/* Đường mức 90% */}
                <line x1="30" y1="36" x2="380" y2="36" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 4" />
                <text x="380" y="30" fill="#10b981" fontSize="10" textAnchor="end" fontWeight="bold">Ngưỡng vàng: 90%</text>

                {/* Trục hoành */}
                <line x1="30" y1="150" x2="380" y2="150" stroke="currentColor" className="text-slate-300 dark:text-slate-700" strokeWidth="1" />
                <text x="40" y="168" fill="currentColor" className="text-slate-400 text-[11px]">Hôm nay</text>
                <text x="100" y="168" fill="currentColor" className="text-slate-400 text-[11px]">Mai</text>
                <text x="180" y="168" fill="currentColor" className="text-slate-400 text-[11px]">Tuần sau</text>
                <text x="280" y="168" fill="currentColor" className="text-slate-400 text-[11px]">Tháng sau</text>
                <text x="360" y="168" fill="currentColor" className="text-slate-400 text-[11px]">Mãi mãi</text>

                {/* Quên tự nhiên (màu đỏ) */}
                <path d="M 40 20 Q 60 110 160 145" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4" />
                <text x="165" y="142" fill="#ef4444" fontSize="10" fontWeight="bold">Quên mất tiêu!</text>

                {/* FSRS nhắc lại (màu xanh lá) */}
                <path d="M 40 20 Q 80 32 100 36" fill="none" stroke="#10b981" strokeWidth="3" />
                <line x1="100" y1="36" x2="100" y2="20" stroke="#059669" strokeWidth="2" strokeDasharray="2 2" />

                <path d="M 100 20 Q 150 30 180 36" fill="none" stroke="#10b981" strokeWidth="3" />
                <line x1="180" y1="36" x2="180" y2="20" stroke="#059669" strokeWidth="2" strokeDasharray="2 2" />

                <path d="M 180 20 Q 250 28 280 36" fill="none" stroke="#10b981" strokeWidth="3" />
                <line x1="280" y1="36" x2="280" y2="20" stroke="#059669" strokeWidth="2" strokeDasharray="2 2" />

                <path d="M 280 20 Q 340 24 380 28" fill="none" stroke="#10b981" strokeWidth="3" />
              </svg>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs font-semibold pt-1">
              <span className="flex items-center gap-1.5 text-rose-500">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Nếu không ôn: Quên sạch sau vài ngày
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Ôn cùng FSRS: Khoảng cách giãn xa, nhớ lâu
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* PHẦN 2: 3 NGƯỜI BẠN NHỎ TRONG BỘ NÃO (ĐƠN GIẢN HÓA S, D, R) */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl shrink-0">
            <Brain size={24} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
              2. Ba Người Bạn Siêu Nhân Giúp Bạn Học Bài
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Thuật toán FSRS theo dõi 3 chỉ số siêu đáng yêu sau đây cho từng từ:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Bạn 1: S - Độ Nhớ Dai */}
          <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-slate-950/60 border border-emerald-200/70 dark:border-emerald-900/40 space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white font-black text-xl flex items-center justify-center shadow-md shadow-emerald-500/20">
              S
            </div>
            <h3 className="font-black text-base text-slate-900 dark:text-slate-100">
              1. Bạn "Nhớ Dai" (Stability)
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn này đo xem: <strong>Sau bao nhiêu ngày thì bạn mới bắt đầu quên từ này?</strong>
            </p>
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl text-xs space-y-1 border border-emerald-100 dark:border-slate-700">
              <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                • Lúc mới học: Nhớ dai 1 ngày.
              </div>
              <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                • Ôn đúng lúc: Nhớ dai nhảy lên 3 ngày ➔ 10 ngày ➔ 30 ngày ➔ 1 năm!
              </div>
            </div>
          </div>

          {/* Bạn 2: D - Độ Khó Nhằn */}
          <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-slate-950/60 border border-amber-200/70 dark:border-amber-900/40 space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white font-black text-xl flex items-center justify-center shadow-md shadow-amber-500/20">
              D
            </div>
            <h3 className="font-black text-base text-slate-900 dark:text-slate-100">
              2. Bạn "Khó Nhằn" (Difficulty)
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn này đo xem: <strong>Từ này dễ như ăn kẹo hay khó như leo núi?</strong>
            </p>
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl text-xs space-y-1 border border-amber-100 dark:border-slate-700">
              <div className="font-semibold text-amber-700 dark:text-amber-300">
                • Từ dễ như "Cat, Dog": Điểm khó thấp (1-2 điểm), giãn lịch cực nhanh.
              </div>
              <div className="font-semibold text-amber-700 dark:text-amber-300">
                • Từ dài, hóc búa: Điểm khó cao (7-9 điểm), hệ thống nhắc bạn sớm hơn.
              </div>
            </div>
          </div>

          {/* Bạn 3: R - Độ Nhớ Lúc Này */}
          <div className="p-5 rounded-2xl bg-blue-50/50 dark:bg-slate-950/60 border border-blue-200/70 dark:border-blue-900/40 space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500 text-white font-black text-xl flex items-center justify-center shadow-md shadow-blue-500/20">
              R
            </div>
            <h3 className="font-black text-base text-slate-900 dark:text-slate-100">
              3. Bạn "Nhớ Lúc Này" (Retrievability)
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn này đo xem: <strong>Bây giờ mở thẻ ra, bạn có nhớ được không (từ 0% đến 100%)?</strong>
            </p>
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl text-xs space-y-1 border border-blue-100 dark:border-slate-700">
              <div className="font-semibold text-blue-700 dark:text-blue-300">
                • Cứ sau vài ngày, bạn R tụt dần từ 100% xuống 90%.
              </div>
              <div className="font-semibold text-blue-700 dark:text-blue-300">
                • Khi vừa chạm 90%, FSRS lập tức đưa thẻ vào danh sách ôn tập hôm nay!
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PHẦN 3: 4 NÚT BẤM THẦN KỲ (AGAIN, HARD, GOOD, EASY) */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl shrink-0">
            <Layers size={24} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
              3. Bốn Nút Bấm Thần Kỳ Khi Ôn Tập
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Hãy bấm thật lòng với cảm giác của bạn, FSRS sẽ tự lo phần còn lại!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Nút 1: Làm lại */}
          <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-rose-700 dark:text-rose-300 flex items-center gap-1.5 text-sm">
                <span className="w-6 h-6 rounded-full bg-rose-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                Làm lại (Again)
              </span>
              <span className="text-xs font-bold px-2 py-0.5 bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 rounded-md">
                Mai học lại
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal">
              <strong>"Chưa nhớ được, cần làm lại ngay!"</strong><br />
              Đừng buồn, hệ thống sẽ hẹn bạn ôn lại ngay ngày mai để gieo lại mầm nhớ.
            </p>
          </div>

          {/* Nút 2: Cần gọt giũa */}
          <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-amber-700 dark:text-amber-300 flex items-center gap-1.5 text-sm">
                <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                Cần gọt giũa (Hard)
              </span>
              <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 rounded-md">
                Sau 1-2 ngày
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal">
              <strong>"Nhớ hơi vất vả, cần gọt giũa và luyện tập thêm."</strong><br />
              Hệ thống sẽ cho bạn ôn lại sớm sau 1-2 ngày để não quen dần.
            </p>
          </div>

          {/* Nút 3: Trôi chảy */}
          <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 text-sm">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                Trôi chảy (Good)
              </span>
              <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 rounded-md">
                Giãn gấp 2-3 lần
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal">
              <strong>"Nhớ tự nhiên, phản xạ trôi chảy và chuẩn xác!"</strong><br />
              Tuyệt vời! Lịch ôn kế tiếp sẽ giãn ra gấp đôi hoặc gấp ba (vài ngày đến vài tuần).
            </p>
          </div>

          {/* Nút 4: Thành thạo */}
          <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-blue-700 dark:text-blue-300 flex items-center gap-1.5 text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">4</span>
                Thành thạo (Easy)
              </span>
              <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 rounded-md">
                Thưởng bay xa
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal">
              <strong>"Nắm rất vững, sử dụng thành thạo và tức thì!"</strong><br />
              Được thưởng điểm, lịch ôn dời đi thật xa để bạn dành sức học từ mới.
            </p>
          </div>
        </div>
      </section>

      {/* PHẦN 4: BỘ THỬ NGHIỆM TRÍ NHỚ TRỰC QUAN (SIMULATOR) */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-5 sm:p-7 border border-slate-800 shadow-xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl shrink-0 border border-emerald-500/30">
              <Calculator size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                4. Phòng Thử Nghiệm Trí Nhớ (Kéo Thanh Trượt Xem Kết Quả)
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Kéo thử các thanh trượt bên dưới để xem hệ thống tính ngày ôn bài siêu chuẩn:
              </p>
            </div>
          </div>
        </div>

        {/* Thanh trượt điều khiển */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Độ nhớ dai trước đây:</span>
              <strong className="text-emerald-400 font-mono">{simStability} ngày</strong>
            </label>
            <input
              type="range"
              min="0.5"
              max="30"
              step="0.5"
              value={simStability}
              onChange={(e) => {
                setSimStability(parseFloat(e.target.value));
                setSimIsFirstReview(false);
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-400">Số ngày bạn đã nhớ từ lần trước</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Độ khó của từ:</span>
              <strong className="text-amber-400 font-mono">{simDifficulty} / 10</strong>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={simDifficulty}
              onChange={(e) => {
                setSimDifficulty(parseFloat(e.target.value));
                setSimIsFirstReview(false);
              }}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-400">1 là dễ ợt, 10 là siêu khó</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Đã mấy ngày chưa xem lại?</span>
              <strong className="text-blue-400 font-mono">{simElapsedDays} ngày</strong>
            </label>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={simElapsedDays}
              onChange={(e) => setSimElapsedDays(parseInt(e.target.value, 10))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-400">Thời gian từ lần học trước tới giờ</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Bạn chọn nút nào?</label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { r: 1, label: 'Làm lại', color: 'bg-rose-600' },
                { r: 2, label: 'Cần gọt giũa', color: 'bg-amber-600' },
                { r: 3, label: 'Trôi chảy', color: 'bg-emerald-600' },
                { r: 4, label: 'Thành thạo', color: 'bg-blue-600' },
              ].map((btn) => (
                <button
                  key={btn.r}
                  type="button"
                  onClick={() => setSimRating(btn.r as ReviewRating)}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    simRating === btn.r
                      ? `${btn.color} text-white ring-2 ring-white shadow-md`
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={simIsFirstReview}
                onChange={(e) => setSimIsFirstReview(e.target.checked)}
                className="rounded accent-emerald-500"
              />
              <span>Từ này mới học lần đầu</span>
            </label>
          </div>
        </div>

        {/* Kết quả hiện ra siêu to khổng lồ, dễ hiểu */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1 text-center">
            <div className="text-xs text-slate-400 font-medium">Bạn còn nhớ được bao nhiêu?</div>
            <div className="text-3xl font-black text-blue-400">
              {(simResult.details.retrievability * 100).toFixed(0)}%
            </div>
            <p className="text-[11px] text-slate-300">
              {simResult.details.retrievability >= 0.85
                ? '🌟 Bạn vẫn nhớ rất tốt!'
                : '⚠️ Sắp quên rồi, ôn ngay là chuẩn bài!'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1 text-center">
            <div className="text-xs text-slate-400 font-medium">Độ nhớ dai mới</div>
            <div className="text-3xl font-black text-emerald-400">
              {simResult.details.newStability.toFixed(1)} ngày
            </div>
            <p className="text-[11px] text-slate-300">
              {simRating === 1 ? 'Giảm xuống để mai ôn lại' : 'Tăng lên, não bạn nhớ dai hơn rồi đó!'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1 text-center sm:col-span-2 lg:col-span-1">
            <div className="text-xs text-slate-400 font-medium">Bao giờ cần ôn lại?</div>
            <div className="text-3xl font-black text-purple-400">
              Sau {simResult.details.interval} ngày
            </div>
            <p className="text-[11px] text-purple-200">
              Lịch ôn tiếp theo: <strong>{simResult.nextReviewDate}</strong>
            </p>
          </div>
        </div>
      </section>

      {/* PHẦN 5: NGUYÊN TẮC TƯỚI CÂY (TƯỚI CÂY HÉO TRƯỚC) */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0">
            <Flame size={24} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
              5. Nguyên Tắc Tưới Cây: "Cây Nào Héo Nhất Thì Tưới Trước"
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Nếu một ngày bạn bận quá không kịp ôn hết thì sao?
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
          <p>
            🌱 Giống như trong vườn có 10 chậu hoa: Có chậu vẫn xanh tốt, có chậu đất đã khô nứt nẻ và sắp chết héo. Bạn sẽ tưới nước cho chậu nào trước? Chắc chắn là chậu sắp héo rồi!
          </p>
          <p>
            Hệ thống FSRS cũng y hệt như vậy: <strong>Từ vựng nào bạn sắp quên nhất, trễ hạn lâu nhất sẽ tự động được đẩy lên số 1</strong> để bạn ôn trước. Những từ bạn còn nhớ tốt sẽ đứng sau. Nhờ thế, bạn không bao giờ bị rơi rụng từ vựng!
          </p>
        </div>
      </section>
    </div>
  );
};
