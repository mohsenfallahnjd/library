import { describe, expect, it } from "vitest";
import { DEFAULT_TOPICS, matchTopics, topicTag } from "./topics";

describe("topics", () => {
  it("turns topics into tags", () => {
    expect(topicTag("Next.js")).toBe("nextjs");
    expect(topicTag("Web Performance")).toBe("web-performance");
    expect(topicTag("PDF.js")).toBe("pdfjs");
  });

  it("matches spellings and aliases on word boundaries", () => {
    expect(matchTopics("Next 16 ships proxy.ts", DEFAULT_TOPICS)).toEqual(["nextjs"]);
    expect(matchTopics("Why I moved from nextjs to remix", DEFAULT_TOPICS)).toEqual(["nextjs"]);
    expect(matchTopics("PostgreSQL 18 and Drizzle ORM", DEFAULT_TOPICS)).toEqual(["postgres", "drizzle"]);
    expect(matchTopics("Reactive programming in Rust", DEFAULT_TOPICS)).toEqual([]);
    expect(matchTopics("The next big thing", DEFAULT_TOPICS)).toEqual([]);
    expect(matchTopics("Bundling with Bun", DEFAULT_TOPICS)).toEqual(["bun"]);
  });
});
