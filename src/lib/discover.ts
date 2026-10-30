import { decodeEntities } from "./title";
import { normalizeUrl } from "./url";
import { matchTopics, topicTag } from "./topics";

/**
 * Discover: recent tech articles from Hacker News, Lobsters, dev.to, TLDR and
 * the official Next.js and Vercel blogs,
 * kept only when they mention one of the stack topics, and ranked by
 * topic matches, community score and freshness.
 */

export type SourceId = "hn" | "lobsters" | "devto" | "tldr" | "nextjs" | "vercel";

export interface Suggestion {
  url: string;
  title: string;
  source: SourceId;
  score: number;
  comments: number;
  discussionUrl: string | null;
  createdAt: string; // ISO, so it can cross the cache boundary
  /** One-paragraph summary, when the source writes one (TLDR does). */
  summary?: string | null;
  readMinutes?: number | null;
  topics: string[]; // matched topic tags
  rank: number;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
/** A story before ranking; `tags` are the source's own tags, used for matching. */
type Raw = Omit<Suggestion, "topics" | "rank"> & { tags?: string[] };

export const SOURCE_LABEL: Record<SourceId, string> = {
  hn: "Hacker News",
  lobsters: "Lobsters",
  devto: "dev.to",
  tldr: "TLDR",
  nextjs: "Next.js blog",
  vercel: "Vercel blog",
};

/**
 * Official blogs of the stack: always shown (tagged with their topic even if
 * the title doesn't say it), for longer, and ranked a little higher.
 */
const OFFICIAL: Partial<Record<SourceId, { feed: string; tag: string }>> = {
  nextjs: { feed: "https://nextjs.org/feed.xml", tag: "nextjs" },
  vercel: { feed: "https://vercel.com/atom", tag: "vercel" },
};
const OFFICIAL_WINDOW_DAYS = 30;
/** Vercel posts several times a week; only the newest few are guaranteed a spot. */
const OFFICIAL_MAX_POSTS = 6;
const OFFICIAL_BONUS = 3;

const DAY = 86_400_000;
const WINDOW_DAYS = 10;

async function getJson<T>(fetchImpl: FetchLike, url: string): Promise<T | null> {
  try {
    const res = await fetchImpl(url, {
      signal: AbortSignal.timeout(8000),
      headers: { accept: "application/json", "user-agent": "LibraryBot/1.0" },
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Reads a text response, stopping after `maxBytes` (the Vercel feed holds every post ever). */
async function getText(fetchImpl: FetchLike, url: string, maxBytes = 2_000_000): Promise<string | null> {
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(8000), headers: { "user-agent": "LibraryBot/1.0" } });
    if (!res.ok) return null;
    if (!res.body) return (await res.text()).slice(0, maxBytes);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    while (text.length < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    reader.cancel().catch(() => {});
    return text;
  } catch {
    return null;
  }
}

// ---------- sources ----------

type HnHit = {
  objectID: string;
  title: string | null;
  url: string | null;
  points: number | null;
  num_comments: number | null;
  created_at: string;
};

export function parseHn(data: { hits?: HnHit[] } | null): Raw[] {
  return (data?.hits ?? [])
    .filter((h) => h.title)
    .map((h) => {
      const discussionUrl = `https://news.ycombinator.com/item?id=${h.objectID}`;
      return {
        // Ask/Show HN posts without a link point at the thread itself.
        url: h.url || discussionUrl,
        title: h.title!,
        source: "hn" as const,
        score: h.points ?? 0,
        comments: h.num_comments ?? 0,
        discussionUrl,
        createdAt: h.created_at,
      };
    });
}

async function fromHn(topics: string[], fetchImpl: FetchLike, now: number): Promise<Raw[]> {
  const since = Math.floor((now - WINDOW_DAYS * DAY) / 1000);
  const base = "https://hn.algolia.com/api/v1/search";
  const filters = `numericFilters=${encodeURIComponent(`created_at_i>${since},points>15`)}`;
  const requests = [
    `${base}?tags=front_page&hitsPerPage=50`,
    ...topics.map((t) => `${base}?query=${encodeURIComponent(t)}&tags=story&${filters}&hitsPerPage=15`),
  ];
  const pages = await Promise.all(requests.map((u) => getJson<{ hits: HnHit[] }>(fetchImpl, u)));
  return pages.flatMap(parseHn);
}

type LobstersStory = {
  short_id_url: string;
  title: string;
  url: string;
  score: number;
  comment_count: number;
  created_at: string;
  comments_url: string;
  tags: string[];
};

export function parseLobsters(data: LobstersStory[] | null): Raw[] {
  return (data ?? []).map((s) => ({
    url: s.url || s.comments_url,
    title: s.title,
    source: "lobsters" as const,
    score: s.score,
    comments: s.comment_count,
    discussionUrl: s.comments_url,
    createdAt: s.created_at,
    tags: s.tags,
  }));
}

async function fromLobsters(fetchImpl: FetchLike): Promise<Raw[]> {
  const [hottest, newest] = await Promise.all([
    getJson<LobstersStory[]>(fetchImpl, "https://lobste.rs/hottest.json"),
    getJson<LobstersStory[]>(fetchImpl, "https://lobste.rs/newest.json"),
  ]);
  return [...parseLobsters(hottest), ...parseLobsters(newest)];
}

type DevtoArticle = {
  title: string;
  url: string;
  canonical_url?: string;
  public_reactions_count: number;
  comments_count: number;
  published_at: string;
  tag_list: string[];
};

export function parseDevto(data: DevtoArticle[] | null): Raw[] {
  return (data ?? []).map((a) => ({
    url: a.url,
    title: a.title,
    source: "devto" as const,
    score: a.public_reactions_count,
    comments: a.comments_count,
    discussionUrl: a.url,
    createdAt: a.published_at,
    tags: a.tag_list,
  }));
}

async function fromDevto(topics: string[], fetchImpl: FetchLike): Promise<Raw[]> {
  const tags = [...new Set(topics.map(topicTag).filter((t) => /^[a-z0-9]+$/.test(t)))];
  const pages = await Promise.all(
    tags.map((t) =>
      getJson<DevtoArticle[]>(fetchImpl, `https://dev.to/api/articles?tag=${t}&top=${WINDOW_DAYS}&per_page=10`),
    ),
  );
  return pages.flatMap(parseDevto);
}

/**
 * TLDR newsletters: each RSS item is a daily issue; the issue page lists the
 * individual articles with a summary and read time.
 */
const TLDR_NEWSLETTERS = ["webdev", "tech"] as const;
const TLDR_ISSUES_PER_NEWSLETTER = 3;

export function parseTldrRss(xml: string): { url: string; date: string }[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].flatMap(([, item]) => {
    const url = item.match(/<link>([^<]+)<\/link>/)?.[1]?.trim();
    const date = item.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1]?.trim();
    return url && date && !Number.isNaN(Date.parse(date)) ? [{ url, date: new Date(date).toISOString() }] : [];
  });
}

const stripTags = (html: string) =>
  decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

export function parseTldrIssue(html: string, issue: { url: string; date: string }): Raw[] {
  const article =
    /<article[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>\s*<h3>([\s\S]*?)<\/h3>\s*<\/a>\s*<div class="newsletter-html">([\s\S]*?)<\/div>\s*<\/article>/g;
  return [...html.matchAll(article)].flatMap(([, href, rawTitle, rawSummary]) => {
    const heading = stripTags(rawTitle);
    // Sponsored slots read "(Sponsor)"; skip them.
    if (/\(sponsor\)/i.test(heading) || !/^https?:\/\//.test(href)) return [];
    const minutes = heading.match(/\((\d+) minute read\)\s*$/i);
    const title = heading.replace(/\s*\((?:\d+ minute read|GitHub Repo|Website)\)\s*$/i, "").trim();
    return [
      {
        url: decodeEntities(href),
        title,
        source: "tldr" as const,
        score: 0,
        comments: 0,
        discussionUrl: issue.url,
        createdAt: issue.date,
        summary: stripTags(rawSummary).slice(0, 400) || null,
        readMinutes: minutes ? Number(minutes[1]) : null,
      },
    ];
  });
}

async function fromTldr(fetchImpl: FetchLike): Promise<Raw[]> {
  const feeds = await Promise.all(
    TLDR_NEWSLETTERS.map((n) => getText(fetchImpl, `https://tldr.tech/api/rss/${n}`)),
  );
  const issues = feeds.flatMap((xml) => (xml ? parseTldrRss(xml).slice(0, TLDR_ISSUES_PER_NEWSLETTER) : []));
  const pages = await Promise.all(issues.map(async (issue) => ({ issue, html: await getText(fetchImpl, issue.url) })));
  return pages.flatMap(({ issue, html }) => (html ? parseTldrIssue(html, issue) : []));
}

/** Minimal RSS 2.0 / Atom reader: title, link, date and a short summary per post. */
export function parseFeed(xml: string): { title: string; url: string; date: string; summary: string | null }[] {
  const field = (block: string, tag: string) => {
    const m = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`));
    return m ? m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1") : null;
  };
  const blocks = [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => m[2]);
  return blocks.flatMap((b) => {
    const title = field(b, "title");
    const url = field(b, "link")?.trim() || b.match(/<link\b[^>]*href="([^"]+)"/)?.[1];
    const date = field(b, "pubDate") ?? field(b, "published") ?? field(b, "updated");
    if (!title || !url || !date || Number.isNaN(Date.parse(date))) return [];
    const body = field(b, "description") ?? field(b, "summary") ?? field(b, "content");
    return [
      {
        title: stripTags(title),
        url: decodeEntities(url.trim()),
        date: new Date(date).toISOString(),
        summary: body ? stripTags(body).slice(0, 280) || null : null,
      },
    ];
  });
}

async function fromOfficialBlogs(fetchImpl: FetchLike): Promise<Raw[]> {
  const entries = Object.entries(OFFICIAL) as [SourceId, { feed: string }][];
  const feeds = await Promise.all(entries.map(([, o]) => getText(fetchImpl, o.feed, 400_000)));
  return entries.flatMap(([source], i) =>
    parseFeed(feeds[i] ?? "")
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, OFFICIAL_MAX_POSTS)
      .map((post) => ({
        url: post.url,
        title: post.title,
        source,
        score: 0,
        comments: 0,
        discussionUrl: null,
        createdAt: post.date,
        summary: post.summary,
      })),
  );
}

// ---------- ranking ----------

/**
 * Score = topic relevance + community signal + freshness. dev.to reactions
 * run higher than HN points for the same interest, so they count for less.
 * TLDR has no votes; being picked by its editors is the signal.
 */
export function rankSuggestions(raw: Raw[], topics: string[], now = Date.now()): Suggestion[] {
  const weight: Record<SourceId, number> = { hn: 1, lobsters: 1.5, devto: 0.5, tldr: 0, nextjs: 0, vercel: 0 };
  const CURATED_BONUS = 4;
  const byUrl = new Map<string, Suggestion>();

  for (const r of raw) {
    const text = `${r.title} ${r.summary ?? ""} ${(r.tags ?? []).join(" ")}`;
    const official = OFFICIAL[r.source];
    const matched = matchTopics(text, topics);
    if (official && !matched.includes(official.tag)) matched.unshift(official.tag);
    if (matched.length === 0) continue;

    const ageDays = Math.max(0, (now - Date.parse(r.createdAt)) / DAY);
    if (ageDays > (official ? OFFICIAL_WINDOW_DAYS : WINDOW_DAYS)) continue;
    const rank =
      matched.length * 2 +
      Math.log10(1 + r.score * weight[r.source]) * 2 +
      Math.log10(1 + r.comments) +
      (r.source === "tldr" ? CURATED_BONUS : 0) +
      (official ? OFFICIAL_BONUS : 0) -
      ageDays * 0.25;

    const url = normalizeUrl(r.url);
    const existing = byUrl.get(url);
    if (existing && existing.rank >= rank) continue;
    byUrl.set(url, {
      url,
      title: r.title,
      source: r.source,
      score: r.score,
      comments: r.comments,
      discussionUrl: r.discussionUrl,
      createdAt: r.createdAt,
      summary: r.summary ?? null,
      readMinutes: r.readMinutes ?? null,
      topics: matched,
      rank: Math.round(rank * 100) / 100,
    });
  }

  return [...byUrl.values()].sort((a, b) => b.rank - a.rank);
}

export async function fetchSuggestions(
  topics: string[],
  { fetchImpl = fetch, now = Date.now(), limit = 80 }: { fetchImpl?: FetchLike; now?: number; limit?: number } = {},
): Promise<Suggestion[]> {
  const results = await Promise.all([
    fromHn(topics, fetchImpl, now),
    fromLobsters(fetchImpl),
    fromDevto(topics, fetchImpl),
    fromTldr(fetchImpl),
    fromOfficialBlogs(fetchImpl),
  ]);
  return diversify(rankSuggestions(results.flat(), topics, now), limit);
}

/** Keeps the ranking but stops one chatty source (dev.to) from taking over the feed. */
export function diversify(ranked: Suggestion[], limit: number, maxShare = 0.4): Suggestion[] {
  const cap = Math.ceil(limit * maxShare);
  const perSource = new Map<SourceId, number>();
  const out: Suggestion[] = [];
  for (const s of ranked) {
    if (out.length >= limit) break;
    const n = perSource.get(s.source) ?? 0;
    if (n >= cap) continue;
    perSource.set(s.source, n + 1);
    out.push(s);
  }
  return out;
}
