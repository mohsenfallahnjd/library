/**
 * Storage keys look like "library/<id>-<slug>.pdf" (books) or
 * "library/<id>-cover.jpg" (their covers). Shared by server and browser.
 */

const KEY_RE = /^library\/[a-z0-9]+(?:-[a-z0-9]+)*\.(pdf|jpg)$/;

export function makeFileKey(filename: string, id: string) {
  const slug = filename
    .toLowerCase()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `library/${id.toLowerCase().replace(/[^a-z0-9]/g, "")}-${slug || "book"}.pdf`;
}

/** Cover image key for a book. */
export const makeCoverKey = (id: string) => `library/${id.toLowerCase().replace(/[^a-z0-9]/g, "")}-cover.jpg`;

export const contentTypeOf = (key: string) => (key.endsWith(".jpg") ? "image/jpeg" : "application/pdf");

/** Rejects anything that was not made by makeFileKey or makeCoverKey (no path tricks). */
export const isValidKey = (key: string) => KEY_RE.test(key);

/** "my-great-book.pdf" → "my great book". */
export const titleFromFilename = (filename: string) =>
  filename.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || "Untitled book";
