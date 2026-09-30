import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel, RealtimePostgresChangesPayload, Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';
import type { VocabItem, GrammarItem } from '../types';
import {
  getAllVocab,
  getAllGrammar,
  saveAllVocab,
  saveAllGrammar,
  ensureFSRSVocab,
  ensureFSRSGrammar,
} from '../utils/storage';

/**
 * Cross-device sync for vocab & grammar, backed by Supabase.
 *
 * - `vocab_items` / `grammar_items` (one row per item) are the source of truth.
 *   Only the items that actually changed are upserted/deleted, so two devices
 *   editing different items never overwrite each other.
 * - `study_data` holds a whole-list snapshot of the same data as a backup. It
 *   is never used to overwrite item rows, except for a one-time import when the
 *   item tables are empty.
 * - Local changes are applied to React state immediately (optimistic UI) and
 *   queued in a per-user outbox persisted to localStorage. Transient failures
 *   (offline, 5xx, expired token) stay queued and are retried; rejected writes
 *   are rolled back and the latest server data is refetched.
 * - Remote changes arrive via Supabase Realtime, and a full refetch runs when
 *   the tab becomes visible again, when the network comes back and when the
 *   realtime channel reconnects.
 */

export type SyncKind = 'vocab' | 'grammar';
export type SyncStatus = 'idle' | 'loading' | 'syncing' | 'synced' | 'offline' | 'error';

type Lists = { vocab: VocabItem[]; grammar: GrammarItem[] };
type ItemOf<K extends SyncKind> = Lists[K][number];
type AnyItem = VocabItem | GrammarItem;
type ListUpdate<K extends SyncKind> = Lists[K] | ((prev: Lists[K]) => Lists[K]);

interface ItemRow {
  user_id: string;
  id: string;
  data: AnyItem;
  updated_at?: string;
}

interface PendingOp {
  kind: SyncKind;
  id: string;
  op: 'upsert' | 'delete';
  data?: AnyItem;
  /** Server-side value before the first pending change, used for rollback. */
  prev: AnyItem | null;
  ts: number;
}

type Outbox = Record<string, PendingOp>;

const KINDS: SyncKind[] = ['vocab', 'grammar'];
const TABLE: Record<SyncKind, 'vocab_items' | 'grammar_items'> = {
  vocab: 'vocab_items',
  grammar: 'grammar_items',
};
const PAGE_SIZE = 1000;
const WRITE_CHUNK = 200;
const SNAPSHOT_DELAY_MS = 3000;
const CACHE_OWNER_KEY = 'sync_cache_owner_v1';
const outboxKey = (userId: string) => `sync_outbox_v1_${userId}`;
const opKey = (kind: SyncKind, id: string) => `${kind}:${id}`;

const normalize = (kind: SyncKind, item: unknown): AnyItem =>
  kind === 'vocab' ? ensureFSRSVocab(item) : ensureFSRSGrammar(item);

const sameItem = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

function loadOutbox(userId: string): Outbox {
  try {
    const raw = localStorage.getItem(outboxKey(userId));
    return raw ? (JSON.parse(raw) as Outbox) : {};
  } catch {
    return {};
  }
}

/** Offline, timeouts, rate limits, server errors and expired tokens are worth retrying. */
function isTransient(error: { message?: string } | null, status?: number): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (!status || status === 401 || status === 408 || status === 429 || status >= 500) return true;
  return /fetch|network|load failed|timeout/i.test(error?.message || '');
}

/**
 * Keeps the order of `current` for ids that still exist, puts brand-new ids
 * first (newest createdAt first), and drops ids that are gone.
 */
function mergeInOrder<T extends AnyItem>(current: T[], incoming: Map<string, T>): T[] {
  const seen = new Set<string>();
  const kept: T[] = [];
  for (const item of current) {
    const next = incoming.get(item.id);
    if (!next) continue;
    seen.add(item.id);
    kept.push(sameItem(item, next) ? item : next);
  }
  const added = [...incoming.values()]
    .filter((item) => !seen.has(item.id))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return [...added, ...kept];
}

async function fetchAllRows(table: string, userId: string) {
  const rows: ItemRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error, status } = await supabase
      .from(table)
      .select('user_id,id,data,updated_at')
      .eq('user_id', userId)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) return { rows, error, status };
    rows.push(...((data as ItemRow[]) || []));
    if (!data || data.length < PAGE_SIZE) return { rows, error: null, status };
  }
}

/** Reads the data the previous Netlify DB-backed /api/sync endpoint stored, if any. */
async function fetchLegacyData(accessToken: string): Promise<Lists | null> {
  try {
    const res = await fetch('/api/sync', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;
    return { vocab: json.vocab || [], grammar: json.grammar || [] };
  } catch {
    return null;
  }
}

export interface UseSyncDataOptions {
  /** Called with a user-facing message when a change is rejected and rolled back. */
  onRollback?: (message: string) => void;
}

export function useSyncData(session: Session | null, options: UseSyncDataOptions = {}) {
  const userId = session?.user.id ?? null;
  const accessToken = session?.access_token ?? null;

  const [vocabList, setVocabState] = useState<VocabItem[]>([]);
  const [grammarList, setGrammarState] = useState<GrammarItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const listsRef = useRef<Lists>({ vocab: [], grammar: [] });
  const outboxRef = useRef<Outbox>({});
  const userIdRef = useRef<string | null>(userId);
  const accessTokenRef = useRef<string | null>(accessToken);
  const remoteLoadedRef = useRef(false);
  const flushingRef = useRef(false);
  const flushAgainRef = useRef(false);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelayRef = useRef(2000);
  const cacheTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchSeqRef = useRef(0);
  const writeEpochRef = useRef(0);
  const realtimeEpochRef = useRef(0);
  const onRollbackRef = useRef(options.onRollback);
  onRollbackRef.current = options.onRollback;
  accessTokenRef.current = accessToken;

  // Functions that reference each other are called through refs so every
  // callback always sees the latest version without re-subscribing.
  const flushRef = useRef<() => Promise<void>>(async () => {});
  const fetchRemoteRef = useRef<(attempt?: number) => Promise<void>>(async () => {});

  const persistOutbox = useCallback(() => {
    const uid = userIdRef.current;
    if (!uid) return;
    try {
      const entries = Object.keys(outboxRef.current);
      if (entries.length === 0) localStorage.removeItem(outboxKey(uid));
      else localStorage.setItem(outboxKey(uid), JSON.stringify(outboxRef.current));
    } catch (err) {
      console.warn('Could not persist sync outbox:', err);
    }
  }, []);

  const scheduleCachePersist = useCallback(() => {
    if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current);
    cacheTimerRef.current = setTimeout(() => {
      saveAllVocab(listsRef.current.vocab);
      saveAllGrammar(listsRef.current.grammar);
    }, 300);
  }, []);

  /** Replaces a list in both the ref (sync reads) and React state (render). */
  const commitLocal = useCallback(
    <K extends SyncKind>(kind: K, next: Lists[K], persist = true) => {
      listsRef.current = { ...listsRef.current, [kind]: next };
      if (kind === 'vocab') setVocabState(next as VocabItem[]);
      else setGrammarState(next as GrammarItem[]);
      if (persist) scheduleCachePersist();
    },
    [scheduleCachePersist]
  );

  /** Writes the whole-list backup to study_data once there is nothing pending. */
  const scheduleSnapshot = useCallback((immediate = false) => {
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    snapshotTimerRef.current = setTimeout(async () => {
      const uid = userIdRef.current;
      if (!uid || !remoteLoadedRef.current || Object.keys(outboxRef.current).length > 0) return;
      const { error } = await supabase.from('study_data').upsert(
        {
          user_id: uid,
          vocab: listsRef.current.vocab,
          grammar: listsRef.current.grammar,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (error) console.warn('study_data snapshot failed:', error.message);
    }, immediate ? 0 : SNAPSHOT_DELAY_MS);
  }, []);

  const scheduleFlush = useCallback((delay = 0) => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      flushRef.current();
    }, delay);
  }, []);

  /** Restores the pre-change server value of each op in local state. */
  const rollback = useCallback(
    (ops: PendingOp[]) => {
      for (const kind of KINDS) {
        const kindOps = ops.filter((op) => op.kind === kind);
        if (kindOps.length === 0) continue;
        let list = [...listsRef.current[kind]] as AnyItem[];
        for (const op of kindOps) {
          const idx = list.findIndex((item) => item.id === op.id);
          if (!op.prev) {
            if (idx >= 0) list.splice(idx, 1);
          } else if (idx >= 0) {
            list[idx] = op.prev;
          } else {
            list = [op.prev, ...list];
          }
        }
        commitLocal(kind, list as Lists[typeof kind]);
      }
    },
    [commitLocal]
  );

  // ---------------------------------------------------------------- push ----
  flushRef.current = async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    if (flushingRef.current) {
      flushAgainRef.current = true;
      return;
    }
    const batch = Object.entries(outboxRef.current);
    if (batch.length === 0) {
      if (remoteLoadedRef.current) setSyncStatus('synced');
      return;
    }

    flushingRef.current = true;
    setSyncStatus('syncing');

    const succeeded: [string, PendingOp][] = [];
    const rejected: [string, PendingOp][] = [];
    let transientFailure = false;

    const run = async (
      entries: [string, PendingOp][],
      write: (ops: PendingOp[]) => PromiseLike<{ error: { message: string } | null; status: number }>
    ) => {
      for (let i = 0; i < entries.length; i += WRITE_CHUNK) {
        const chunk = entries.slice(i, i + WRITE_CHUNK);
        const { error, status } = await write(chunk.map(([, op]) => op));
        if (!error) succeeded.push(...chunk);
        else if (isTransient(error, status)) transientFailure = true;
        else {
          console.error('Sync write rejected:', error.message);
          rejected.push(...chunk);
        }
      }
    };

    try {
      for (const kind of KINDS) {
        const upserts = batch.filter(([, op]) => op.kind === kind && op.op === 'upsert');
        const deletes = batch.filter(([, op]) => op.kind === kind && op.op === 'delete');
        const now = new Date().toISOString();

        await run(upserts, (ops) =>
          supabase.from(TABLE[kind]).upsert(
            ops.map((op) => ({ user_id: uid, id: op.id, data: op.data, updated_at: now })),
            { onConflict: 'user_id,id' }
          )
        );
        await run(deletes, (ops) =>
          supabase
            .from(TABLE[kind])
            .delete()
            .eq('user_id', uid)
            .in(
              'id',
              ops.map((op) => op.id)
            )
        );
      }
    } catch (err) {
      console.warn('Sync flush threw:', err);
      transientFailure = true;
    }

    flushingRef.current = false;
    if (uid !== userIdRef.current) return; // user switched mid-flush

    // Only clear entries that were not changed again while the request was in flight.
    const settle = (entries: [string, PendingOp][]) => {
      for (const [key, op] of entries) {
        if (outboxRef.current[key]?.ts === op.ts) delete outboxRef.current[key];
      }
    };
    settle(succeeded);
    settle(rejected);
    if (succeeded.length > 0) writeEpochRef.current++;
    persistOutbox();

    if (rejected.length > 0) {
      rollback(rejected.map(([, op]) => op));
      onRollbackRef.current?.('⚠️ Không thể lưu thay đổi lên máy chủ — đã khôi phục dữ liệu mới nhất.');
      fetchRemoteRef.current();
    }

    if (transientFailure) {
      setSyncStatus(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error');
      const delay = retryDelayRef.current;
      retryDelayRef.current = Math.min(delay * 2, 60000);
      scheduleFlush(delay);
      return;
    }

    retryDelayRef.current = 2000;
    if (flushAgainRef.current || Object.keys(outboxRef.current).length > 0) {
      flushAgainRef.current = false;
      scheduleFlush(0);
      return;
    }

    setSyncStatus(remoteLoadedRef.current ? 'synced' : 'loading');
    setLastSyncedAt(new Date());
    const emptied = listsRef.current.vocab.length === 0 && listsRef.current.grammar.length === 0;
    scheduleSnapshot(emptied);
  };

  // ---------------------------------------------------------------- pull ----
  fetchRemoteRef.current = async (attempt = 0) => {
    const uid = userIdRef.current;
    if (!uid) return;
    const seq = ++fetchSeqRef.current;
    const writeEpoch = writeEpochRef.current;
    const realtimeEpoch = realtimeEpochRef.current;
    if (!remoteLoadedRef.current) setSyncStatus('loading');

    const [vocabRes, grammarRes, studyRes] = await Promise.all([
      fetchAllRows(TABLE.vocab, uid),
      fetchAllRows(TABLE.grammar, uid),
      supabase.from('study_data').select('vocab,grammar,updated_at').eq('user_id', uid).maybeSingle(),
    ]);

    if (seq !== fetchSeqRef.current || uid !== userIdRef.current) return; // superseded

    const failure = vocabRes.error || grammarRes.error;
    if (failure) {
      console.warn('Sync fetch failed:', failure.message);
      const status = vocabRes.error ? vocabRes.status : grammarRes.status;
      setSyncStatus(isTransient(failure, status) ? 'offline' : 'error');
      return;
    }

    // A write finished or a realtime event landed while we were reading, so the
    // result may already be stale. Read again instead of applying it.
    if ((writeEpoch !== writeEpochRef.current || realtimeEpoch !== realtimeEpochRef.current) && attempt < 3) {
      return fetchRemoteRef.current(attempt + 1);
    }

    const remote: Lists = {
      vocab: vocabRes.rows.map((r) => normalize('vocab', r.data) as VocabItem),
      grammar: grammarRes.rows.map((r) => normalize('grammar', r.data) as GrammarItem),
    };

    // One-time import when this account has no item rows yet: from study_data
    // if it holds a snapshot, otherwise from the old Netlify DB storage.
    if (remote.vocab.length === 0 && remote.grammar.length === 0 && Object.keys(outboxRef.current).length === 0) {
      const study = studyRes.error ? undefined : studyRes.data;
      let imported: Lists | null = null;
      if (study) {
        const vocab = Array.isArray(study.vocab) ? study.vocab : [];
        const grammar = Array.isArray(study.grammar) ? study.grammar : [];
        if (vocab.length > 0 || grammar.length > 0) imported = { vocab, grammar };
      } else if (!studyRes.error && accessTokenRef.current) {
        imported = await fetchLegacyData(accessTokenRef.current);
        if (seq !== fetchSeqRef.current || uid !== userIdRef.current) return;
      }

      if (imported && (imported.vocab.length > 0 || imported.grammar.length > 0)) {
        const ts = Date.now();
        for (const kind of KINDS) {
          const items = (imported[kind] as unknown[]).map((raw) => normalize(kind, raw));
          for (const item of items) {
            outboxRef.current[opKey(kind, item.id)] = { kind, id: item.id, op: 'upsert', data: item, prev: null, ts };
          }
          remote[kind] = items as never;
        }
        persistOutbox();
      }
    }

    // Changes that have not reached the server yet win over what the server has.
    for (const kind of KINDS) {
      const map = new Map<string, AnyItem>(remote[kind].map((item) => [item.id, item]));
      for (const op of Object.values(outboxRef.current)) {
        if (op.kind !== kind) continue;
        if (op.op === 'upsert' && op.data) map.set(op.id, op.data);
        else map.delete(op.id);
      }
      const next = mergeInOrder(listsRef.current[kind] as AnyItem[], map);
      commitLocal(kind, next as Lists[typeof kind]);
    }

    remoteLoadedRef.current = true;
    setLastSyncedAt(new Date());
    if (Object.keys(outboxRef.current).length > 0) scheduleFlush(0);
    else setSyncStatus('synced');
  };

  // --------------------------------------------------------------- write ----
  /**
   * Optimistically replaces a list (value or updater, like setState) and syncs
   * only the items that changed to Supabase.
   */
  const saveData = useCallback(
    <K extends SyncKind>(kind: K, update: ListUpdate<K>) => {
      const prev = listsRef.current[kind];
      const next = typeof update === 'function' ? (update as (p: Lists[K]) => Lists[K])(prev) : update;
      if (next === prev) return;

      const uid = userIdRef.current;
      if (uid) {
        const ts = Date.now();
        const prevById = new Map<string, AnyItem>(prev.map((item) => [item.id, item]));
        const nextIds = new Set<string>();
        const queue = (id: string, op: PendingOp['op'], data: AnyItem | undefined, before: AnyItem | null) => {
          const key = opKey(kind, id);
          const existing = outboxRef.current[key];
          outboxRef.current[key] = { kind, id, op, data, prev: existing ? existing.prev : before, ts };
        };

        for (const item of next as AnyItem[]) {
          nextIds.add(item.id);
          const before = prevById.get(item.id);
          if (before && sameItem(before, item)) continue;
          queue(item.id, 'upsert', item, before ?? null);
        }
        for (const item of prev as AnyItem[]) {
          if (!nextIds.has(item.id)) queue(item.id, 'delete', undefined, item);
        }
        persistOutbox();
        scheduleFlush(0);
      }

      commitLocal(kind, next);
    },
    [commitLocal, persistOutbox, scheduleFlush]
  );

  const refresh = useCallback(async () => {
    await flushRef.current();
    await fetchRemoteRef.current();
  }, []);

  // ------------------------------------------------- user session lifecycle ----
  useEffect(() => {
    userIdRef.current = userId;
    remoteLoadedRef.current = false;
    fetchSeqRef.current++;
    retryDelayRef.current = 2000;

    if (!userId) {
      outboxRef.current = {};
      commitLocal('vocab', [], false);
      commitLocal('grammar', [], false);
      setSyncStatus('idle');
      return;
    }

    outboxRef.current = loadOutbox(userId);
    let cancelled = false;

    // Show the local cache instantly, but only if it belongs to this account.
    let cacheOwner: string | null = null;
    try {
      cacheOwner = localStorage.getItem(CACHE_OWNER_KEY);
      localStorage.setItem(CACHE_OWNER_KEY, userId);
    } catch {}

    if (cacheOwner && cacheOwner !== userId) {
      commitLocal('vocab', []);
      commitLocal('grammar', []);
    } else {
      Promise.all([getAllVocab(), getAllGrammar()]).then(([vocab, grammar]) => {
        if (cancelled || remoteLoadedRef.current || userIdRef.current !== userId) return;
        commitLocal('vocab', vocab, false);
        commitLocal('grammar', grammar, false);
      });
    }

    fetchRemoteRef.current();
    return () => {
      cancelled = true;
    };
  }, [userId, commitLocal]);

  // Keep the realtime socket authenticated across token refreshes.
  useEffect(() => {
    if (accessToken) supabase.realtime.setAuth(accessToken);
  }, [accessToken]);

  // ------------------------------------------------------------ realtime ----
  useEffect(() => {
    if (!userId) return;

    const handleItemChange = (kind: SyncKind) => (payload: RealtimePostgresChangesPayload<ItemRow>) => {
      if (userIdRef.current !== userId) return;
      realtimeEpochRef.current++;

      const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as Partial<ItemRow>;
      // DELETE events cannot be filtered server-side, so check ownership here.
      if (!row?.id || (row.user_id && row.user_id !== userId)) return;
      // A local change for this item is still pending; it is newer and will win.
      if (outboxRef.current[opKey(kind, row.id)]) return;

      const list = listsRef.current[kind] as AnyItem[];
      const idx = list.findIndex((item) => item.id === row.id);

      if (payload.eventType === 'DELETE') {
        if (idx < 0) return;
        commitLocal(kind, list.filter((item) => item.id !== row.id) as Lists[typeof kind]);
      } else {
        if (!row.data) return;
        const incoming = normalize(kind, row.data);
        if (idx >= 0) {
          if (sameItem(list[idx], incoming)) return; // echo of our own write
          const next = [...list];
          next[idx] = incoming;
          commitLocal(kind, next as Lists[typeof kind]);
        } else {
          commitLocal(kind, [incoming, ...list] as Lists[typeof kind]);
        }
      }
      setLastSyncedAt(new Date());
    };

    let hasSubscribed = false;
    const channel: RealtimeChannel = supabase.channel(`sync:${userId}`);

    for (const kind of KINDS) {
      const table = TABLE[kind];
      const filter = `user_id=eq.${userId}`;
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter }, handleItemChange(kind))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter }, handleItemChange(kind))
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, handleItemChange(kind));
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Events may have been missed while the socket was down.
        if (hasSubscribed) fetchRemoteRef.current();
        hasSubscribed = true;
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('Realtime channel status:', status);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, commitLocal]);

  // ------------------------------------------- visibility / connectivity ----
  useEffect(() => {
    if (!userId) return;

    const resync = () => {
      flushRef.current();
      fetchRemoteRef.current();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') resync();
    };
    const onOnline = () => {
      retryDelayRef.current = 2000;
      resync();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
    };
  }, [userId]);

  useEffect(
    () => () => {
      [flushTimerRef, cacheTimerRef, snapshotTimerRef].forEach((t) => t.current && clearTimeout(t.current));
    },
    []
  );

  return {
    vocabList,
    grammarList,
    saveData,
    refresh,
    syncStatus,
    lastSyncedAt,
  };
}

export type SaveData = ReturnType<typeof useSyncData>['saveData'];
export type { ItemOf };
