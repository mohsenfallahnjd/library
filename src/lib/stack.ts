import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { DEFAULT_TOPICS } from "./topics";

/** The user's stack topics, stored in the settings table. */

const KEY = "stack-topics";

export const topicsSchema = z
  .union([z.array(z.string()), z.string()])
  .transform((v) => (typeof v === "string" ? v.split(/[,\n]/) : v))
  .transform((list) => [...new Set(list.map((t) => t.trim()).filter(Boolean))])
  .pipe(z.array(z.string().max(40)).max(40));

export async function getStackTopics(): Promise<string[]> {
  const [row] = await db.select().from(settings).where(eq(settings.key, KEY)).limit(1);
  const parsed = topicsSchema.safeParse(row?.value);
  return parsed.success && parsed.data.length ? parsed.data : DEFAULT_TOPICS;
}

export async function setStackTopics(raw: unknown): Promise<string[]> {
  const topics = topicsSchema.parse(raw);
  await db
    .insert(settings)
    .values({ key: KEY, value: topics })
    .onConflictDoUpdate({ target: settings.key, set: { value: topics } });
  return topics;
}
