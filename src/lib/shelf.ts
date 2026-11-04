import type { Item } from "./items";

export const SAVED_PREVIEW = 3;

/**
 * What's waiting for you, from items in listItems() order (reading first, then
 * newest): unfinished books, and a preview of unfinished saved links.
 */
export function buildShelf(items: Item[], previewSize = SAVED_PREVIEW) {
  const unfinished = items.filter((i) => i.status !== "done");
  const links = unfinished.filter((i) => i.kind !== "book");
  return {
    books: unfinished.filter((i) => i.kind === "book"),
    savedPreview: links.slice(0, previewSize),
    savedCount: links.length,
  };
}
