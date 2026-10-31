import "server-only";
import { cacheLife } from "next/cache";
import { BOOKS, openLibraryLinks, type BookLinks } from "./books";

/** Open Library cover and page for a catalogue book; cached for weeks. */
export async function getBookLinks(id: string): Promise<BookLinks | null> {
  "use cache";
  cacheLife("weeks");
  const book = BOOKS.find((b) => b.id === id);
  return book ? openLibraryLinks(book) : null;
}
