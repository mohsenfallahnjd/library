import { parseHttpUrl } from "./title";

/** Strips tracking params and fragments so the same article isn't saved twice. */
export function normalizeUrl(raw: string) {
  const url = parseHttpUrl(raw);
  if (!url) return raw.trim();
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$|mc_|ref$|ref_src$|source$)/i.test(key)) url.searchParams.delete(key);
  }
  return url.toString();
}

/**
 * Finds the link in whatever a share sheet sent: a URL in any string field
 * (Safari pages sometimes arrive as "Title\nhttps://…" or as just the title
 * plus a separate URL), or a bare "example.com/post". Returns null if none.
 */
export function findUrl(...values: unknown[]): string | null {
  const strings = values.flatMap(function collect(v): string[] {
    if (typeof v === "string") return [v];
    if (Array.isArray(v)) return v.flatMap(collect);
    if (v && typeof v === "object") return Object.values(v).flatMap(collect);
    return [];
  });
  for (const s of strings) {
    const match = s.match(/https?:\/\/[^\s<>"']+/i);
    if (match) return match[0].replace(/[).,;!?]+$/, "");
  }
  for (const s of strings) {
    const bare = s.trim();
    if (/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/\S*)?$/i.test(bare)) return `https://${bare}`;
  }
  return null;
}
