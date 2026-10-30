import { describe, expect, it, vi } from "vitest";
import { fetchSuggestions, parseHn, rankSuggestions } from "./discover";

const NOW = Date.parse("2026-10-30T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();
const topics = ["Next.js", "Postgres", "TypeScript"];

describe("parseHn", () => {
  it("maps hits and links text posts to their thread", () => {
    const [link, ask] = parseHn({
      hits: [
        { objectID: "1", title: "Postgres 18", url: "https://pg.dev/18", points: 300, num_comments: 90, created_at: hoursAgo(2) },
        { objectID: "2", title: "Ask HN: TypeScript tips?", url: null, points: 40, num_comments: 12, created_at: hoursAgo(5) },
      ],
    });
    expect(link).toMatchObject({ url: "https://pg.dev/18", discussionUrl: "https://news.ycombinator.com/item?id=1" });
    expect(ask.url).toBe("https://news.ycombinator.com/item?id=2");
  });
});

describe("rankSuggestions", () => {
  const base = { comments: 10, discussionUrl: null, createdAt: hoursAgo(3) };

  it("drops stories that match no topic and stale ones", () => {
    const ranked = rankSuggestions(
      [
        { ...base, url: "https://a.dev", title: "Rust async deep dive", source: "hn", score: 900 },
        { ...base, url: "https://b.dev", title: "Next.js caching", source: "hn", score: 50 },
        { ...base, url: "https://c.dev", title: "Old Postgres post", source: "hn", score: 50, createdAt: hoursAgo(24 * 30) },
      ],
      topics,
      NOW,
    );
    expect(ranked.map((s) => s.url)).toEqual(["https://b.dev/"]);
    expect(ranked[0].topics).toEqual(["nextjs"]);
  });

  it("uses source tags for matching", () => {
    const [s] = rankSuggestions(
      [{ ...base, url: "https://d.dev", title: "Shipping faster", source: "devto", score: 20, tags: ["typescript"] }],
      topics,
      NOW,
    );
    expect(s.topics).toEqual(["typescript"]);
  });

  it("ranks more relevant, more popular and fresher stories higher", () => {
    const ranked = rankSuggestions(
      [
        { ...base, url: "https://low.dev", title: "Postgres notes", source: "hn", score: 5 },
        { ...base, url: "https://both.dev", title: "Next.js with Postgres", source: "hn", score: 5 },
        { ...base, url: "https://popular.dev", title: "Postgres at scale", source: "hn", score: 2000, comments: 600 },
      ],
      topics,
      NOW,
    );
    expect(ranked.map((s) => s.url)).toEqual(["https://popular.dev/", "https://both.dev/", "https://low.dev/"]);
  });

  it("dedupes the same URL across sources, keeping the best", () => {
    const ranked = rankSuggestions(
      [
        { ...base, url: "https://same.dev/x?utm_source=hn", title: "TypeScript 6", source: "hn", score: 400 },
        { ...base, url: "https://same.dev/x", title: "TypeScript 6", source: "lobsters", score: 3 },
      ],
      topics,
      NOW,
    );
    expect(ranked).toHaveLength(1);
    expect(ranked[0].source).toBe("hn");
  });
});

describe("fetchSuggestions", () => {
  it("queries all sources and survives a failing one", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes("lobste.rs")) throw new Error("down");
      if (url.includes("hn.algolia.com"))
        return Response.json({
          hits: [{ objectID: "9", title: "Next.js 17 released", url: "https://nextjs.org/blog/17", points: 500, num_comments: 200, created_at: hoursAgo(1) }],
        });
      return Response.json([
        { title: "Typed SQL", url: "https://dev.to/x", public_reactions_count: 30, comments_count: 2, published_at: hoursAgo(10), tag_list: ["postgres"] },
      ]);
    });
    const result = await fetchSuggestions(topics, { fetchImpl, now: NOW });
    expect(result.map((s) => s.source)).toEqual(["hn", "devto"]);
    expect(fetchImpl.mock.calls.some(([u]) => u.includes("dev.to/api/articles?tag=nextjs"))).toBe(true);
  });
});
