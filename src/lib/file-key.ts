/** Storage keys look like "library/<id>-<slug>.pdf". Shared by server and browser. */

const KEY_RE = /^library\/[a-z0-9]+(?:-[a-z0-9]+)*\.pdf$/;

export function makeFileKey(filename: string, id: string) {
  const slug = filename
    .toLowerCase()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `library/${id.toLowerCase().replace(/[^a-z0-9]/g, "")}-${slug || "book"}.pdf`;
}

/** Rejects anything that was not made by makeFileKey (no path tricks). */
export const isValidKey = (key: string) => KEY_RE.test(key);

/** "my-great-book.pdf" → "my great book". */
export const titleFromFilename = (filename: string) =>
  filename.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || "Untitled book";
