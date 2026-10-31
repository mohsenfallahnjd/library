import { describe, expect, it, vi } from "vitest";
import { BOOKS, normalizeTitle, openLibraryLinks, suggestBooks } from "./books";
import { topicTag } from "./topics";

describe("BOOKS", () => {
  it("has unique ids and only known topic tags", () => {
    expect(new Set(BOOKS.map((b) => b.id)).size).toBe(BOOKS.length);
    const known = new Set(["craft", ...["Next.js", "React", "TypeScript", "JavaScript", "Node.js", "Bun", "Tailwind", "Postgres", "Drizzle", "Vercel", "SQL", "Web Performance", "Software Architecture"].map(topicTag)]);
    for (const b of BOOKS) for (const t of b.topics) expect(known, `${b.id}: ${t}`).toContain(t);
  });
});

describe("suggestBooks", () => {
  it("puts books for your stack first and says why", () => {
    const [first] = suggestBooks(["Postgres", "SQL"]);
    expect(first.matched).toEqual(expect.arrayContaining(["postgres", "sql"]));
  });

  it("skips books you already have or dismissed", () => {
    const list = suggestBooks(["Software Architecture"], {
      libraryTitles: ["2018 John Ousterhout A Philosophy of Software Design"],
      dismissed: new Set(["book:fosa"]),
    });
    expect(list.map((b) => b.id)).not.toContain("aposd");
    expect(list.map((b) => b.id)).not.toContain("fosa");
  });

  it("only suggests craft books when nothing matches", () => {
    expect(suggestBooks(["Elixir"]).every((b) => b.topics.includes("craft"))).toBe(true);
  });

  it("leans towards tags you read a lot", () => {
    const base = suggestBooks(["TypeScript", "React"]);
    const reactFan = suggestBooks(["TypeScript", "React"], { libraryTags: Array(5).fill("react") });
    const rank = (list: typeof base, id: string) => list.findIndex((b) => b.id === id);
    expect(rank(reactFan, "fluent-react")).toBeLessThanOrEqual(rank(base, "fluent-react"));
  });

  it("normalizes titles", () => {
    expect(normalizeTitle("The Pragmatic Programmer!")).toBe("pragmatic programmer");
  });
});

describe("openLibraryLinks", () => {
  it("returns the cover and work page", async () => {
    const f = vi.fn(async () => Response.json({ docs: [{ key: "/works/OL123W", cover_i: 42 }] }));
    expect(await openLibraryLinks({ title: "Tidy First?", author: "Kent Beck" }, f)).toEqual({
      coverUrl: "https://covers.openlibrary.org/b/id/42-M.jpg",
      pageUrl: "https://openlibrary.org/works/OL123W",
    });
  });

  it("falls back to a search link", async () => {
    const f = vi.fn(async () => {
      throw new Error("offline");
    });
    const links = await openLibraryLinks({ title: "Tidy First?", author: "Kent Beck, Someone" }, f);
    expect(links).toEqual({ coverUrl: null, pageUrl: "https://openlibrary.org/search?q=Tidy%20First%3F%20Kent%20Beck" });
  });
});
