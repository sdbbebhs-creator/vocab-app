import { supabase } from './supabaseClient';
import type { VocabItem, GrammarItem } from '../types';

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchRemoteData(): Promise<{ vocab: VocabItem[]; grammar: GrammarItem[] } | null> {
  const headers = await authHeader();
  if (!headers.Authorization) return null;

  const res = await fetch('/api/sync', { headers });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.success) return null;
  return { vocab: json.vocab || [], grammar: json.grammar || [] };
}

export async function pushRemoteData(vocab: VocabItem[], grammar: GrammarItem[]): Promise<boolean> {
  const headers = await authHeader();
  if (!headers.Authorization) return false;

  const res = await fetch('/api/sync', {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ vocab, grammar }),
  });
  if (!res.ok) return false;
  const json = await res.json();
  return !!json.success;
}
