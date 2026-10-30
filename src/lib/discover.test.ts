import { describe, expect, it, vi } from "vitest";
import { diversify, fetchSuggestions, parseFeed, parseHn, parseTldrIssue, parseTldrRss, rankSuggestions } from "./discover";

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

describe("TLDR", () => {
  it("reads issue links and dates from the RSS feed", () => {
    const xml = `<rss><channel><item><title><![CDATA[Faster web vitals]]></title><link>https://tldr.tech/dev/2026-10-30</link>
      <pubDate>Fri, 30 Oct 2026 00:00:00 GMT</pubDate></item><item><link>https://tldr.tech/dev/2026-10-29</link><pubDate>nope</pubDate></item></channel></rss>`;
    expect(parseTldrRss(xml)).toEqual([{ url: "https://tldr.tech/dev/2026-10-30", date: "2026-10-30T00:00:00.000Z" }]);
  });

  it("parses articles with summaries and skips sponsors", () => {
    const html = `<section>
      <article class="mt-3"><a class="font-bold" href="https://blog.sentry.io/soft-nav/?utm_source=tldrdev" target="_blank"><h3>Measuring Soft Navigation Web Vitals (11 minute read)</h3></a><div class="newsletter-html">Sentry&#x27;s SDK measures <b>LCP</b> for Next.js routes.</div></article>
      <article class="mt-3"><a class="font-bold" href="https://ads.example.com/?utm_source=tldr"><h3>Ship faster with Acme (Sponsor)</h3></a><div class="newsletter-html">Buy now.</div></article>
      <article class="mt-3"><a class="font-bold" href="https://github.com/x/y?utm_source=tldrdev"><h3>drizzle-kit-ui (GitHub Repo)</h3></a><div class="newsletter-html">A UI.</div></article>
    </section>`;
    const issue = { url: "https://tldr.tech/dev/2026-10-30", date: hoursAgo(12) };
    const [first, repo, ...rest] = parseTldrIssue(html, issue);
    expect(rest).toEqual([]);
    expect(first).toMatchObject({
      url: "https://blog.sentry.io/soft-nav/?utm_source=tldrdev",
      title: "Measuring Soft Navigation Web Vitals",
      summary: "Sentry's SDK measures LCP for Next.js routes.",
      readMinutes: 11,
      source: "tldr",
      discussionUrl: issue.url,
    });
    expect(repo).toMatchObject({ title: "drizzle-kit-ui", readMinutes: null });
  });

  it("matches topics in the summary and strips tracking params when ranking", () => {
    const [s] = rankSuggestions(
      [
        {
          url: "https://blog.sentry.io/soft-nav/?utm_source=tldrdev",
          title: "Measuring Soft Navigation Web Vitals",
          summary: "Works with Next.js routes.",
          source: "tldr",
          score: 0,
          comments: 0,
          discussionUrl: null,
          createdAt: hoursAgo(12),
        },
      ],
      topics,
      NOW,
    );
    expect(s).toMatchObject({ url: "https://blog.sentry.io/soft-nav/", topics: ["nextjs"], summary: "Works with Next.js routes." });
  });
});

describe("official blogs", () => {
  it("parses RSS and Atom", () => {
    const rss = `<rss><channel><title>Next.js Blog</title><item><title><![CDATA[Next.js 17]]></title>
      <description><![CDATA[New <b>caching</b> APIs.]]></description><link>https://nextjs.org/blog/next-17</link>
      <pubDate>Wed, 28 Oct 2026 20:00:00 GMT</pubDate></item></channel></rss>`;
    const atom = `<feed><title>Vercel News</title><entry><id>x</id><title>Introducing Geist Serif</title>
      <link href="https://vercel.com/blog/introducing-geist-serif"/><updated>2026-10-30T13:00:00.000Z</updated>
      <content type="xhtml"><div><p>Geist started as a monospace typeface &amp; grew.</p></div></content></entry></feed>`;
    expect(parseFeed(rss)).toEqual([
      { title: "Next.js 17", url: "https://nextjs.org/blog/next-17", date: "2026-10-28T20:00:00.000Z", summary: "New caching APIs." },
    ]);
    expect(parseFeed(atom)).toEqual([
      {
        title: "Introducing Geist Serif",
        url: "https://vercel.com/blog/introducing-geist-serif",
        date: "2026-10-30T13:00:00.000Z",
        summary: "Geist started as a monospace typeface & grew.",
      },
    ]);
  });

  it("always keeps official posts, tagged with their topic, for 30 days", () => {
    const post = { score: 0, comments: 0, discussionUrl: null, source: "vercel" as const };
    const ranked = rankSuggestions(
      [
        { ...post, url: "https://vercel.com/blog/a", title: "Introducing Geist Serif", createdAt: hoursAgo(24 * 20) },
        { ...post, url: "https://vercel.com/blog/b", title: "Old news", createdAt: hoursAgo(24 * 40) },
      ],
      topics, // "Vercel" is not even in this topic list
      NOW,
    );
    expect(ranked.map((s) => [s.url, s.topics])).toEqual([["https://vercel.com/blog/a", ["vercel"]]]);
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

describe("diversify", () => {
  it("caps any one source at 40% of the feed, keeping order", () => {
    const make = (source: "devto" | "hn", i: number) => ({
      url: `https://${source}.dev/${i}`, title: "t", source, score: 0, comments: 0, discussionUrl: null,
      createdAt: hoursAgo(1), topics: [], rank: 100 - i,
    });
    const ranked = [...Array.from({ length: 8 }, (_, i) => make("devto", i)), make("hn", 9), make("hn", 10)];
    expect(diversify(ranked, 5).map((s) => s.source)).toEqual(["devto", "devto", "hn", "hn"]);
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
