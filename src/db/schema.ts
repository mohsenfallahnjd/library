import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { newId } from "../lib/id";

export const kindEnum = pgEnum("item_kind", ["book", "article", "site"]);
export const statusEnum = pgEnum("item_status", ["to-read", "reading", "done"]);

export const items = pgTable(
  "items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => newId()),
    kind: kindEnum("kind").notNull(),
    title: text("title").notNull(),
    url: text("url"),
    /** Storage key of the PDF (Vercel Blob pathname or a file under ./uploads). */
    fileKey: text("file_key"),
    author: text("author"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    status: statusEnum("status").notNull().default("to-read"),
    lastPage: integer("last_page"),
    totalPages: integer("total_pages"),
    notes: text("notes"),
    /** Where the item came from, e.g. "hn" when saved from Discover. */
    source: text("source"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("items_url_key").on(t.url),
    index("items_added_at_idx").on(t.addedAt),
    index("items_tags_idx").using("gin", t.tags),
  ],
);

/** Small key/value store for app settings (e.g. the stack topics used by Discover). */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export type ItemRow = typeof items.$inferSelect;
