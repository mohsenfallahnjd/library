import { topicTag } from "./topics";

/**
 * Book suggestions: a hand-picked list of tech books, matched against the
 * stack topics. Search APIs return too much noise for "what should I read
 * next", so the list is curated; Open Library only supplies covers and links.
 */

export interface Book {
  id: string;
  title: string;
  author: string;
  year: number;
  /** Topic tags (same format as topicTag()); "craft" books suit everyone. */
  topics: string[];
  why: string;
}

export const BOOKS: Book[] = [
  { id: "aposd", title: "A Philosophy of Software Design", author: "John Ousterhout", year: 2018, topics: ["software-architecture", "craft"], why: "Deep modules, information hiding and fighting complexity." },
  { id: "ddia", title: "Designing Data-Intensive Applications", author: "Martin Kleppmann", year: 2017, topics: ["postgres", "sql", "software-architecture"], why: "How databases, replication and streams really work." },
  { id: "fosa", title: "Fundamentals of Software Architecture", author: "Mark Richards, Neal Ford", year: 2020, topics: ["software-architecture"], why: "Architecture characteristics, styles and trade-offs." },
  { id: "sa-hard-parts", title: "Software Architecture: The Hard Parts", author: "Neal Ford, Mark Richards, Pramod Sadalage, Zhamak Dehghani", year: 2021, topics: ["software-architecture"], why: "Splitting systems and data when there is no easy answer." },
  { id: "seag", title: "Software Engineering at Google", author: "Titus Winters, Tom Manshreck, Hyrum Wright", year: 2020, topics: ["software-architecture", "craft"], why: "Testing, code review and keeping code healthy over time." },
  { id: "refactoring", title: "Refactoring", author: "Martin Fowler", year: 2018, topics: ["javascript", "craft"], why: "The catalogue of safe code changes, with JavaScript examples." },
  { id: "pragprog", title: "The Pragmatic Programmer", author: "David Thomas, Andrew Hunt", year: 2019, topics: ["craft"], why: "Habits that make you better at the job, 20th anniversary edition." },
  { id: "tidy-first", title: "Tidy First?", author: "Kent Beck", year: 2023, topics: ["craft", "software-architecture"], why: "Small tidyings and when design is worth paying for." },
  { id: "tdd", title: "Test Driven Development: By Example", author: "Kent Beck", year: 2002, topics: ["craft"], why: "Red, green, refactor from the person who named it." },
  { id: "legacy", title: "Working Effectively with Legacy Code", author: "Michael Feathers", year: 2004, topics: ["craft"], why: "Getting untested code under test without breaking it." },
  { id: "learning-ddd", title: "Learning Domain-Driven Design", author: "Vlad Khononov", year: 2021, topics: ["software-architecture"], why: "Bounded contexts and modelling without the jargon." },
  { id: "building-microservices", title: "Building Microservices", author: "Sam Newman", year: 2021, topics: ["software-architecture"], why: "When to split a system, and how to live with it." },
  { id: "release-it", title: "Release It!", author: "Michael T. Nygard", year: 2018, topics: ["software-architecture", "vercel"], why: "Stability patterns for software that runs in production." },
  { id: "accelerate", title: "Accelerate", author: "Nicole Forsgren, Jez Humble, Gene Kim", year: 2018, topics: ["vercel", "craft"], why: "The research behind fast, safe delivery." },
  { id: "effective-ts", title: "Effective TypeScript", author: "Dan Vanderkam", year: 2024, topics: ["typescript"], why: "83 specific ways to write better TypeScript (2nd edition)." },
  { id: "programming-ts", title: "Programming TypeScript", author: "Boris Cherny", year: 2019, topics: ["typescript", "javascript"], why: "The type system from the ground up." },
  { id: "eloquent-js", title: "Eloquent JavaScript", author: "Marijn Haverbeke", year: 2024, topics: ["javascript"], why: "A thorough, modern tour of the language (4th edition)." },
  { id: "js-definitive", title: "JavaScript: The Definitive Guide", author: "David Flanagan", year: 2020, topics: ["javascript", "nodejs"], why: "The reference for the language and its platforms." },
  { id: "ydkjs", title: "You Don't Know JS Yet: Get Started", author: "Kyle Simpson", year: 2020, topics: ["javascript"], why: "Scope, closures and how the engine actually behaves." },
  { id: "fluent-react", title: "Fluent React", author: "Tejas Kumar", year: 2024, topics: ["react", "nextjs"], why: "How React works inside: reconciliation, server components, frameworks." },
  { id: "learning-react", title: "Learning React", author: "Alex Banks, Eve Porcello", year: 2020, topics: ["react", "javascript"], why: "Functional React with hooks, from the basics." },
  { id: "real-world-nextjs", title: "Real-World Next.js", author: "Michele Riva", year: 2022, topics: ["nextjs", "react", "vercel"], why: "Building and deploying production Next.js apps." },
  { id: "learning-patterns", title: "Learning Patterns", author: "Lydia Hallie, Addy Osmani", year: 2021, topics: ["react", "javascript", "web-performance"], why: "Design, rendering and performance patterns for modern web apps." },
  { id: "node-patterns", title: "Node.js Design Patterns", author: "Mario Casciaro, Luciano Mammino", year: 2020, topics: ["nodejs", "bun", "javascript"], why: "Streams, async patterns and scaling Node.js." },
  { id: "art-of-postgresql", title: "The Art of PostgreSQL", author: "Dimitri Fontaine", year: 2019, topics: ["postgres", "sql", "drizzle"], why: "Let the database do the work: SQL as a programming language." },
  { id: "pg-internals", title: "PostgreSQL 14 Internals", author: "Egor Rogov", year: 2023, topics: ["postgres"], why: "MVCC, vacuum, buffers, locks and the planner, in depth." },
  { id: "sql-perf", title: "SQL Performance Explained", author: "Markus Winand", year: 2012, topics: ["sql", "postgres", "drizzle", "web-performance"], why: "Indexing explained so you can reason about any query." },
  { id: "db-internals", title: "Database Internals", author: "Alex Petrov", year: 2019, topics: ["postgres", "sql"], why: "Storage engines and distributed systems under the hood." },
  { id: "sql-antipatterns", title: "SQL Antipatterns, Volume 1", author: "Bill Karwin", year: 2022, topics: ["sql", "postgres", "drizzle"], why: "Common schema and query mistakes, and what to do instead." },
  { id: "hpbn", title: "High Performance Browser Networking", author: "Ilya Grigorik", year: 2013, topics: ["web-performance", "vercel"], why: "TCP, TLS, HTTP/2 and what makes the web fast." },
  { id: "systems-performance", title: "Systems Performance", author: "Brendan Gregg", year: 2020, topics: ["web-performance", "nodejs"], why: "Methodologies and tools for finding performance problems." },
  { id: "refactoring-ui", title: "Refactoring UI", author: "Adam Wathan, Steve Schoger", year: 2018, topics: ["tailwind", "react"], why: "Practical design tactics from the makers of Tailwind." },
  { id: "every-layout", title: "Every Layout", author: "Heydon Pickering, Andy Bell", year: 2019, topics: ["tailwind", "web-performance"], why: "Robust CSS layout primitives that adapt without breakpoints." },
  { id: "inclusive-components", title: "Inclusive Components", author: "Heydon Pickering", year: 2019, topics: ["react", "tailwind"], why: "Accessible versions of the components you build every day." },
  { id: "staff-path", title: "The Staff Engineer's Path", author: "Tanya Reilly", year: 2022, topics: ["craft"], why: "Big-picture thinking and leading without managing." },
  { id: "grokking-algorithms", title: "Grokking Algorithms", author: "Aditya Bhargava", year: 2024, topics: ["craft", "javascript"], why: "Algorithms explained with pictures (2nd edition)." },
];

export type BookSuggestion = Book & { matched: string[]; score: number };

/**
 * Books that match the stack topics (and, a little, the tags you actually
 * read), minus ones already in the library or dismissed. Craft books fill
 * the list for everyone.
 */
export function suggestBooks(
  topics: string[],
  { libraryTitles = [], libraryTags = [], dismissed = new Set<string>(), limit = 18 }: {
    libraryTitles?: string[];
    libraryTags?: string[];
    dismissed?: Set<string>;
    limit?: number;
  } = {},
): BookSuggestion[] {
  const stack = new Set(topics.map(topicTag));
  const tagCounts = new Map<string, number>();
  for (const t of libraryTags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const owned = libraryTitles.map(normalizeTitle);

  return BOOKS.filter((b) => !dismissed.has(`book:${b.id}`))
    .filter((b) => !owned.some((t) => t.includes(normalizeTitle(b.title))))
    .map((b) => {
      const matched = b.topics.filter((t) => stack.has(t));
      const interest = b.topics.reduce((sum, t) => sum + Math.min(tagCounts.get(t) ?? 0, 5) * 0.3, 0);
      const craft = b.topics.includes("craft") ? 1 : 0;
      // Newer editions age better in fast-moving topics.
      const fresh = Math.max(0, b.year - 2015) * 0.05;
      return { ...b, matched, score: matched.length * 2 + interest + craft + fresh };
    })
    .filter((b) => b.matched.length > 0 || b.topics.includes("craft"))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** "The Pragmatic Programmer" → "pragmatic programmer", for "already have it" checks. */
export function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- Open Library: covers and links ----------

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
export type BookLinks = { coverUrl: string | null; pageUrl: string };

/** Finds the book on Open Library; falls back to a search link. Never throws. */
export async function openLibraryLinks(book: Pick<Book, "title" | "author">, fetchImpl: FetchLike = fetch): Promise<BookLinks> {
  const firstAuthor = book.author.split(",")[0].trim();
  const search = `https://openlibrary.org/search?q=${encodeURIComponent(`${book.title} ${firstAuthor}`)}`;
  try {
    const res = await fetchImpl(
      `https://openlibrary.org/search.json?title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(firstAuthor)}&limit=1&fields=key,cover_i`,
      { signal: AbortSignal.timeout(8000), headers: { "user-agent": "LibraryBot/1.0 (personal reading list)" } },
    );
    if (!res.ok) return { coverUrl: null, pageUrl: search };
    const doc = ((await res.json()) as { docs?: { key?: string; cover_i?: number }[] }).docs?.[0];
    return {
      coverUrl: doc?.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
      pageUrl: doc?.key ? `https://openlibrary.org${doc.key}` : search,
    };
  } catch {
    return { coverUrl: null, pageUrl: search };
  }
}
