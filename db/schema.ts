import { pgTable, text, jsonb, timestamp, primaryKey } from 'drizzle-orm/pg-core';

export const vocabItems = pgTable(
  'vocab_items',
  {
    userId: text('user_id').notNull(),
    id: text('id').notNull(),
    data: jsonb('data').notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.id] })]
);

export const grammarItems = pgTable(
  'grammar_items',
  {
    userId: text('user_id').notNull(),
    id: text('id').notNull(),
    data: jsonb('data').notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.id] })]
);
