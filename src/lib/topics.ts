/**
 * Stack topics: the technologies the library cares about. They drive
 * auto-tagging of new items and the ranking on the Discover page.
 */

export const DEFAULT_TOPICS = [
  "Next.js",
  "React",
  "TypeScript",
  "JavaScript",
  "Node.js",
  "Bun",
  "Tailwind",
  "Postgres",
  "Drizzle",
  "Vercel",
  "SQL",
  "PDF.js",
  "Web Performance",
  "Software Architecture",
];

/** Extra spellings that should count as the same topic. */
const ALIASES: Record<string, string[]> = {
  postgres: ["postgresql", "psql"],
  typescript: ["ts"],
  javascript: ["ecmascript"],
  react: ["rsc", "react server components"],
  tailwind: ["tailwindcss"],
  drizzle: ["drizzle orm", "drizzle-orm"],
  nextjs: ["next"],
};

/** "Next.js" → "nextjs", "Web Performance" → "web-performance". */
export function topicTag(topic: string) {
  return topic
    .toLowerCase()
    .trim()
    .replace(/\.(?=[a-z])/g, "")
    .replace(/[^a-z0-9+#]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Matches "Next.js", "nextjs", "next js" for the topic "Next.js". */
function topicPattern(topic: string) {
  const tag = topicTag(topic);
  const spellings = [topic, ...(ALIASES[tag] ?? [])].map((s) =>
    escape(s.toLowerCase().trim())
      .replace(/\\\./g, "[. ]?")
      .replace(/[\s-]+/g, "[\\s-]?"),
  );
  // "next" alone is too common; only accept it as "next 16", "next.js" etc.
  const alternatives = spellings.map((s) => (s === "next" ? "next(?=\\s?\\d)" : s));
  return new RegExp(`(?<![a-z0-9./])(?:${alternatives.join("|")})(?![a-z0-9])`, "i");
}

/** Returns the tags of all topics mentioned in `text`, in topic order. */
export function matchTopics(text: string, topics: string[]): string[] {
  const out: string[] = [];
  for (const topic of topics) {
    const tag = topicTag(topic);
    if (tag && !out.includes(tag) && topicPattern(topic).test(text)) out.push(tag);
  }
  return out;
}
