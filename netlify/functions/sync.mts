import type { Config } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { vocabItems, grammarItems } from '../../db/schema.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yewgrnoiprxtlogayaob.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_4GAnDJJPNa7lHP-Vvq7-Gg_O-3BHJdy';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

export default async (req: Request) => {
  const userId = await getUserId(req);
  if (!userId) {
    return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  if (req.method === 'GET') {
    const [vocabRows, grammarRows] = await Promise.all([
      db.select().from(vocabItems).where(eq(vocabItems.userId, userId)),
      db.select().from(grammarItems).where(eq(grammarItems.userId, userId)),
    ]);

    return Response.json({
      success: true,
      vocab: vocabRows.map((r) => r.data),
      grammar: grammarRows.map((r) => r.data),
    });
  }

  if (req.method === 'PUT') {
    const body = await req.json();
    const vocab = Array.isArray(body.vocab) ? body.vocab : [];
    const grammar = Array.isArray(body.grammar) ? body.grammar : [];

    await db.delete(vocabItems).where(eq(vocabItems.userId, userId));
    await db.delete(grammarItems).where(eq(grammarItems.userId, userId));

    if (vocab.length > 0) {
      await db.insert(vocabItems).values(
        vocab.map((item: any) => ({ userId, id: String(item.id), data: item }))
      );
    }
    if (grammar.length > 0) {
      await db.insert(grammarItems).values(
        grammar.map((item: any) => ({ userId, id: String(item.id), data: item }))
      );
    }

    return Response.json({ success: true });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/sync',
};
