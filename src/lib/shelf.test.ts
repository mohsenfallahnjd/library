import { describe, expect, it } from "vitest";
import type { Item } from "./items";
import { buildShelf } from "./shelf";

const item = (id: string, kind: Item["kind"], status: Item["status"]) => ({ id, kind, status }) as Item;

describe("buildShelf", () => {
  const items = [
    item("b1", "book", "reading"),
    item("a1", "article", "reading"),
    item("b2", "book", "to-read"),
    item("a2", "article", "to-read"),
    item("s1", "site", "to-read"),
    item("a3", "article", "to-read"),
    item("b3", "book", "done"),
    item("a4", "article", "done"),
  ];

  it("keeps unfinished books, including ones not started", () => {
    expect(buildShelf(items).books.map((i) => i.id)).toEqual(["b1", "b2"]);
  });

  it("previews unfinished links in order and counts them all", () => {
    const { savedPreview, savedCount } = buildShelf(items);
    expect(savedPreview.map((i) => i.id)).toEqual(["a1", "a2", "s1"]);
    expect(savedCount).toBe(4);
  });

  it("is empty for an empty library", () => {
    expect(buildShelf([])).toEqual({ books: [], savedPreview: [], savedCount: 0 });
  });
});
