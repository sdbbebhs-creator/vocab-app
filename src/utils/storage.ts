import { VocabItem, GrammarItem, SyncConfig } from '../types';
import { getTodayDate, State } from './fsrs';

const DB_NAME = 'SmartReviewDB_v2';
const DB_VERSION = 1;
const VOCAB_STORE = 'vocab_items';
const GRAMMAR_STORE = 'grammar_items';
const CONFIG_STORE = 'app_config';

const LOCAL_STORAGE_KEY_VOCAB = 'vocab_data_v2_backup';
const LOCAL_STORAGE_KEY_GRAMMAR = 'grammar_data_v2_backup';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const timer = setTimeout(() => {
      reject(new Error('IndexedDB open timeout'));
    }, 1200);

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onblocked = () => {
        clearTimeout(timer);
        reject(new Error('IndexedDB blocked'));
      };
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(VOCAB_STORE)) {
          db.createObjectStore(VOCAB_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(GRAMMAR_STORE)) {
          db.createObjectStore(GRAMMAR_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(CONFIG_STORE)) {
          db.createObjectStore(CONFIG_STORE, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => {
        clearTimeout(timer);
        resolve(request.result);
      };
      request.onerror = () => {
        clearTimeout(timer);
        reject(request.error || new Error('IndexedDB request error'));
      };
    } catch (err) {
      clearTimeout(timer);
      reject(err);
    }
  });
}

/**
 * Đảm bảo mọi thẻ khi tải lên đều sở hữu đủ 8 trường FSRS chuẩn
 */
export function ensureFSRSCard<T extends VocabItem | GrammarItem>(item: any): T {
  const reps = typeof item.reps === 'number' ? item.reps : (item.repetition || 0);
  const scheduledDays = typeof item.scheduled_days === 'number' ? item.scheduled_days : (item.interval || 0);
  const state = typeof item.state === 'number' ? item.state : (reps > 0 ? State.Review : State.New);

  return {
    ...item,
    stability: typeof item.stability === 'number' ? item.stability : 0,
    difficulty: typeof item.difficulty === 'number' ? item.difficulty : 0,
    elapsed_days: typeof item.elapsed_days === 'number' ? item.elapsed_days : 0,
    scheduled_days: scheduledDays,
    reps,
    lapses: typeof item.lapses === 'number' ? item.lapses : 0,
    state,
    last_review: item.last_review || item.lastReviewed,
    next_review: item.next_review || (item.reviewDate ? new Date(`${item.reviewDate}T00:00:00`).toISOString() : new Date().toISOString()),
    reviewDate: item.reviewDate || getTodayDate(),

    // Tương thích ngược
    repetition: reps,
    interval: scheduledDays,
    easeFactor: item.easeFactor || 2.5,

    // 5 Ngữ Cảnh Output Requirement
    completedContextsCount: typeof item.completedContextsCount === 'number' ? item.completedContextsCount : 0,
    contextOutputs: item.contextOutputs || {},
    lastOutputDate: item.lastOutputDate,
  } as T;
}

export const ensureFSRSVocab = (item: any): VocabItem => ensureFSRSCard<VocabItem>(item);
export const ensureFSRSGrammar = (item: any): GrammarItem => ensureFSRSCard<GrammarItem>(item);

export async function getAllVocab(): Promise<VocabItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve(getLocalVocabFallback().map(ensureFSRSVocab));
      }, 1500);

      try {
        const tx = db.transaction(VOCAB_STORE, 'readonly');
        const store = tx.objectStore(VOCAB_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          clearTimeout(timer);
          const result = (req.result as VocabItem[]) || [];
          if (result.length > 0) {
            resolve(result.map(ensureFSRSVocab));
          } else {
            resolve(getLocalVocabFallback().map(ensureFSRSVocab));
          }
        };
        req.onerror = () => {
          clearTimeout(timer);
          resolve(getLocalVocabFallback().map(ensureFSRSVocab));
        };
      } catch {
        clearTimeout(timer);
        resolve(getLocalVocabFallback().map(ensureFSRSVocab));
      }
    });
  } catch {
    return getLocalVocabFallback().map(ensureFSRSVocab);
  }
}

export async function getAllGrammar(): Promise<GrammarItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve(getLocalGrammarFallback().map(ensureFSRSGrammar));
      }, 1500);

      try {
        const tx = db.transaction(GRAMMAR_STORE, 'readonly');
        const store = tx.objectStore(GRAMMAR_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          clearTimeout(timer);
          const result = (req.result as GrammarItem[]) || [];
          if (result.length > 0) {
            resolve(result.map(ensureFSRSGrammar));
          } else {
            resolve(getLocalGrammarFallback().map(ensureFSRSGrammar));
          }
        };
        req.onerror = () => {
          clearTimeout(timer);
          resolve(getLocalGrammarFallback().map(ensureFSRSGrammar));
        };
      } catch {
        clearTimeout(timer);
        resolve(getLocalGrammarFallback().map(ensureFSRSGrammar));
      }
    });
  } catch {
    return getLocalGrammarFallback().map(ensureFSRSGrammar);
  }
}

function getLocalVocabFallback(): VocabItem[] {
  try {
    const s = localStorage.getItem(LOCAL_STORAGE_KEY_VOCAB);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

function getLocalGrammarFallback(): GrammarItem[] {
  try {
    const s = localStorage.getItem(LOCAL_STORAGE_KEY_GRAMMAR);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

export async function saveAllVocab(items: VocabItem[]): Promise<void> {
  const normalized = items.map(ensureFSRSCard);
  try {
    const lightweight = normalized.map(item => {
      if (item.imageUrl && item.imageUrl.length > 200000) {
        return { ...item, imageUrl: '[IndexedDB-stored]' };
      }
      if (item.audioUrl && item.audioUrl.length > 200000) {
        return { ...item, audioUrl: '[IndexedDB-stored]' };
      }
      return item;
    });
    localStorage.setItem(LOCAL_STORAGE_KEY_VOCAB, JSON.stringify(lightweight));
  } catch {}

  try {
    const db = await openDB();
    const tx = db.transaction(VOCAB_STORE, 'readwrite');
    const store = tx.objectStore(VOCAB_STORE);
    store.clear();
    for (const item of normalized) {
      store.put(item);
    }
  } catch (err) {
    console.error('Error saving vocab to IndexedDB', err);
  }
}

export async function saveAllGrammar(items: GrammarItem[]): Promise<void> {
  const normalized = items.map(ensureFSRSCard);
  try {
    const lightweight = normalized.map(item => {
      if (item.imageUrl && item.imageUrl.length > 200000) {
        return { ...item, imageUrl: '[IndexedDB-stored]' };
      }
      return item;
    });
    localStorage.setItem(LOCAL_STORAGE_KEY_GRAMMAR, JSON.stringify(lightweight));
  } catch {}

  try {
    const db = await openDB();
    const tx = db.transaction(GRAMMAR_STORE, 'readwrite');
    const store = tx.objectStore(GRAMMAR_STORE);
    store.clear();
    for (const item of normalized) {
      store.put(item);
    }
  } catch (err) {
    console.error('Error saving grammar to IndexedDB', err);
  }
}

export function exportBackup(vocab: VocabItem[], grammar: GrammarItem[]): string {
  const data = {
    version: '3.0-FSRS',
    appName: 'Ôn Tập Thông Minh FSRS',
    exportDate: new Date().toISOString(),
    vocab: vocab.map(ensureFSRSVocab),
    grammar: grammar.map(ensureFSRSGrammar),
  };
  return JSON.stringify(data, null, 2);
}

export function getSampleData(): { vocab: VocabItem[]; grammar: GrammarItem[] } {
  const today = getTodayDate();
  
  const sampleVocab: any[] = [
    {
      id: 'sample-1',
      word: 'Resilient',
      phonetic: '/rɪˈzɪliənt/',
      meaning: 'Kiên cường, bền bỉ, có khả năng phục hồi nhanh chóng sau khó khăn',
      type: 'adj',
      topic: 'Tính cách & Đời sống',
      example: 'She is a resilient woman who always bounces back from adversity.',
      exampleVi: 'Cô ấy là một người phụ nữ kiên cường, luôn vượt qua mọi nghịch cảnh.',
      imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80',
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: State.New,
      reviewDate: today,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sample-2',
      word: 'Serendipity',
      phonetic: '/ˌser.ənˈdɪp.ə.t̬i/',
      meaning: 'Sự tình cờ may mắn, sự run rủi đem lại điều tốt lành bất ngờ',
      type: 'n',
      topic: 'Từ vựng hay',
      example: 'Finding my childhood friend in Tokyo was pure serendipity.',
      exampleVi: 'Gặp lại người bạn thời thơ ấu ở Tokyo thực sự là một sự tình cờ may mắn tuyệt vời.',
      imageUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&auto=format&fit=crop&q=80',
      stability: 2.3,
      difficulty: 4.8,
      elapsed_days: 2,
      scheduled_days: 2,
      reps: 1,
      lapses: 0,
      state: State.Learning,
      last_review: new Date(Date.now() - 2 * 86400000).toISOString(),
      reviewDate: today,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sample-3',
      word: 'Meticulous',
      phonetic: '/məˈtɪk.jə.ləs/',
      meaning: 'Tỉ mỉ, cẩn thận từng chi tiết nhỏ, chu đáo',
      type: 'adj',
      topic: 'Công việc',
      example: 'He gave meticulous attention to every single detail in the report.',
      exampleVi: 'Anh ấy dành sự chú ý tỉ mỉ cho từng chi tiết nhỏ trong bản báo cáo.',
      imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&auto=format&fit=crop&q=80',
      stability: 6.5,
      difficulty: 3.5,
      elapsed_days: 5,
      scheduled_days: 5,
      reps: 2,
      lapses: 0,
      state: State.Review,
      last_review: new Date(Date.now() - 5 * 86400000).toISOString(),
      reviewDate: today,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sample-4',
      word: 'Ubiquitous',
      phonetic: '/juːˈbɪk.wə.t̬əs/',
      meaning: 'Có mặt ở khắp mọi nơi, phổ biến rộng rãi',
      type: 'adj',
      topic: 'Công nghệ & Xã hội',
      example: 'Smartphones have become ubiquitous in modern daily life.',
      exampleVi: 'Điện thoại thông minh đã trở nên phổ biến khắp mọi nơi trong cuộc sống hiện đại.',
      imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: State.New,
      reviewDate: today,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sample-5',
      word: 'Lucid',
      phonetic: '/ˈluː.sɪd/',
      meaning: 'Rõ ràng, minh bạch, dễ hiểu, minh mẫn',
      type: 'adj',
      topic: 'Giao tiếp',
      example: 'The professor gave a lucid explanation of complex quantum physics.',
      exampleVi: 'Giáo sư đã đưa ra lời giải thích vô cùng rõ ràng về vật lý lượng tử phức tạp.',
      imageUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=80',
      stability: 14.2,
      difficulty: 2.1,
      elapsed_days: 12,
      scheduled_days: 12,
      reps: 3,
      lapses: 0,
      state: State.Review,
      last_review: new Date(Date.now() - 12 * 86400000).toISOString(),
      reviewDate: today,
      createdAt: new Date().toISOString(),
    }
  ];

  const sampleGrammar: any[] = [
    {
      id: 'sample-g-1',
      title: 'Thì Hiện Tại Hoàn Thành (Present Perfect)',
      type: 'Thì (Tense)',
      formula: 'S + have / has + V3/ed (+ O)',
      explanation: 'Diễn tả hành động đã xảy ra trong quá khứ nhưng để lại kết quả ở hiện tại, hoặc trải nghiệm tính đến thời điểm nói.',
      example: 'I have lived in this city for over five years.',
      exampleVi: 'Tôi đã sống ở thành phố này được hơn năm năm rồi (và hiện tại vẫn sống ở đây).',
      stability: 3.2,
      difficulty: 4.0,
      elapsed_days: 2,
      scheduled_days: 2,
      reps: 1,
      lapses: 0,
      state: State.Learning,
      last_review: new Date(Date.now() - 2 * 86400000).toISOString(),
      reviewDate: today,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sample-g-2',
      title: 'Câu Điều Kiện Loại 2 (Conditional Type 2)',
      type: 'Cấu trúc (Structure)',
      formula: 'If + S + V2/ed (were), S + would/could + V-inf',
      explanation: 'Diễn tả một giả định trái ngược với thực tế ở hiện tại hoặc tương lai (không có thật lúc nói).',
      example: 'If I had more free time, I would travel around the world.',
      exampleVi: 'Nếu tôi có nhiều thời gian rảnh hơn, tôi sẽ đi du lịch khắp thế giới (thực tế hiện tại tôi rất bận).',
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: State.New,
      reviewDate: today,
      createdAt: new Date().toISOString(),
    }
  ];

  return {
    vocab: sampleVocab.map((v) => ensureFSRSCard<VocabItem>(v)),
    grammar: sampleGrammar.map((g) => ensureFSRSCard<GrammarItem>(g)),
  };
}

// ============================================================================
// MEMORY LOGS & FSRS OPTIMIZATION STORAGE
// ============================================================================

const MEMORY_LOGS_KEY = 'smartreview_memory_logs_v2';
const FSRS_USER_CONFIG_KEY = 'smartreview_fsrs_user_config_v2';

import { ReviewLog, FSRSOptimizerResult, FSRSUserConfig } from '../types';
import { getActiveTargetRetention, setActiveTargetRetention } from './fsrs';

/**
 * Lưu 1 lượt review vào Memory Logs
 */
export function saveReviewLog(log: ReviewLog): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getReviewLogs();
    existing.push(log);
    // Lưu tối đa 20,000 logs gần nhất để tối ưu dung lượng localStorage
    const trimmed = existing.length > 20000 ? existing.slice(-20000) : existing;
    localStorage.setItem(MEMORY_LOGS_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('Lỗi lưu Review Log:', err);
  }
}

/**
 * Lấy danh sách toàn bộ Memory Logs
 */
export function getReviewLogs(): ReviewLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MEMORY_LOGS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Lấy cấu hình FSRS cá nhân của người dùng
 */
export function getUserFSRSConfig(): FSRSUserConfig {
  const defaultTarget = getActiveTargetRetention();
  const defaultConfig: FSRSUserConfig = {
    targetRetention: defaultTarget,
    userGoal: 'Ghi nhớ chắc chắn nhất (>90%)',
  };

  if (typeof window === 'undefined') return defaultConfig;
  try {
    const raw = localStorage.getItem(FSRS_USER_CONFIG_KEY);
    if (!raw) return defaultConfig;
    const parsed = JSON.parse(raw);
    return {
      targetRetention: typeof parsed.targetRetention === 'number' && parsed.targetRetention >= 0.90 ? parsed.targetRetention : defaultTarget,
      userGoal: parsed.userGoal || 'Ghi nhớ chắc chắn nhất (>90%)',
      lastOptimizedAt: parsed.lastOptimizedAt,
      lastOptimizationResult: parsed.lastOptimizationResult,
    };
  } catch {
    return defaultConfig;
  }
}

/**
 * Lưu cấu hình FSRS cá nhân của người dùng
 */
export function saveUserFSRSConfig(config: Partial<FSRSUserConfig>): FSRSUserConfig {
  const current = getUserFSRSConfig();
  const updated: FSRSUserConfig = {
    ...current,
    ...config,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(FSRS_USER_CONFIG_KEY, JSON.stringify(updated));
      if (typeof config.targetRetention === 'number') {
        setActiveTargetRetention(config.targetRetention);
      }
    } catch (err) {
      console.warn('Lỗi lưu FSRS User Config:', err);
    }
  }

  return updated;
}

/**
 * Tính toán thống kê Memory Logs thực tế cho Prompt AI Optimize FSRS
 */
export function getMemoryLogsStats(
  vocabList: VocabItem[] = [],
  grammarList: GrammarItem[] = []
): {
  total_reviews: number;
  actual_retention: number;
  target_retention: number;
  daily_cards: number;
  user_goal: string;
  isEligible: boolean;
  activeLogsCount: number;
} {
  const logs = getReviewLogs();
  const config = getUserFSRSConfig();

  // Tính tổng số lượt ôn tập đã thực hiện:
  // Nếu có logs thực tế -> dùng logs.length.
  // Đồng thời cộng dồn số reps hiện có từ các thẻ đã học.
  const cardsRepsTotal = [...vocabList, ...grammarList].reduce(
    (acc, item) => acc + (item.reps || item.repetition || 0),
    0
  );

  const total_reviews = Math.max(logs.length, cardsRepsTotal, 14);

  // Tính tỷ lệ ghi nhớ thực tế hiện tại (% Good / Easy):
  let actual_retention = 88.5;
  if (logs.length > 0) {
    const goodEasyCount = logs.filter((l) => l.rating === 3 || l.rating === 4).length;
    actual_retention = Number(((goodEasyCount / logs.length) * 100).toFixed(1));
  } else {
    // Ước tính từ lapses vs reps
    const totalLapses = [...vocabList, ...grammarList].reduce(
      (acc, item) => acc + (item.lapses || 0),
      0
    );
    if (cardsRepsTotal > 0) {
      const recallRate = Math.max(70, Math.min(98, 100 - (totalLapses / cardsRepsTotal) * 100));
      actual_retention = Number(recallRate.toFixed(1));
    }
  }

  // Target retention tính theo % (ví dụ: 90)
  const target_retention = Math.round((config.targetRetention || getActiveTargetRetention()) * 100);

  // Số lượng thẻ học trung bình/ngày:
  let daily_cards = 25;
  if (logs.length > 0) {
    const daysSet = new Set(logs.map((l) => l.timestamp.slice(0, 10)));
    const activeDays = Math.max(1, daysSet.size);
    daily_cards = Math.max(5, Math.round(logs.length / activeDays));
  } else {
    const totalItems = vocabList.length + grammarList.length;
    daily_cards = Math.max(10, Math.min(50, Math.round(totalItems * 0.4)));
  }

  return {
    total_reviews,
    actual_retention,
    target_retention,
    daily_cards,
    user_goal: config.userGoal || 'Học dài hạn / Bền vững',
    isEligible: total_reviews >= 1000,
    activeLogsCount: logs.length,
  };
}

/**
 * Tạo dữ liệu mẫu Memory Logs để người dùng có thể thử nghiệm tính năng Cold Start (< 1000) hoặc Đủ điều kiện (>= 1000)
 */
export function seedSampleMemoryLogs(targetCount: number = 1050): void {
  if (typeof window === 'undefined') return;
  const sampleLogs: ReviewLog[] = [];
  const ratingsPool: (1 | 2 | 3 | 4)[] = [3, 3, 3, 4, 3, 4, 2, 3, 1, 3, 4, 3, 2, 4]; // ~85-90% Good/Easy

  const now = Date.now();
  for (let i = 0; i < targetCount; i++) {
    const daysAgo = Math.floor((targetCount - i) / 25);
    const date = new Date(now - daysAgo * 86400000 - Math.random() * 36000000);
    const rating = ratingsPool[i % ratingsPool.length];
    sampleLogs.push({
      itemId: `item-${(i % 50) + 1}`,
      itemType: i % 4 === 0 ? 'grammar' : 'vocab',
      rating,
      timestamp: date.toISOString(),
      prevScheduledDays: Math.max(1, Math.floor(i / 15)),
      nextScheduledDays: Math.max(2, Math.floor(i / 10) + 1),
      stability: Number((2 + (i / targetCount) * 15).toFixed(1)),
      difficulty: Number((4.5 - (i / targetCount) * 1.5).toFixed(1)),
      state: 2,
    });
  }

  localStorage.setItem(MEMORY_LOGS_KEY, JSON.stringify(sampleLogs));
}

/**
 * Xóa Memory Logs về mặc định
 */
export function resetMemoryLogs(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(MEMORY_LOGS_KEY);
}
