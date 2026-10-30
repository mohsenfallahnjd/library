/**
 * Fetches a page and pulls a human title out of its <head>:
 * og:title → twitter:title → <title> → hostname.
 * Never throws for network or parse problems; it falls back to the hostname.
 */

export type PageInfo = { title: string; siteName?: string };

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 8000;

export async function fetchTitle(
  rawUrl: string,
  fetchImpl: FetchLike = fetch,
): Promise<PageInfo> {
  const url = parseHttpUrl(rawUrl);
  if (!url) throw new Error("Invalid URL");
  const fallback = { title: hostnameOf(url) };
  if (isPrivateHost(url.hostname)) return fallback;

  try {
    const hn = await hackerNewsTitle(url, fetchImpl);
    if (hn) return hn;
    const res = await fetchImpl(url.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        // Some sites (e.g. Medium) hide titles from unknown bots.
        "user-agent": "Mozilla/5.0 (compatible; LibraryBot/1.0; +https://github.com/)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return fallback;
    const type = res.headers.get("content-type") ?? "";
    if (type && !type.includes("html")) return fallback;
    const html = await readHead(res);
    const info = parseTitle(html);
    return info.title ? info : { ...info, title: fallback.title };
  } catch {
    return fallback;
  }
}

/** HN rejects most server fetches of its HTML, so ask its API instead. */
async function hackerNewsTitle(url: URL, fetchImpl: FetchLike): Promise<PageInfo | null> {
  const id = url.hostname === "news.ycombinator.com" && url.pathname === "/item" && url.searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) return null;
  const res = await fetchImpl(`https://hn.algolia.com/api/v1/items/${id}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { title?: string | null };
  return data.title ? { title: clean(data.title), siteName: "Hacker News" } : null;
}

/** Exported for tests: extracts the best title from an HTML string. */
export function parseTitle(html: string): { title: string; siteName?: string } {
  const meta = (name: string) => {
    const re = new RegExp(
      `<meta\\b[^>]*(?:property|name)\\s*=\\s*["']${name}["'][^>]*>`,
      "i",
    );
    const tag = html.match(re)?.[0];
    const content = tag?.match(/content\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    return clean(content?.[1] ?? content?.[2]);
  };
  const titleTag = clean(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
  const title = meta("og:title") || meta("twitter:title") || titleTag || "";
  const siteName = meta("og:site_name") || undefined;
  return { title, siteName };
}

export function parseHttpUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function hostnameOf(url: URL) {
  return url.hostname.replace(/^www\./, "");
}

function isPrivateHost(host: string) {
  return (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === "[::1]"
  );
}

/** Reads until </head> or MAX_BYTES, whichever comes first. */
async function readHead(res: Response) {
  if (!res.body) return (await res.text()).slice(0, MAX_BYTES);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let html = "";
  while (html.length < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
    if (/<\/head>/i.test(html)) break;
  }
  reader.cancel().catch(() => {});
  return html;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  laquo: "«",
  raquo: "»",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  middot: "·",
};

export function decodeEntities(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

function clean(s: string | undefined) {
  if (!s) return "";
  return decodeEntities(s).replace(/\s+/g, " ").trim().slice(0, 300);
}
