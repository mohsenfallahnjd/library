import { and, arrayContains, desc, eq, ilike, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, type Db } from "@/db";
import { items, type ItemRow } from "@/db/schema";
import { isValidKey } from "./file-key";
import { getStackTopics } from "./stack";
import { removeFile } from "./storage";
import { fetchTitle, hostnameOf, parseHttpUrl, type PageInfo } from "./title";
import { normalizeUrl } from "./url";
import { matchTopics } from "./topics";

/**
 * The library's one deep module. Everything about items — validation, URL
 * normalisation, de-duplication, auto-tagging, status rules, progress and file
 * clean-up — lives behind these few functions. Pages and routes never touch
 * Drizzle; they call the bound functions exported at the bottom.
 */

export { normalizeUrl };

export const KINDS = ["book", "article", "site"] as const;
export const STATUSES = ["to-read", "reading", "done"] as const;
export type ItemKind = (typeof KINDS)[number];
export type Status = (typeof STATUSES)[number];

export interface Item {
  id: string;
  kind: ItemKind;
  title: string;
  url: string | null;
  fileKey: string | null;
  author: string | null;
  tags: string[];
  status: Status;
  lastPage: number | null;
  totalPages: number | null;
  notes: string | null;
  source: string | null;
  addedAt: Date;
  updatedAt: Date;
  finishedAt: Date | null;
}

// ---------- input schemas (shared with routes and actions) ----------

const tag = z
  .string()
  .transform((t) =>
    t
      .toLowerCase()
      .trim()
      .replace(/^#/, "")
      .replace(/[^a-z0-9+#.]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32),
  )
  .pipe(z.string().min(1));

/** Accepts ["a", "b"] or "a, b" (form fields) and returns unique clean tags. */
export const tagsSchema = z
  .union([z.array(z.string()), z.string()])
  .transform((v) => (typeof v === "string" ? v.split(/[,\n]/) : v))
  .transform((list) => list.filter((t) => t.trim() !== ""))
  .pipe(z.array(tag).max(20))
  .transform((list) => [...new Set(list)]);

const httpUrl = z
  .string()
  .trim()
  .refine((v) => parseHttpUrl(v) !== null, "Enter a valid http(s) URL")
  .transform((v) => normalizeUrl(v));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const linkInput = z.object({
  kind: z.enum(["article", "site"]).default("article"),
  url: httpUrl,
  title: optionalText(300),
  author: optionalText(200),
  tags: tagsSchema.default([]),
  notes: optionalText(20_000),
  source: optionalText(40),
});

const bookInput = z.object({
  kind: z.literal("book"),
  fileKey: z.string().refine(isValidKey, "Invalid file key"),
  title: z.string().trim().min(1).max(300),
  author: optionalText(200),
  tags: tagsSchema.default([]),
  notes: optionalText(20_000),
  totalPages: z.number().int().positive().optional().nullable(),
});

export const addItemSchema = z.union([bookInput, linkInput]);
export type AddItemInput = z.input<typeof addItemSchema>;

export const updateItemSchema = z
  .object({
    kind: z.enum(KINDS),
    title: z.string().trim().min(1).max(300),
    url: httpUrl.nullable(),
    author: optionalText(200),
    tags: tagsSchema,
    status: z.enum(STATUSES),
    notes: optionalText(20_000),
  })
  .partial();
export type UpdateItemInput = z.input<typeof updateItemSchema>;

export const progressSchema = z.object({
  lastPage: z.number().int().min(1),
  totalPages: z.number().int().min(1).optional(),
});

export const filterSchema = z.object({
  kind: z.enum(KINDS).optional().catch(undefined),
  status: z.enum(STATUSES).optional().catch(undefined),
  tag: z.string().trim().min(1).max(32).optional().catch(undefined),
  q: z.string().trim().max(200).optional().catch(undefined),
});
export type ItemFilter = z.input<typeof filterSchema>;

// ---------- the module ----------

export class ItemError extends Error {
  constructor(
    message: string,
    readonly code: "not_found" | "invalid",
  ) {
    super(message);
  }
}

export type ItemsDeps = {
  db: Db;
  /** Fetches a page title when a link is added without one. */
  fetchTitle?: (url: string) => Promise<PageInfo>;
  /** Stack topics used to auto-tag new items. */
  topics?: () => Promise<string[]>;
  /** Deletes a stored PDF when its book is deleted. */
  removeFile?: (key: string) => Promise<void>;
};

export function createItems(deps: ItemsDeps) {
  const { db } = deps;
  const toItem = (row: ItemRow): Item => ({ ...row, tags: row.tags ?? [] });

  async function getItem(id: string): Promise<Item | null> {
    const [row] = await db.select().from(items).where(eq(items.id, id)).limit(1);
    return row ? toItem(row) : null;
  }

  async function mustGet(id: string) {
    const item = await getItem(id);
    if (!item) throw new ItemError("Item not found", "not_found");
    return item;
  }

  async function autoTags(text: string, tags: string[]) {
    const topics = deps.topics ? await deps.topics() : [];
    return [...new Set([...tags, ...matchTopics(text, topics)])].slice(0, 20);
  }

  /**
   * Adds a link or a book. Adding a URL that is already in the library
   * returns the existing item (`created: false`) instead of failing.
   */
  async function addItem(raw: AddItemInput): Promise<{ item: Item; created: boolean }> {
    const input = parse(addItemSchema, raw);

    if (input.kind === "book") {
      const [row] = await db
        .insert(items)
        .values({
          kind: "book",
          title: input.title,
          fileKey: input.fileKey,
          author: input.author,
          tags: await autoTags(input.title, input.tags),
          notes: input.notes,
          totalPages: input.totalPages ?? null,
        })
        .returning();
      return { item: toItem(row), created: true };
    }

    const [existing] = await db.select().from(items).where(eq(items.url, input.url)).limit(1);
    if (existing) return { item: toItem(existing), created: false };

    let title = input.title;
    if (!title) {
      const info = deps.fetchTitle ? await deps.fetchTitle(input.url).catch(() => null) : null;
      title = info?.title || hostnameOf(new URL(input.url));
    }

    const [row] = await db
      .insert(items)
      .values({
        kind: input.kind,
        title,
        url: input.url,
        author: input.author,
        tags: await autoTags(`${title} ${hostnameOf(new URL(input.url)).replace(/\./g, " ")}`, input.tags),
        notes: input.notes,
        source: input.source,
      })
      .onConflictDoNothing({ target: items.url })
      .returning();
    // Lost a race with a concurrent save of the same URL.
    if (!row) {
      const [again] = await db.select().from(items).where(eq(items.url, input.url)).limit(1);
      return { item: toItem(again), created: false };
    }
    return { item: toItem(row), created: true };
  }

  async function updateItem(id: string, raw: UpdateItemInput): Promise<Item> {
    const patch = parse(updateItemSchema, raw);
    const current = await mustGet(id);
    const kind = patch.kind ?? current.kind;
    if ((kind === "book") !== (current.kind === "book")) {
      throw new ItemError("A book can't become a link (or the other way round)", "invalid");
    }
    if (kind !== "book" && patch.url === null) throw new ItemError("Links need a URL", "invalid");

    const values: Partial<typeof items.$inferInsert> = { ...patch, updatedAt: new Date() };
    if (patch.status && patch.status !== current.status) {
      values.finishedAt = patch.status === "done" ? new Date() : null;
    }
    const [row] = await db.update(items).set(values).where(eq(items.id, id)).returning();
    return toItem(row);
  }

  /** Saves the reader position. Opening a to-read book moves it to reading. */
  async function updateProgress(
    id: string,
    raw: z.input<typeof progressSchema>,
  ): Promise<Item> {
    const input = parse(progressSchema, raw);
    const current = await mustGet(id);
    if (current.kind !== "book") throw new ItemError("Only books have pages", "invalid");

    const totalPages = input.totalPages ?? current.totalPages;
    const lastPage = totalPages ? Math.min(input.lastPage, totalPages) : input.lastPage;
    const [row] = await db
      .update(items)
      .set({
        lastPage,
        totalPages,
        status: current.status === "to-read" ? "reading" : current.status,
        updatedAt: new Date(),
      })
      .where(eq(items.id, id))
      .returning();
    return toItem(row);
  }

  /** Deletes the item and, for books, its PDF. Returns false if it didn't exist. */
  async function deleteItem(id: string): Promise<boolean> {
    const [row] = await db.delete(items).where(eq(items.id, id)).returning();
    if (!row) return false;
    if (row.fileKey && deps.removeFile) await deps.removeFile(row.fileKey).catch(() => {});
    return true;
  }

  /** Newest first. `reading` items are shown first when no status filter is set. */
  async function listItems(raw: ItemFilter = {}): Promise<Item[]> {
    const filter = filterSchema.parse(raw);
    const where: SQL[] = [];
    if (filter.kind) where.push(eq(items.kind, filter.kind));
    if (filter.status) where.push(eq(items.status, filter.status));
    if (filter.tag) where.push(arrayContains(items.tags, [filter.tag]));
    if (filter.q) where.push(ilike(items.title, `%${filter.q.replace(/[\\%_]/g, "\\$&")}%`));

    const rows = await db
      .select()
      .from(items)
      .where(where.length ? and(...where) : undefined)
      .orderBy(sql`case when ${items.status} = 'reading' then 0 else 1 end`, desc(items.addedAt));
    return rows.map(toItem);
  }

  /** Every tag in the library with how many items use it, most used first. */
  async function listTags(): Promise<{ tag: string; count: number }[]> {
    const rows = await db.execute<{ tag: string; count: number }>(
      sql`select t as tag, count(*)::int as count from ${items}, unnest(${items.tags}) as t group by t order by count desc, t asc`,
    );
    // postgres-js returns an array, PGlite returns { rows }.
    const list = Array.isArray(rows) ? rows : (rows as unknown as { rows: { tag: string; count: number }[] }).rows;
    return list.map((r) => ({ tag: r.tag, count: Number(r.count) }));
  }

  return { addItem, getItem, updateItem, updateProgress, deleteItem, listItems, listTags };
}

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue?.path.join(".");
    throw new ItemError(field ? `${field}: ${issue.message}` : (issue?.message ?? "Invalid input"), "invalid");
  }
  return result.data;
}

export type Items = ReturnType<typeof createItems>;

// ---------- the app's instance ----------

const library = createItems({ db, fetchTitle, removeFile, topics: getStackTopics });

export const { addItem, getItem, updateItem, updateProgress, deleteItem, listItems, listTags } =
  library;
