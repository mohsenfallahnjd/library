import { describe, expect, it } from "vitest";
import { findUrl, normalizeUrl } from "./url";

describe("findUrl", () => {
  it("takes a plain URL", () => {
    expect(findUrl("https://nextjs.org/blog")).toBe("https://nextjs.org/blog");
  });

  it("finds the link inside text, other fields or nested values", () => {
    expect(findUrl("Next.js Blog\nhttps://nextjs.org/blog")).toBe("https://nextjs.org/blog");
    expect(findUrl(undefined, { text: "read this: https://bun.sh/blog." })).toBe("https://bun.sh/blog");
    expect(findUrl("", { page: { link: ["https://a.dev/x"] } })).toBe("https://a.dev/x");
  });

  it("accepts a bare domain", () => {
    expect(findUrl("vercel.com/blog")).toBe("https://vercel.com/blog");
  });

  it("returns null when there is no link", () => {
    expect(findUrl("", undefined, { title: "Just a title" })).toBeNull();
  });
});

describe("normalizeUrl", () => {
  it("keeps real query params", () => {
    expect(normalizeUrl("https://x.dev/?id=1&utm_source=a")).toBe("https://x.dev/?id=1");
  });
});
