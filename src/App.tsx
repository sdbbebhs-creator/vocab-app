import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './utils/supabaseClient';
import { fetchRemoteData, pushRemoteData } from './utils/syncClient';
import { AuthScreen } from './components/AuthScreen';
import { Calendar, Layers, BookOpen, FileText, BarChart3, Plus, CheckCircle2, Brain, Gamepad2 } from 'lucide-react';
import { VocabItem, GrammarItem, ReviewRating } from './types';
import {
  getTodayDate,
  addDays,
  diffDays,
  createDefaultFSRSCard,
  updateCardFSRS,
} from './utils/fsrs';
import {
  getAllVocab,
  getAllGrammar,
  saveAllVocab,
  saveAllGrammar,
  getSampleData,
  ensureFSRSVocab,
  ensureFSRSGrammar,
  saveReviewLog,
} from './utils/storage';
import { Navbar } from './components/Navbar';
import { DailyReviewTab } from './components/DailyReviewTab';
import { FlashcardTab } from './components/FlashcardTab';
import { VocabListTab } from './components/VocabListTab';
import { GrammarListTab } from './components/GrammarListTab';
import { StatsTab } from './components/StatsTab';
import { FSRSGuideTab } from './components/FSRSGuideTab';
import { GameHubTab } from './components/games/GameHubTab';
import { AddEditModal } from './components/AddEditModal';
import { BackupModal } from './components/BackupModal';
import { ImageLightboxModal } from './components/ImageLightboxModal';
import { FireCelebrationOverlay } from './components/FireCelebrationOverlay';
import { ContextOutputModal } from './components/ContextOutputModal';
import { FSRSOptimizerModal } from './components/FSRSOptimizerModal';
import { RankModal } from './components/RankModal';
import { UserRankData, RankTierDefinition } from './types';
import {
  getUserRankData,
  checkDailyRankDecay,
  recordStudyForRank,
  recordAllCardsCompletedForRank,
  getRankTierByKey,
  getRankDefenseProgress,
} from './utils/rankSystem';

type TabType = 'review' | 'flashcard' | 'vocab' | 'grammar' | 'games' | 'stats' | 'fsrs-guide';

function getInitialVocab(): VocabItem[] {
  try {
    const local = localStorage.getItem('vocab_data_v2_backup');
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(ensureFSRSVocab);
      }
    }
  } catch (e) {
    console.warn('localStorage read error:', e);
  }
  return [];
}

function getInitialGrammar(): GrammarItem[] {
  try {
    const local = localStorage.getItem('grammar_data_v2_backup');
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(ensureFSRSGrammar);
      }
    }
  } catch (e) {
    console.warn('localStorage read error:', e);
  }
  return [];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('review');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [vocabList, setVocabList] = useState<VocabItem[]>(getInitialVocab);
  const [grammarList, setGrammarList] = useState<GrammarItem[]>(getInitialGrammar);

  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const hasSyncedInitialData = useRef(false);
  const syncDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track Supabase auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        hasSyncedInitialData.current = false;
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // On login: pull remote data, merge with local, push merged result back
  useEffect(() => {
    if (!session || hasSyncedInitialData.current) return;
    hasSyncedInitialData.current = true;

    (async () => {
      const remote = await fetchRemoteData();
      if (!remote) return;

      const mergeById = <T extends { id: string }>(local: T[], remoteItems: T[]): T[] => {
        const map = new Map<string, T>();
        remoteItems.forEach((item) => map.set(item.id, item));
        local.forEach((item) => map.set(item.id, item));
        return Array.from(map.values());
      };

      const mergedVocab = mergeById(vocabList, remote.vocab);
      const mergedGrammar = mergeById(grammarList, remote.grammar);

      setVocabList(mergedVocab);
      setGrammarList(mergedGrammar);
      saveAllVocab(mergedVocab);
      saveAllGrammar(mergedGrammar);
      pushRemoteData(mergedVocab, mergedGrammar);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, [session]);

  // Debounced push of local changes to remote storage while logged in
  useEffect(() => {
    if (!session || !hasSyncedInitialData.current) return;

    if (syncDebounceTimer.current) clearTimeout(syncDebounceTimer.current);
    syncDebounceTimer.current = setTimeout(() => {
      pushRemoteData(vocabList, grammarList);
    }, 1500);

    return () => {
      if (syncDebounceTimer.current) clearTimeout(syncDebounceTimer.current);
    };
  }, [session, vocabList, grammarList]);

  const handleSwitchTab = useCallback((tab: TabType) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Ensure whenever activeTab changes, the viewport scrolls immediately to top
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  // Harmonious Dark Theme State (defaults to true as requested)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('theme_mode');
      if (saved) return saved === 'dark';
    } catch {}
    return true; // Default to dark mode
  });

  useEffect(() => {
    try {
      localStorage.setItem('theme_mode', isDarkMode ? 'dark' : 'light');
    } catch {}
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    type: 'vocab' | 'grammar';
    data: VocabItem | GrammarItem;
  } | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; caption?: string } | null>(null);
  
  // Fire Celebration & Animated Rank Bar Fill Config
  const [fireCelebrationConfig, setFireCelebrationConfig] = useState<{
    isOpen: boolean;
    mode: 'rank-defense' | 'streak' | 'rank-up';
    rankData?: UserRankData;
    targetCards?: number;
    reviewedCards?: number;
    startPercent?: number;
    newTier?: RankTierDefinition;
  }>({
    isOpen: false,
    mode: 'rank-defense',
  });

  const [contextModalItem, setContextModalItem] = useState<VocabItem | GrammarItem | null>(null);
  const [showFSRSOptimizer, setShowFSRSOptimizer] = useState<boolean>(false);

  // Streak & Rank System (Default streak is 0 as requested)
  const [rankData, setRankData] = useState<UserRankData>(getUserRankData);
  const [streakCount, setStreakCount] = useState<number>(() => {
    const init = getUserRankData();
    return init.streakCount ?? 0;
  });
  const [isStreakJumping, setIsStreakJumping] = useState<boolean>(false);
  const [isRankModalOpen, setIsRankModalOpen] = useState<boolean>(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Update streak and EXP for Rank when an item is reviewed or output is submitted
  const recordStudyActivity = useCallback((rating?: ReviewRating, isContextOutput = false) => {
    const today = getTodayDate();
    const result = recordStudyForRank({ rating, isContextOutput, todayDate: today });

    setRankData(result.rankData);
    setStreakCount(result.rankData.streakCount);

    // Kích hoạt hiệu ứng lửa nhảy ăn mừng ở Navbar
    setIsStreakJumping(true);
    setTimeout(() => setIsStreakJumping(false), 1400);

    const tier = getRankTierByKey(result.rankData.tierKey);

    if (result.rankUp && result.newTier) {
      showToast(`🎉 THĂNG HẠNG: Chúc mừng bạn đã lên Rank ${result.newTier.nameVi} (${result.newTier.titleVi})! +${result.expGained} EXP`);
      setFireCelebrationConfig({
        isOpen: true,
        mode: 'rank-up',
        rankData: result.rankData,
        newTier: result.newTier,
        startPercent: result.prevProgressPercent,
        targetCards: result.targetCards,
        reviewedCards: result.rankData.todayReviewedCount,
      });
    } else {
      showToast(`🔥 +${result.expGained} EXP · Chuỗi ${result.rankData.streakCount} ngày · Cần hoàn thành tất cả lịch thẻ để bảo vệ Rank ${tier.nameVi}!`);
    }
  }, []);

  // Callback to update completed context outputs for both Vocab and Grammar
  const handleCompleteContexts = useCallback((itemId: string, outputs: Record<number, string>, kind: 'vocab' | 'grammar') => {
    const count = Object.values(outputs).filter((s) => s && s.trim().length > 0).length;

    if (kind === 'vocab') {
      setVocabList((prev) => {
        const updated = prev.map((v) => {
          if (v.id === itemId) {
            return {
              ...v,
              completedContextsCount: count,
              contextOutputs: outputs,
              lastOutputDate: selectedDate,
            };
          }
          return v;
        });
        saveAllVocab(updated);
        return updated;
      });
    } else {
      setGrammarList((prev) => {
        const updated = prev.map((g) => {
          if (g.id === itemId) {
            return {
              ...g,
              completedContextsCount: count,
              contextOutputs: outputs,
              lastOutputDate: selectedDate,
            };
          }
          return g;
        });
        saveAllGrammar(updated);
        return updated;
      });
    }

    setContextModalItem((prev) => {
      if (prev && prev.id === itemId) {
        return {
          ...prev,
          completedContextsCount: count,
          contextOutputs: outputs,
          lastOutputDate: selectedDate,
        } as VocabItem | GrammarItem;
      }
      return prev;
    });

    if (count >= 5) {
      recordStudyActivity(undefined, true);
    }
  }, [selectedDate, recordStudyActivity]);

  // Background DB sync and daily rank maintenance check
  useEffect(() => {
    async function loadData() {
      try {
        const loadedVocab = await getAllVocab();
        const loadedGrammar = await getAllGrammar();

        if (loadedVocab.length > 0 || loadedGrammar.length > 0) {
          setVocabList(loadedVocab);
          setGrammarList(loadedGrammar);
        }

        // Daily Rank & Streak Maintenance check
        const today = getTodayDate();
        const decayResult = checkDailyRankDecay(today);
        setRankData(decayResult.rankData);
        setStreakCount(decayResult.rankData.streakCount);

        if (decayResult.decayed) {
          showToast(`⚠️ Bỏ lỡ ngày học: Chuỗi lửa reset về 0 và rank tụt xuống ${getRankTierByKey(decayResult.rankData.tierKey).nameVi}!`);
        } else if (decayResult.shieldUsed) {
          showToast(`🛡️ Khiên bảo vệ đã tự động kích hoạt để giữ vững Rank & Chuỗi lửa cho bạn!`);
        }
      } catch (err) {
        console.error('Failed to load DB data in background:', err);
      }
    }

    loadData();
  }, []);

  // Rate a Vocab item with FSRS
  const handleRateVocab = useCallback(
    (id: string, rating: ReviewRating) => {
      const updatedVocabList = vocabList.map((item) => {
        if (item.id === id) {
          const { updatedCard } = updateCardFSRS(item, rating);
          saveReviewLog({
            itemId: id,
            itemType: 'vocab',
            rating,
            timestamp: new Date().toISOString(),
            prevScheduledDays: item.scheduled_days || item.interval || 0,
            nextScheduledDays: updatedCard.scheduled_days || updatedCard.interval || 1,
            stability: updatedCard.stability || 0,
            difficulty: updatedCard.difficulty || 0,
            state: updatedCard.state || 2,
          });
          return {
            ...updatedCard,
            lastOutputDate: item.lastOutputDate || selectedDate,
          };
        }
        return item;
      });

      setVocabList(updatedVocabList);
      saveAllVocab(updatedVocabList);

      // Check remaining due cards across both vocab and grammar for the selected day
      const remainingVocab = updatedVocabList.filter((item) => item.reviewDate <= selectedDate).length;
      const remainingGrammar = grammarList.filter((item) => item.reviewDate <= selectedDate).length;
      const totalRemaining = remainingVocab + remainingGrammar;

      if (totalRemaining === 0) {
        // Hoàn thành TẤT CẢ lịch thẻ ngày hôm đó: mới được + streak và bảo vệ rank!
        const result = recordAllCardsCompletedForRank({
          todayDate: selectedDate,
          cardsReviewedCount: 1,
        });

        setRankData(result.rankData);
        setStreakCount(result.rankData.streakCount);

        setIsStreakJumping(true);
        setTimeout(() => setIsStreakJumping(false), 1400);

        const tier = getRankTierByKey(result.rankData.tierKey);

        // Hiệu ứng bốc lửa bảo vệ rank chỉ hiện lên 1 lần khi làm xong!
        if (result.shouldShowCelebration) {
          setFireCelebrationConfig({
            isOpen: true,
            mode: result.rankUp ? 'rank-up' : 'rank-defense',
            rankData: result.rankData,
            newTier: result.newTier,
            targetCards: 1,
            reviewedCards: 1,
            startPercent: 0,
          });
        }

        if (result.rankUp && result.newTier) {
          showToast(`🎉 THĂNG HẠNG: Chúc mừng bạn đã lên Rank ${result.newTier.nameVi} (${result.newTier.titleVi})! Đã hoàn thành tất cả lịch thẻ hôm nay! +${result.expGained} EXP`);
        } else if (result.justProtectedRank) {
          showToast(`🔥 HOÀN THÀNH TẤT CẢ LỊCH THẺ HÔM NAY! ĐÃ BẢO VỆ RANK ${tier.nameVi.toUpperCase()} & +1 CHUỖI LỬA! +${result.expGained} EXP`);
        } else {
          showToast(`🔥 Đã hoàn thành tất cả lịch thẻ hôm nay! +${result.expGained} EXP`);
        }
      } else {
        // Còn thẻ chưa hoàn thành: chưa tăng streak và chưa bảo vệ rank
        recordStudyActivity(rating);
        showToast(`Đã ôn 1 từ vựng! Còn ${totalRemaining} thẻ (V:${remainingVocab}, G:${remainingGrammar}) cần ôn để bảo vệ Rank & tăng chuỗi!`);
      }
    },
    [vocabList, grammarList, selectedDate, recordStudyActivity]
  );

  // Rate a Grammar item with FSRS
  const handleRateGrammar = useCallback(
    (id: string, rating: ReviewRating) => {
      const updatedGrammarList = grammarList.map((item) => {
        if (item.id === id) {
          const { updatedCard } = updateCardFSRS(item, rating);
          saveReviewLog({
            itemId: id,
            itemType: 'grammar',
            rating,
            timestamp: new Date().toISOString(),
            prevScheduledDays: item.scheduled_days || item.interval || 0,
            nextScheduledDays: updatedCard.scheduled_days || updatedCard.interval || 1,
            stability: updatedCard.stability || 0,
            difficulty: updatedCard.difficulty || 0,
            state: updatedCard.state || 2,
          });
          return {
            ...updatedCard,
            lastOutputDate: item.lastOutputDate || selectedDate,
          };
        }
        return item;
      });

      setGrammarList(updatedGrammarList);
      saveAllGrammar(updatedGrammarList);

      // Check remaining due cards across both vocab and grammar for the selected day
      const remainingVocab = vocabList.filter((item) => item.reviewDate <= selectedDate).length;
      const remainingGrammar = updatedGrammarList.filter((item) => item.reviewDate <= selectedDate).length;
      const totalRemaining = remainingVocab + remainingGrammar;

      if (totalRemaining === 0) {
        // Hoàn thành TẤT CẢ lịch thẻ ngày hôm đó: mới được + streak và bảo vệ rank!
        const result = recordAllCardsCompletedForRank({
          todayDate: selectedDate,
          cardsReviewedCount: 1,
        });

        setRankData(result.rankData);
        setStreakCount(result.rankData.streakCount);

        setIsStreakJumping(true);
        setTimeout(() => setIsStreakJumping(false), 1400);

        const tier = getRankTierByKey(result.rankData.tierKey);

        // Hiệu ứng bốc lửa bảo vệ rank chỉ hiện lên 1 lần khi làm xong!
        if (result.shouldShowCelebration) {
          setFireCelebrationConfig({
            isOpen: true,
            mode: result.rankUp ? 'rank-up' : 'rank-defense',
            rankData: result.rankData,
            newTier: result.newTier,
            targetCards: 1,
            reviewedCards: 1,
            startPercent: 0,
          });
        }

        if (result.rankUp && result.newTier) {
          showToast(`🎉 THĂNG HẠNG: Chúc mừng bạn đã lên Rank ${result.newTier.nameVi} (${result.newTier.titleVi})! Đã hoàn thành tất cả lịch thẻ hôm nay! +${result.expGained} EXP`);
        } else if (result.justProtectedRank) {
          showToast(`🔥 HOÀN THÀNH TẤT CẢ LỊCH THẺ HÔM NAY! ĐÃ BẢO VỆ RANK ${tier.nameVi.toUpperCase()} & +1 CHUỖI LỬA! +${result.expGained} EXP`);
        } else {
          showToast(`🔥 Đã hoàn thành tất cả lịch thẻ hôm nay! +${result.expGained} EXP`);
        }
      } else {
        recordStudyActivity(rating);
        showToast(`Đã ôn 1 ngữ pháp! Còn ${totalRemaining} thẻ (V:${remainingVocab}, G:${remainingGrammar}) cần ôn để bảo vệ Rank & tăng chuỗi!`);
      }
    },
    [grammarList, vocabList, selectedDate, recordStudyActivity]
  );

  // Batch review all due items
  const handleMarkAllReviewed = useCallback(
    (type: 'vocab' | 'grammar') => {
      if (type === 'vocab') {
        const dueItems = vocabList.filter((item) => item.reviewDate <= selectedDate);
        const dueCount = dueItems.length;
        const updatedVocabList = vocabList.map((item) => {
          if (item.reviewDate <= selectedDate) {
            const { updatedCard } = updateCardFSRS(item, 3);
            return {
              ...updatedCard,
              lastOutputDate: item.lastOutputDate || selectedDate,
            };
          }
          return item;
        });

        setVocabList(updatedVocabList);
        saveAllVocab(updatedVocabList);

        const remainingGrammar = grammarList.filter((item) => item.reviewDate <= selectedDate).length;
        if (remainingGrammar === 0) {
          // Cả từ vựng và ngữ pháp của ngày hôm đó đều đã xong!
          const result = recordAllCardsCompletedForRank({
            todayDate: selectedDate,
            cardsReviewedCount: dueCount,
          });

          setRankData(result.rankData);
          setStreakCount(result.rankData.streakCount);

          setIsStreakJumping(true);
          setTimeout(() => setIsStreakJumping(false), 1400);

          const tier = getRankTierByKey(result.rankData.tierKey);

          if (result.shouldShowCelebration) {
            setFireCelebrationConfig({
              isOpen: true,
              mode: result.rankUp ? 'rank-up' : 'rank-defense',
              rankData: result.rankData,
              newTier: result.newTier,
              targetCards: 1,
              reviewedCards: 1,
              startPercent: 0,
            });
          }

          showToast(`🔥 HOÀN THÀNH TẤT CẢ LỊCH THẺ HÔM NAY! ĐÃ BẢO VỆ RANK ${tier.nameVi.toUpperCase()} & +1 CHUỖI LỬA! +${result.expGained} EXP`);
        } else {
          recordStudyActivity(3);
          showToast(`Đã ôn tất cả từ vựng! Còn ${remainingGrammar} điểm ngữ pháp cần hoàn thành để bảo vệ Rank & tăng chuỗi!`);
        }
      } else {
        const dueItems = grammarList.filter((item) => item.reviewDate <= selectedDate);
        const dueCount = dueItems.length;
        const updatedGrammarList = grammarList.map((item) => {
          if (item.reviewDate <= selectedDate) {
            const { updatedCard } = updateCardFSRS(item, 3);
            return {
              ...updatedCard,
              lastOutputDate: item.lastOutputDate || selectedDate,
            };
          }
          return item;
        });

        setGrammarList(updatedGrammarList);
        saveAllGrammar(updatedGrammarList);

        const remainingVocab = vocabList.filter((item) => item.reviewDate <= selectedDate).length;
        if (remainingVocab === 0) {
          // Cả từ vựng và ngữ pháp của ngày hôm đó đều đã xong!
          const result = recordAllCardsCompletedForRank({
            todayDate: selectedDate,
            cardsReviewedCount: dueCount,
          });

          setRankData(result.rankData);
          setStreakCount(result.rankData.streakCount);

          setIsStreakJumping(true);
          setTimeout(() => setIsStreakJumping(false), 1400);

          const tier = getRankTierByKey(result.rankData.tierKey);

          if (result.shouldShowCelebration) {
            setFireCelebrationConfig({
              isOpen: true,
              mode: result.rankUp ? 'rank-up' : 'rank-defense',
              rankData: result.rankData,
              newTier: result.newTier,
              targetCards: 1,
              reviewedCards: 1,
              startPercent: 0,
            });
          }

          showToast(`🔥 HOÀN THÀNH TẤT CẢ LỊCH THẺ HÔM NAY! ĐÃ BẢO VỆ RANK ${tier.nameVi.toUpperCase()} & +1 CHUỖI LỬA! +${result.expGained} EXP`);
        } else {
          recordStudyActivity(3);
          showToast(`Đã ôn tất cả ngữ pháp! Còn ${remainingVocab} từ vựng cần hoàn thành để bảo vệ Rank & tăng chuỗi!`);
        }
      }
    },
    [vocabList, grammarList, selectedDate, recordStudyActivity]
  );

  // Save new or edited Vocab
  const handleSaveVocab = (itemData: Partial<VocabItem>) => {
    if (itemData.id) {
      // Edit
      setVocabList((prev) => {
        const updated = prev.map((v) => (v.id === itemData.id ? ({ ...v, ...itemData } as VocabItem) : v));
        saveAllVocab(updated);
        return updated;
      });
      showToast('Đã lưu thay đổi từ vựng!');
    } else {
      // Add
      const newItem: VocabItem = {
        ...createDefaultFSRSCard(itemData.reviewDate || getTodayDate()),
        id: `vocab_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        word: itemData.word || '',
        phonetic: itemData.phonetic,
        meaning: itemData.meaning || '',
        type: itemData.type || 'n',
        topic: itemData.topic || 'Chung',
        example: itemData.example,
        exampleVi: itemData.exampleVi,
        imageUrl: itemData.imageUrl,
        audioUrl: itemData.audioUrl,
        createdAt: new Date().toISOString(),
      };
      setVocabList((prev) => {
        const updated = [newItem, ...prev];
        saveAllVocab(updated);
        return updated;
      });
      showToast('Đã thêm từ vựng mới thành công!');
    }
    setEditingItem(null);
  };

  // Save new or edited Grammar
  const handleSaveGrammar = (itemData: Partial<GrammarItem>) => {
    if (itemData.id) {
      setGrammarList((prev) => {
        const updated = prev.map((g) => (g.id === itemData.id ? ({ ...g, ...itemData } as GrammarItem) : g));
        saveAllGrammar(updated);
        return updated;
      });
      showToast('Đã lưu thay đổi ngữ pháp!');
    } else {
      const newItem: GrammarItem = {
        ...createDefaultFSRSCard(itemData.reviewDate || getTodayDate()),
        id: `grammar_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        title: itemData.title || '',
        type: itemData.type || 'Cấu trúc',
        formula: itemData.formula || '',
        explanation: itemData.explanation || '',
        example: itemData.example,
        exampleVi: itemData.exampleVi,
        imageUrl: itemData.imageUrl,
        audioUrl: itemData.audioUrl,
        createdAt: new Date().toISOString(),
      };
      setGrammarList((prev) => {
        const updated = [newItem, ...prev];
        saveAllGrammar(updated);
        return updated;
      });
      showToast('Đã thêm điểm ngữ pháp mới!');
    }
    setEditingItem(null);
  };

  // Delete handlers
  const handleDeleteVocab = (id: string) => {
    let confirmed = true;
    try {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        confirmed = window.confirm('Bạn có chắc chắn muốn xóa từ vựng này không?');
      }
    } catch {
      confirmed = true;
    }
    if (confirmed) {
      setVocabList((prev) => {
        const updated = prev.filter((v) => v.id !== id);
        saveAllVocab(updated);
        return updated;
      });
      showToast('Đã xóa từ vựng.');
    }
  };

  const handleDeleteGrammar = (id: string) => {
    let confirmed = true;
    try {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        confirmed = window.confirm('Bạn có chắc chắn muốn xóa điểm ngữ pháp này không?');
      }
    } catch {
      confirmed = true;
    }
    if (confirmed) {
      setGrammarList((prev) => {
        const updated = prev.filter((g) => g.id !== id);
        saveAllGrammar(updated);
        return updated;
      });
      showToast('Đã xóa điểm ngữ pháp.');
    }
  };

  // Import JSON data
  const handleImportData = (newVocab: VocabItem[], newGrammar: GrammarItem[], mode: 'merge' | 'replace') => {
    if (mode === 'replace') {
      setVocabList(newVocab);
      setGrammarList(newGrammar);
      saveAllVocab(newVocab);
      saveAllGrammar(newGrammar);
    } else {
      // Merge
      const existingVocabIds = new Set(vocabList.map((v) => v.id));
      const mergedVocab = [...vocabList, ...newVocab.filter((v) => !existingVocabIds.has(v.id))];

      const existingGrammarIds = new Set(grammarList.map((g) => g.id));
      const mergedGrammar = [...grammarList, ...newGrammar.filter((g) => !existingGrammarIds.has(g.id))];

      setVocabList(mergedVocab);
      setGrammarList(mergedGrammar);
      saveAllVocab(mergedVocab);
      saveAllGrammar(mergedGrammar);
    }
    showToast('Đã khôi phục dữ liệu thành công!');
  };

  // Load sample pack
  const handleLoadSampleData = () => {
    const sample = getSampleData();
    setVocabList(sample.vocab);
    setGrammarList(sample.grammar);
    saveAllVocab(sample.vocab);
    saveAllGrammar(sample.grammar);
    showToast('Đã nạp bộ dữ liệu mẫu!');
  };

  // Clear all
  const handleClearAllData = () => {
    setVocabList([]);
    setGrammarList([]);
    saveAllVocab([]);
    saveAllGrammar([]);
    showToast('Đã xóa toàn bộ dữ liệu.');
  };

  // Calculate due count badge for today
  const todayDueCount =
    vocabList.filter((v) => v.reviewDate <= getTodayDate()).length +
    grammarList.filter((g) => g.reviewDate <= getTodayDate()).length;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <div
      id="app-root-container"
      className="min-h-screen bg-slate-50/70 dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300"
    >
      {/* Top Navbar */}
      <Navbar
        onOpenAddModal={() => {
          setEditingItem(null);
          setIsAddModalOpen(true);
        }}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenOptimizer={() => setShowFSRSOptimizer(true)}
        onLoadSampleData={handleLoadSampleData}
        hasItems={vocabList.length > 0 || grammarList.length > 0}
        streakCount={streakCount}
        isStreakJumping={isStreakJumping}
        onStreakClick={() => {
          setIsRankModalOpen(true);
        }}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        rankData={rankData}
        onOpenRankModal={() => setIsRankModalOpen(true)}
        userEmail={session.user.email}
        onLogout={() => supabase.auth.signOut()}
      />

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 flex-1 flex flex-col space-y-5 sm:space-y-6">
        {/* Desktop Navigation Tabs Bar */}
        <div className="hidden md:flex bg-white dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs items-center gap-1.5 overflow-x-auto scrollbar-none sticky top-[57px] z-30 backdrop-blur-md">
          <button
            type="button"
            id="tab-btn-review"
            onClick={() => setActiveTab('review')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'review'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar size={16} />
            <span>Ôn tập theo ngày</span>
            {todayDueCount > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                  activeTab === 'review'
                    ? 'bg-white text-emerald-800'
                    : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                {todayDueCount}
              </span>
            )}
          </button>

          <button
            type="button"
            id="tab-btn-flashcard"
            onClick={() => setActiveTab('flashcard')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'flashcard'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers size={16} />
            <span>Thẻ lật</span>
          </button>

          <button
            type="button"
            id="tab-btn-vocab"
            onClick={() => setActiveTab('vocab')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'vocab'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen size={16} />
            <span>Từ vựng ({vocabList.length})</span>
          </button>

          <button
            type="button"
            id="tab-btn-grammar"
            onClick={() => setActiveTab('grammar')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'grammar'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText size={16} />
            <span>Ngữ pháp ({grammarList.length})</span>
          </button>

          <button
            type="button"
            id="tab-btn-games"
            onClick={() => setActiveTab('games')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'games'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Gamepad2 size={16} />
            <span>Đấu trường Game</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
              3D
            </span>
          </button>

          <button
            type="button"
            id="tab-btn-stats"
            onClick={() => setActiveTab('stats')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'stats'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 size={16} />
            <span>Thống kê</span>
          </button>

          <button
            type="button"
            id="tab-btn-fsrs-guide"
            onClick={() => setActiveTab('fsrs-guide')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'fsrs-guide'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Brain size={16} />
            <span>Nguyên lý FSRS</span>
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="flex-1">
          {activeTab === 'review' && (
            <DailyReviewTab
              vocabList={vocabList}
              grammarList={grammarList}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onRateVocab={handleRateVocab}
              onRateGrammar={handleRateGrammar}
              onMarkAllReviewed={handleMarkAllReviewed}
              onEditVocab={(v) => {
                setEditingItem({ type: 'vocab', data: v });
                setIsAddModalOpen(true);
              }}
              onEditGrammar={(g) => {
                setEditingItem({ type: 'grammar', data: g });
                setIsAddModalOpen(true);
              }}
              onDeleteVocab={handleDeleteVocab}
              onDeleteGrammar={handleDeleteGrammar}
              onOpenImageLightbox={(url, cap) => setLightboxImage({ url, caption: cap })}
              onSwitchToFlashcard={() => setActiveTab('flashcard')}
              onSwitchToGames={() => setActiveTab('games')}
              onOpenContextOutputModal={(v) => setContextModalItem(v)}
              rankData={rankData}
              onOpenRankModal={() => setIsRankModalOpen(true)}
            />
          )}

          {activeTab === 'flashcard' && (
            <FlashcardTab
              vocabList={vocabList}
              grammarList={grammarList}
              selectedDate={selectedDate}
              onRateVocab={handleRateVocab}
              onRateGrammar={handleRateGrammar}
              onOpenImageLightbox={(url, cap) => setLightboxImage({ url, caption: cap })}
              onOpenContextOutputModal={(v) => setContextModalItem(v)}
            />
          )}

          {activeTab === 'vocab' && (
            <VocabListTab
              vocabList={vocabList}
              onOpenAddModal={() => {
                setEditingItem(null);
                setIsAddModalOpen(true);
              }}
              onEditVocab={(v) => {
                setEditingItem({ type: 'vocab', data: v });
                setIsAddModalOpen(true);
              }}
              onDeleteVocab={handleDeleteVocab}
              onOpenImageLightbox={(url, cap) => setLightboxImage({ url, caption: cap })}
              onOpenContextOutputModal={(v) => setContextModalItem(v)}
            />
          )}

          {activeTab === 'grammar' && (
            <GrammarListTab
              grammarList={grammarList}
              onOpenAddModal={() => {
                setEditingItem(null);
                setIsAddModalOpen(true);
              }}
              onEditGrammar={(g) => {
                setEditingItem({ type: 'grammar', data: g });
                setIsAddModalOpen(true);
              }}
              onDeleteGrammar={handleDeleteGrammar}
              onOpenImageLightbox={(url, cap) => setLightboxImage({ url, caption: cap })}
              onOpenContextOutputModal={(g) => setContextModalItem(g)}
            />
          )}

          {activeTab === 'games' && (
            <GameHubTab
              vocabList={vocabList}
              grammarList={grammarList}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'stats' && (
            <StatsTab
              vocabList={vocabList}
              grammarList={grammarList}
              streakCount={streakCount}
              onOpenOptimizer={() => setShowFSRSOptimizer(true)}
              rankData={rankData}
              onOpenRankModal={() => setIsRankModalOpen(true)}
            />
          )}

          {activeTab === 'fsrs-guide' && (
            <FSRSGuideTab onOpenOptimizer={() => setShowFSRSOptimizer(true)} />
          )}
        </div>
      </main>

      {/* Mobile Floating Add Button */}
      <div className="fixed bottom-16 right-3.5 z-30 md:hidden">
        <button
          type="button"
          onClick={() => {
            setEditingItem(null);
            setIsAddModalOpen(true);
          }}
          className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-90 text-white shadow-xl shadow-emerald-700/40 flex items-center justify-center transition-all cursor-pointer border-2 border-white dark:border-slate-900"
          aria-label="Thêm mới"
        >
          <Plus size={22} />
        </button>
      </div>

      {/* Mobile Bottom Navigation Bar (Optimized with Safe Area) */}
      <nav
        id="mobile-bottom-nav"
        aria-label="Điều hướng chính"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800/90 shadow-lg px-1 py-1 flex items-center overflow-x-auto scrollbar-none safe-area-pb"
      >
        <button
          type="button"
          onClick={() => setActiveTab('review')}
          className={`flex-1 min-w-[50px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'review'
              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <Calendar size={18} />
            {todayDueCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[15px] h-3.5 px-0.5 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center shadow-xs">
                {todayDueCount > 99 ? '99+' : todayDueCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight truncate">Ôn tập</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('flashcard')}
          className={`flex-1 min-w-[50px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'flashcard'
              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <Layers size={18} />
          <span className="text-[10px] mt-0.5 tracking-tight truncate">Thẻ lật</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vocab')}
          className={`flex-1 min-w-[50px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'vocab'
              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <BookOpen size={18} />
          <span className="text-[10px] mt-0.5 tracking-tight truncate">Từ vựng</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('grammar')}
          className={`flex-1 min-w-[50px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'grammar'
              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <FileText size={18} />
          <span className="text-[10px] mt-0.5 tracking-tight truncate">Ngữ pháp</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('games')}
          className={`flex-1 min-w-[50px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'games'
              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <Gamepad2 size={18} />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight truncate">Game 3D</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stats')}
          className={`flex-1 min-w-[50px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'stats'
              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <BarChart3 size={18} />
          <span className="text-[10px] mt-0.5 tracking-tight truncate">Thống kê</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fsrs-guide')}
          className={`flex-1 min-w-[50px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'fsrs-guide'
              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <Brain size={18} />
          <span className="text-[10px] mt-0.5 tracking-tight truncate">FSRS</span>
        </button>
      </nav>

      {/* Modals */}
      <AddEditModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        onSaveVocab={handleSaveVocab}
        onSaveGrammar={handleSaveGrammar}
        editingItem={editingItem}
        vocabCount={vocabList.length}
        grammarCount={grammarList.length}
        existingTopics={Array.from(new Set([...vocabList.map(v => v.topic).filter(Boolean), ...grammarList.map(g => g.type).filter(Boolean)])) as string[]}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        vocabList={vocabList}
        grammarList={grammarList}
        onImportData={handleImportData}
        onLoadSampleData={handleLoadSampleData}
        onClearAllData={handleClearAllData}
      />

      <ImageLightboxModal
        imageUrl={lightboxImage?.url || null}
        caption={lightboxImage?.caption}
        onClose={() => setLightboxImage(null)}
      />

      {/* Screen Fire Celebration & Animated Filling Rank Bar Overlay */}
      <FireCelebrationOverlay
        isOpen={fireCelebrationConfig.isOpen}
        onClose={() => setFireCelebrationConfig((prev) => ({ ...prev, isOpen: false }))}
        streakCount={streakCount}
        mode={fireCelebrationConfig.mode}
        rankData={fireCelebrationConfig.rankData || rankData}
        targetCards={fireCelebrationConfig.targetCards}
        reviewedCards={fireCelebrationConfig.reviewedCards}
        startPercent={fireCelebrationConfig.startPercent}
        newTier={fireCelebrationConfig.newTier}
        onOpenRankModal={() => {
          setFireCelebrationConfig((prev) => ({ ...prev, isOpen: false }));
          setIsRankModalOpen(true);
        }}
      />

      {/* 5-Context Output Practice Modal */}
      {contextModalItem && (
        <ContextOutputModal
          isOpen={Boolean(contextModalItem)}
          item={contextModalItem}
          itemKind={'formula' in contextModalItem ? 'grammar' : 'vocab'}
          onClose={() => setContextModalItem(null)}
          onCompleteContexts={handleCompleteContexts}
          onRateVocab={handleRateVocab}
          onRateGrammar={handleRateGrammar}
          todayDate={selectedDate}
        />
      )}

      {/* AI FSRS Memory Optimizer Modal */}
      <FSRSOptimizerModal
        isOpen={showFSRSOptimizer}
        onClose={() => setShowFSRSOptimizer(false)}
        vocabList={vocabList}
        grammarList={grammarList}
        onTargetRetentionChanged={(newRetention) => {
          showToast(`🎯 Đã áp dụng mục tiêu ghi nhớ ${Math.round(newRetention * 100)}% vào thuật toán FSRS!`);
        }}
        onShowToast={showToast}
      />

      {/* Rank & Daily Retention Tier Modal */}
      <RankModal
        isOpen={isRankModalOpen}
        onClose={() => setIsRankModalOpen(false)}
        rankData={rankData}
        onRefreshRankData={() => {
          const fresh = getUserRankData();
          setRankData(fresh);
          setStreakCount(fresh.streakCount);
        }}
        onStartReview={() => {
          setActiveTab('review');
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="toast-notification"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs sm:text-sm font-semibold flex items-center gap-2 backdrop-blur-md animate-fade-in"
        >
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
