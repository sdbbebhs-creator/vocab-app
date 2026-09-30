import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Brain,
  Sparkles,
  Sliders,
  CheckCircle2,
  Clock,
  Check,
  X,
  RefreshCw,
  Target,
  Smile,
  Heart,
  Award,
  Zap,
} from 'lucide-react';
import { VocabItem, GrammarItem, FSRSOptimizerResult } from '../types';
import {
  getMemoryLogsStats,
  getUserFSRSConfig,
  saveUserFSRSConfig,
  seedSampleMemoryLogs,
  resetMemoryLogs,
} from '../utils/storage';
import { getActiveTargetRetention, setActiveTargetRetention } from '../utils/fsrs';

interface FSRSOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vocabList: VocabItem[];
  grammarList: GrammarItem[];
  onTargetRetentionChanged?: (newRetention: number) => void;
  onShowToast: (msg: string) => void;
}

const EASY_GOAL_OPTIONS = [
  {
    id: 'Thi IELTS / TOEFL / TOEIC cấp tốc (1-3 tháng)',
    label: 'Cần thi gấp / Kiểm tra trên lớp (Nhớ thật chắc)',
    desc: 'Ưu tiên nhớ chuẩn trên 90%, sẵn sàng ôn nhiều hơn một chút trước ngày thi để điểm cao.',
  },
  {
    id: 'Học dài hạn / Bền vững (Giao tiếp & Đi làm)',
    label: 'Học thong thả, bền vững (Giao tiếp & Đi làm)',
    desc: 'Học nhẹ nhàng thoải mái (khoảng 85-88%), giảm áp lực bài vở mỗi ngày, nhớ tự nhiên.',
  },
  {
    id: 'Tự do rèn luyện từ vựng hàng ngày',
    label: 'Học vui theo sở thích hàng ngày',
    desc: 'Mỗi ngày vài từ, vui vẻ nhẹ nhàng theo nhịp sống, không áp lực.',
  },
];

export const FSRSOptimizerModal: React.FC<FSRSOptimizerModalProps> = ({
  isOpen,
  onClose,
  vocabList,
  grammarList,
  onTargetRetentionChanged,
  onShowToast,
}) => {
  const [stats, setStats] = useState(() => getMemoryLogsStats(vocabList, grammarList));
  const [userGoal, setUserGoal] = useState(() => getUserFSRSConfig().userGoal || EASY_GOAL_OPTIONS[1].id);
  const [targetRetention, setTargetRetention] = useState(() => Math.round(getActiveTargetRetention() * 100));
  const [loading, setLoading] = useState(false);
  const [optimizerResult, setOptimizerResult] = useState<FSRSOptimizerResult | null>(null);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const refreshedStats = getMemoryLogsStats(vocabList, grammarList);
      setStats(refreshedStats);
      const config = getUserFSRSConfig();
      setUserGoal(config.userGoal || EASY_GOAL_OPTIONS[1].id);
      setTargetRetention(Math.round(getActiveTargetRetention() * 100));
      if (config.lastOptimizationResult) {
        setOptimizerResult(config.lastOptimizationResult);
      }
      setApplied(false);
    }
  }, [isOpen, vocabList, grammarList]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Support closing with Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Gọi AI để tối ưu nhịp học
  const handleRunOptimizer = async () => {
    setLoading(true);
    setApplied(false);
    try {
      const response = await fetch('/api/ai/optimize-fsrs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_reviews: stats.total_reviews,
          actual_retention: stats.actual_retention,
          target_retention: targetRetention,
          daily_cards: stats.daily_cards,
          user_goal: userGoal,
        }),
      });

      const resJson = await response.json();
      if (resJson.success && resJson.data) {
        setOptimizerResult(resJson.data);
        saveUserFSRSConfig({
          userGoal,
          lastOptimizedAt: new Date().toISOString(),
          lastOptimizationResult: resJson.data,
        });
        onShowToast('✨ Trợ lý AI đã tìm được lịch học vừa vặn nhất cho bạn!');
      } else {
        throw new Error(resJson.error || 'Failed to optimize');
      }
    } catch {
      // Fallback cục bộ đơn giản, dễ hiểu
      const isEligible = stats.total_reviews >= 1000;
      const isUrgent = userGoal.includes('gấp') || userGoal.includes('thi') || userGoal.includes('IELTS');
      const rec = isUrgent ? 0.91 : 0.88;
      const localResult: FSRSOptimizerResult = {
        is_eligible_for_optimization: isEligible,
        recommended_target_retention: rec,
        status_code: isEligible ? 'OPTIMIZED' : 'COLD_START',
        user_message: isEligible
          ? `Tuyệt vời! AI đã theo dõi ${stats.total_reviews} lần học của bạn và nhận thấy bạn học rất chăm. AI khuyên bạn nên duy trì mức nhớ ${Math.round(
              rec * 100
            )}% để việc ôn tập vừa nhẹ nhàng vừa nhớ lâu bền!`
          : `Bạn đang học rất tốt (${stats.total_reviews}/1.000 lần)! Hãy tiếp tục ôn tập mỗi ngày, AI đang áp dụng lịch ôn chuẩn an toàn nhất để não bạn tiếp thu nhẹ nhàng nhất.`,
      };
      setOptimizerResult(localResult);
      saveUserFSRSConfig({
        userGoal,
        lastOptimizedAt: new Date().toISOString(),
        lastOptimizationResult: localResult,
      });
      onShowToast('✨ Đã tìm được nhịp học phù hợp!');
    } finally {
      setLoading(false);
    }
  };

  // Áp dụng mục tiêu ghi nhớ được đề xuất
  const handleApplyRecommended = () => {
    if (!optimizerResult) return;
    const newRetention = optimizerResult.recommended_target_retention;
    setActiveTargetRetention(newRetention);
    saveUserFSRSConfig({
      targetRetention: newRetention,
      userGoal,
    });
    setTargetRetention(Math.round(newRetention * 100));
    setApplied(true);
    if (onTargetRetentionChanged) {
      onTargetRetentionChanged(newRetention);
    }
    onShowToast(`🎯 Đã áp dụng mức nhớ ${Math.round(newRetention * 100)}% vào lịch ôn tập hàng ngày!`);
  };

  const handleSimulate1200Reviews = () => {
    seedSampleMemoryLogs(1250);
    const refreshed = getMemoryLogsStats(vocabList, grammarList);
    setStats(refreshed);
    setOptimizerResult(null);
    setApplied(false);
    onShowToast('🧪 Đã thử nghiệm: Đạt 1.250 lần học (Đủ điều kiện hiểu rõ nhịp não)!');
  };

  const handleSimulate350Reviews = () => {
    seedSampleMemoryLogs(350);
    const refreshed = getMemoryLogsStats(vocabList, grammarList);
    setStats(refreshed);
    setOptimizerResult(null);
    setApplied(false);
    onShowToast('🧪 Đã thử nghiệm: Mới học 350 lần (Đang làm quen)');
  };

  const handleResetLogs = () => {
    resetMemoryLogs();
    const refreshed = getMemoryLogsStats(vocabList, grammarList);
    setStats(refreshed);
    setOptimizerResult(null);
    setApplied(false);
    onShowToast('Đã đưa về dữ liệu học thực tế của bạn!');
  };

  const progressPercent = Math.min(100, Math.round((stats.total_reviews / 1000) * 100));

  return createPortal(
    <div
      id="modal-fsrs-optimizer"
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden m-auto flex flex-col max-h-[92vh] sm:max-h-[88vh] max-h-[calc(100dvh-2rem)]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Brain size={26} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                Trợ Lý Đo Nhịp Trí Nhớ Của Bạn
              </h2>
              <p className="text-xs text-emerald-100 mt-0.5 max-w-md">
                Giống như bác sĩ đo nhịp tim, trợ lý AI sẽ xem bạn học thế nào để chọn lịch ôn vừa vặn nhất cho riêng bạn!
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
          {/* Bước 1: Tiến độ tích lũy 1.000 lần học */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm flex items-center gap-1.5">
                <Smile size={16} className="text-emerald-500" />
                1. Mức Độ Thấu Hiểu Não Bộ Của Bạn
              </span>
              {stats.isEligible ? (
                <span className="flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-300">
                  <CheckCircle2 size={13} />
                  Đã hiểu rõ ({stats.total_reviews} lần)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-300">
                  <Clock size={13} />
                  Đang tích lũy ({stats.total_reviews}/1.000 lần)
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Bạn đã ôn tập: <strong>{stats.total_reviews}</strong> lần</span>
                <span>Mốc thân thiết: <strong>1.000</strong> lần ({progressPercent}%)</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    stats.isEligible ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-400 to-emerald-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {stats.isEligible
                ? 'Tuyệt vời! Bạn và hệ thống đã ôn cùng nhau hơn 1.000 lần. AI đã hiểu rất rõ tốc độ nhớ của bạn để thiết kế lịch riêng!'
                : 'Giống như kết bạn, phải trò chuyện đủ lâu (khoảng 1.000 lần ôn bài) thì mới hiểu hết tính cách của nhau. Hiện tại hệ thống tự động chọn lịch ôn an toàn và chuẩn nhất cho bạn.'}
            </p>
          </div>

          {/* 4 Thẻ chỉ số dễ hiểu */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Bạn đang nhớ được</span>
              <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {stats.actual_retention}%
              </div>
              <span className="text-[10px] text-slate-500">Mỗi lần ôn bài</span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Mục tiêu bạn muốn</span>
              <div className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {targetRetention}%
              </div>
              <span className="text-[10px] text-slate-500">Chuẩn ghi nhớ</span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Mỗi ngày ôn khoảng</span>
              <div className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {stats.daily_cards}
              </div>
              <span className="text-[10px] text-slate-500">thẻ từ / câu</span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Số lần đã lưu</span>
              <div className="text-base sm:text-lg font-black text-teal-600 dark:text-teal-400 mt-0.5">
                {stats.activeLogsCount}
              </div>
              <span className="text-[10px] text-slate-500">lượt lịch sử</span>
            </div>
          </div>

          {/* Bước 2: Chọn mục tiêu học */}
          <div className="space-y-2">
            <label className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs sm:text-sm">
              <Target size={16} className="text-indigo-500" />
              2. Bạn muốn phong cách học như thế nào?
            </label>
            <div className="grid grid-cols-1 gap-2">
              {EASY_GOAL_OPTIONS.map((goal) => {
                const isSelected = userGoal === goal.id;
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => setUserGoal(goal.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-slate-900 dark:text-slate-100 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{goal.label}</span>
                      {isSelected && <Check size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      {goal.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nút bấm phân tích AI */}
          <div className="pt-1">
            <button
              type="button"
              disabled={loading}
              onClick={handleRunOptimizer}
              className="w-full py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Trợ lý AI đang tính lịch ôn vừa vặn nhất...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} className="fill-white" />
                  <span>Nhờ AI Tính Lịch Học Phù Hợp Với Bạn</span>
                </>
              )}
            </button>
          </div>

          {/* Kết quả AI đề xuất */}
          {optimizerResult && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-emerald-50/60 to-white dark:from-slate-800/90 dark:via-indigo-950/40 dark:to-slate-800 border-2 border-indigo-300 dark:border-indigo-800/80 shadow-md space-y-3.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                    <Sparkles size={16} />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                    Lời Khuyên Từ Trợ Lý AI
                  </h4>
                </div>

                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300">
                  {optimizerResult.status_code === 'OPTIMIZED' ? 'Đã tìm được lịch chuẩn' : 'Lịch ôn an toàn'}
                </span>
              </div>

              {/* Tóm tắt đề xuất */}
              <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-indigo-200 dark:border-indigo-900 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Mức độ ghi nhớ khuyên dùng
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-400">
                    {Math.round(optimizerResult.recommended_target_retention * 100)}%
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500">Mức hiện tại: {targetRetention}%</span>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {optimizerResult.recommended_target_retention <= 0.88
                      ? 'Ôn nhẹ nhàng, không lo áp lực'
                      : 'Nhớ thật chắc chắn cho kỳ thi'}
                  </div>
                </div>
              </div>

              {/* Lời nhắn thân thiện */}
              <div className="p-3 bg-indigo-100/50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/60 dark:border-indigo-900/60 text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed font-medium">
                "{optimizerResult.user_message}"
              </div>

              {/* Nút bấm áp dụng */}
              <div>
                <button
                  type="button"
                  onClick={handleApplyRecommended}
                  disabled={applied}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    applied
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                  }`}
                >
                  {applied ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Đã áp dụng mức nhớ {Math.round(optimizerResult.recommended_target_retention * 100)}% vào lịch học!</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Áp Dụng Lịch Học Này Ngay</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Khu vực thử nghiệm nhanh */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span className="flex items-center gap-1">
                <Sliders size={13} />
                Nút thử nghiệm nhanh
              </span>
              <span>Dành cho kiểm tra</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSimulate1200Reviews}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                Thử mốc 1.250 lần học
              </button>
              <button
                type="button"
                onClick={handleSimulate350Reviews}
                className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
              >
                Thử mốc 350 lần học
              </button>
              <button
                type="button"
                onClick={handleResetLogs}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[11px] font-medium hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Đặt lại ban đầu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
