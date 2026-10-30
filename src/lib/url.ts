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
