import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { createItems, ItemError, normalizeUrl, type Items } from "./items";
import type { PageInfo } from "./title";

let items: Items;
let fetchTitle: Mock<(url: string) => Promise<PageInfo>>;
let removeFile: Mock<(key: string) => Promise<void>>;
let saveFile: Mock<(key: string, data: Blob) => Promise<string>>;

beforeEach(async () => {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  fetchTitle = vi.fn<(url: string) => Promise<PageInfo>>(async (url: string) => ({ title: `Title of ${new URL(url).pathname}` }));
  removeFile = vi.fn<(key: string) => Promise<void>>(async () => {});
  saveFile = vi.fn<(key: string, data: Blob) => Promise<string>>(async (key) => key);
  items = createItems({
    db: db as unknown as Db,
    fetchTitle,
    removeFile,
    saveFile,
    topics: async () => ["Next.js", "Postgres", "TypeScript"],
  });
});

const book = { kind: "book" as const, title: "A Philosophy of Software Design", fileKey: "library/abc123-apsd.pdf" };

describe("addItem", () => {
  it("fetches the title when a link has none", async () => {
    const { item, created } = await items.addItem({ url: "https://example.com/post" });
    expect(created).toBe(true);
    expect(item).toMatchObject({ kind: "article", title: "Title of /post", status: "to-read", tags: [] });
    expect(fetchTitle).toHaveBeenCalledWith("https://example.com/post");
  });

  it("keeps a given title and does not fetch", async () => {
    const { item } = await items.addItem({ kind: "site", url: "https://orm.drizzle.team", title: "Drizzle" });
    expect(item.title).toBe("Drizzle");
    expect(fetchTitle).not.toHaveBeenCalled();
  });

  it("falls back to the hostname when fetching fails", async () => {
    fetchTitle.mockRejectedValueOnce(new Error("offline"));
    const { item } = await items.addItem({ url: "https://www.example.org/x" });
    expect(item.title).toBe("example.org");
  });

  it("returns the existing item for a duplicate URL, ignoring tracking params", async () => {
    const first = await items.addItem({ url: "https://example.com/a?utm_source=hn#top" });
    const second = await items.addItem({ url: "https://example.com/a" });
    expect(second.created).toBe(false);
    expect(second.item.id).toBe(first.item.id);
    expect(await items.listItems()).toHaveLength(1);
  });

  it("cleans tags and adds stack topics found in the title", async () => {
    const { item } = await items.addItem({
      url: "https://example.com/b",
      title: "Caching in Next.js 16 with PostgreSQL",
      tags: " Reading List, #Perf ,perf",
    });
    expect(item.tags).toEqual(["reading-list", "perf", "nextjs", "postgres"]);
  });

  it("tags by hostname too", async () => {
    const { item } = await items.addItem({ url: "https://www.postgresql.org/docs/current/indexes.html", title: "Indexes" });
    expect(item.tags).toEqual(["postgres"]);
  });

  it("adds a book from an uploaded file key", async () => {
    const { item } = await items.addItem(book);
    expect(item).toMatchObject({ kind: "book", fileKey: book.fileKey, url: null, lastPage: null });
  });

  it("rejects bad input", async () => {
    await expect(items.addItem({ url: "javascript:alert(1)" })).rejects.toThrow(ItemError);
    await expect(items.addItem({ ...book, fileKey: "../../etc/passwd" })).rejects.toThrow(/file key/i);
    await expect(items.addItem({ ...book, title: "  " })).rejects.toThrow(ItemError);
  });
});

describe("updateItem", () => {
  it("sets finishedAt when done and clears it when reopened", async () => {
    const { item } = await items.addItem({ url: "https://example.com/c" });
    const done = await items.updateItem(item.id, { status: "done" });
    expect(done.finishedAt).toBeInstanceOf(Date);
    const again = await items.updateItem(item.id, { status: "reading" });
    expect(again.finishedAt).toBeNull();
  });

  it("edits title, tags and notes", async () => {
    const { item } = await items.addItem({ url: "https://example.com/d" });
    const updated = await items.updateItem(item.id, { title: "New", tags: ["a", "b"], notes: "## hi" });
    expect(updated).toMatchObject({ title: "New", tags: ["a", "b"], notes: "## hi" });
  });

  it("refuses to turn a book into a link", async () => {
    const { item } = await items.addItem(book);
    await expect(items.updateItem(item.id, { kind: "article" })).rejects.toThrow(/book/);
  });

  it("throws not_found for unknown ids", async () => {
    await expect(items.updateItem("nope", { title: "x" })).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("updateProgress", () => {
  it("saves the page, clamps to the total and starts reading", async () => {
    const { item } = await items.addItem(book);
    const p = await items.updateProgress(item.id, { lastPage: 500, totalPages: 320 });
    expect(p).toMatchObject({ lastPage: 320, totalPages: 320, status: "reading" });
    const back = await items.updateProgress(item.id, { lastPage: 12 });
    expect(back).toMatchObject({ lastPage: 12, totalPages: 320 });
  });

  it("does not move a finished book back to reading", async () => {
    const { item } = await items.addItem(book);
    await items.updateItem(item.id, { status: "done" });
    expect((await items.updateProgress(item.id, { lastPage: 3 })).status).toBe("done");
  });

  it("only works for books", async () => {
    const { item } = await items.addItem({ url: "https://example.com/e" });
    await expect(items.updateProgress(item.id, { lastPage: 2 })).rejects.toThrow(/books/);
  });
});

describe("books without a PDF", () => {
  const wanted = { kind: "book" as const, title: "Designing Data-Intensive Applications", url: "https://openlibrary.org/works/OL1W" };

  it("adds a wished-for book by link, once", async () => {
    const { item, created } = await items.addItem(wanted);
    expect(created).toBe(true);
    expect(item).toMatchObject({ kind: "book", fileKey: null, url: wanted.url, status: "to-read" });
    expect((await items.addItem(wanted)).created).toBe(false);
  });

  it("needs a PDF or a link", async () => {
    await expect(items.addItem({ kind: "book", title: "Nothing" })).rejects.toThrow(/PDF or a link/);
  });

  it("attaches a PDF later and replaces an old one", async () => {
    const { item } = await items.addItem(wanted);
    const withFile = await items.attachFile(item.id, "library/abc-ddia.pdf");
    expect(withFile.fileKey).toBe("library/abc-ddia.pdf");
    await items.attachFile(item.id, "library/def-ddia.pdf");
    expect(removeFile).toHaveBeenCalledWith("library/abc-ddia.pdf");
    await expect(items.attachFile(item.id, "library/x-cover.jpg")).rejects.toThrow(/file key/);
  });
});

describe("setCover", () => {
  const jpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" });

  it("stores a cover for a book", async () => {
    const { item } = await items.addItem(book);
    const updated = await items.setCover(item.id, jpeg);
    expect(updated.coverKey).toBe(`library/${item.id}-cover.jpg`);
    expect(saveFile).toHaveBeenCalledWith(updated.coverKey, jpeg);
  });

  it("rejects links and non-JPEG files", async () => {
    const { item: link } = await items.addItem({ url: "https://example.com/cover" });
    await expect(items.setCover(link.id, jpeg)).rejects.toThrow(/books/);
    const { item } = await items.addItem(book);
    await expect(items.setCover(item.id, new Blob(["<svg/>"], { type: "image/svg+xml" }))).rejects.toThrow(/JPEG/);
  });
});

describe("deleteItem", () => {
  it("deletes the row, the stored PDF and its cover", async () => {
    const { item } = await items.addItem(book);
    const { coverKey } = await items.setCover(item.id, new Blob([new Uint8Array([1])], { type: "image/jpeg" }));
    expect(await items.deleteItem(item.id)).toBe(true);
    expect(removeFile).toHaveBeenCalledWith(book.fileKey);
    expect(removeFile).toHaveBeenCalledWith(coverKey);
    expect(await items.getItem(item.id)).toBeNull();
    expect(await items.deleteItem(item.id)).toBe(false);
  });
});

describe("listItems", () => {
  beforeEach(async () => {
    await items.addItem({ url: "https://example.com/1", title: "TypeScript tips", tags: ["ts"] });
    await items.addItem({ kind: "site", url: "https://example.com/2", title: "Drizzle docs", tags: ["db"] });
    const { item } = await items.addItem({ ...book, title: "Designing Data-Intensive Apps", tags: ["db"] });
    await items.updateProgress(item.id, { lastPage: 4, totalPages: 600 });
  });

  it("puts reading items first, then newest", async () => {
    const list = await items.listItems();
    expect(list.map((i) => i.title)).toEqual(["Designing Data-Intensive Apps", "Drizzle docs", "TypeScript tips"]);
  });

  it("filters by kind, status, tag and title", async () => {
    expect((await items.listItems({ kind: "site" })).map((i) => i.title)).toEqual(["Drizzle docs"]);
    expect((await items.listItems({ status: "reading" })).map((i) => i.kind)).toEqual(["book"]);
    expect(await items.listItems({ tag: "db" })).toHaveLength(2);
    expect((await items.listItems({ q: "script" })).map((i) => i.title)).toEqual(["TypeScript tips"]);
    expect(await items.listItems({ q: "100%" })).toHaveLength(0);
    expect(await items.listItems({ tag: "db", kind: "book" })).toHaveLength(1);
  });

  it("ignores invalid filter values instead of failing", async () => {
    expect(await items.listItems({ kind: "video" as never })).toHaveLength(3);
  });

  it("counts tags", async () => {
    expect(await items.listTags()).toEqual([
      { tag: "db", count: 2 },
      { tag: "ts", count: 1 },
      { tag: "typescript", count: 1 },
    ]);
  });
});

describe("normalizeUrl", () => {
  it("drops fragments and tracking params but keeps real ones", () => {
    expect(normalizeUrl("https://x.dev/p?id=3&utm_medium=email&fbclid=1#h")).toBe("https://x.dev/p?id=3");
  });
});
