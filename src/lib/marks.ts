import { and, desc, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { marks } from "@/db/schema";

/**
 * Read/hidden marks for things that aren't library items: feed stories and
 * book suggestions. Synced through the database, so reading the feed on the
 * phone hides those stories on the Mac too.
 */

export type MarkState = "read" | "hidden";
export type Mark = { key: string; state: MarkState; title: string | null; createdAt: Date };

/** Feed stories are at most 30 days old, so older marks are just clutter. */
const KEEP_DAYS = 60;

export const markInputSchema = z
  .array(
    z.object({
      key: z.string().trim().min(1).max(2048),
      title: z.string().trim().max(300).nullish(),
    }),
  )
  .min(1)
  .max(500);

export function createMarks(db: Db) {
  async function mark(state: MarkState, raw: z.input<typeof markInputSchema>) {
    const entries = markInputSchema.parse(raw);
    await db
      .insert(marks)
      .values(entries.map((e) => ({ key: e.key, state, title: e.title ?? null })))
      .onConflictDoUpdate({ target: marks.key, set: { state, createdAt: new Date() } });
    // Opportunistic clean-up instead of a cron job.
    await db.delete(marks).where(lt(marks.createdAt, sql`now() - make_interval(days => ${KEEP_DAYS})`));
  }

  async function unmark(keys: string[]) {
    if (keys.length) await db.delete(marks).where(inArray(marks.key, keys));
  }

  /** Keys of everything marked, optionally only with a key prefix (e.g. "book:"). */
  async function markedKeys(prefix?: string): Promise<Set<string>> {
    const rows = await db
      .select({ key: marks.key })
      .from(marks)
      .where(prefix ? sql`${marks.key} like ${prefix.replace(/[\\%_]/g, "\\$&") + "%"}` : undefined);
    return new Set(rows.map((r) => r.key));
  }

  /** Most recent first, for the "Read today" list. */
  async function recent(state: MarkState, limit = 50): Promise<Mark[]> {
    const rows = await db
      .select()
      .from(marks)
      .where(and(sql`${marks.key} not like 'book:%'`, sql`${marks.state} = ${state}`))
      .orderBy(desc(marks.createdAt))
      .limit(limit);
    return rows as Mark[];
  }

  return { mark, unmark, markedKeys, recent };
}

export type Marks = ReturnType<typeof createMarks>;
