import { normalizeUrl } from "./url";
import { matchTopics, topicTag } from "./topics";

/**
 * Discover: recent tech articles from Hacker News, Lobsters and dev.to,
 * kept only when they mention one of the stack topics, and ranked by
 * topic matches, community score and freshness.
 */

export type SourceId = "hn" | "lobsters" | "devto";

export interface Suggestion {
  url: string;
  title: string;
  source: SourceId;
  score: number;
  comments: number;
  discussionUrl: string | null;
  createdAt: string; // ISO, so it can cross the cache boundary
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
};

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

// ---------- ranking ----------

/**
 * Score = topic relevance + community signal + freshness. dev.to reactions
 * run higher than HN points for the same interest, so they count for less.
 */
export function rankSuggestions(raw: Raw[], topics: string[], now = Date.now()): Suggestion[] {
  const weight: Record<SourceId, number> = { hn: 1, lobsters: 1.5, devto: 0.5 };
  const byUrl = new Map<string, Suggestion>();

  for (const r of raw) {
    const text = `${r.title} ${(r.tags ?? []).join(" ")}`;
    const matched = matchTopics(text, topics);
    if (matched.length === 0) continue;

    const ageDays = Math.max(0, (now - Date.parse(r.createdAt)) / DAY);
    if (ageDays > WINDOW_DAYS) continue;
    const rank =
      matched.length * 2 + Math.log10(1 + r.score * weight[r.source]) * 2 + Math.log10(1 + r.comments) - ageDays * 0.25;

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
      topics: matched,
      rank: Math.round(rank * 100) / 100,
    });
  }

  return [...byUrl.values()].sort((a, b) => b.rank - a.rank);
}

export async function fetchSuggestions(
  topics: string[],
  { fetchImpl = fetch, now = Date.now(), limit = 60 }: { fetchImpl?: FetchLike; now?: number; limit?: number } = {},
): Promise<Suggestion[]> {
  const results = await Promise.all([
    fromHn(topics, fetchImpl, now),
    fromLobsters(fetchImpl),
    fromDevto(topics, fetchImpl),
  ]);
  return rankSuggestions(results.flat(), topics, now).slice(0, limit);
}
