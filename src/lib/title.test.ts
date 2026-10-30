import { describe, expect, it, vi } from "vitest";
import { fetchTitle, parseTitle } from "./title";

const html = (head: string, type = "text/html; charset=utf-8") =>
  vi.fn(async () => new Response(`<html><head>${head}</head><body>${"x".repeat(1000)}</body></html>`, {
    headers: { "content-type": type },
  }));

describe("parseTitle", () => {
  it("prefers og:title over <title>", () => {
    expect(
      parseTitle(`<title>Site | Post</title><meta property="og:title" content="The Post" /><meta property="og:site_name" content="Site">`),
    ).toEqual({ title: "The Post", siteName: "Site" });
  });

  it("handles attribute order, single quotes and twitter:title", () => {
    expect(parseTitle(`<meta content='Tweet title' name='twitter:title'>`).title).toBe("Tweet title");
  });

  it("decodes entities and collapses whitespace", () => {
    expect(parseTitle(`<title>\n  Tom &amp; Jerry &#8211; &#x1F600; &quot;hi&quot;\n</title>`).title).toBe(
      'Tom & Jerry – 😀 "hi"',
    );
  });

  it("returns an empty title when there is none", () => {
    expect(parseTitle("<p>nothing</p>").title).toBe("");
  });
});

describe("fetchTitle", () => {
  it("fetches and parses the page", async () => {
    const f = html(`<title>Hello</title>`);
    expect(await fetchTitle("https://example.com/a", f)).toEqual({ title: "Hello" });
    expect(f).toHaveBeenCalledWith("https://example.com/a", expect.objectContaining({ redirect: "follow" }));
  });

  it("falls back to the hostname on errors, non-HTML and empty titles", async () => {
    const boom = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    expect(await fetchTitle("https://www.example.com/a", boom)).toEqual({ title: "example.com" });
    expect(await fetchTitle("https://example.com/f.pdf", html("", "application/pdf"))).toEqual({ title: "example.com" });
    expect(await fetchTitle("https://example.com/", html("<title> </title>"))).toMatchObject({ title: "example.com" });
    const notFound = vi.fn(async () => new Response("nope", { status: 404 }));
    expect(await fetchTitle("https://example.com/404", notFound)).toEqual({ title: "example.com" });
  });

  it("uses the HN API for Hacker News threads", async () => {
    const f = vi.fn(async () => Response.json({ title: "Show HN: My library" }));
    expect(await fetchTitle("https://news.ycombinator.com/item?id=42", f)).toEqual({
      title: "Show HN: My library",
      siteName: "Hacker News",
    });
    expect(f).toHaveBeenCalledWith("https://hn.algolia.com/api/v1/items/42", expect.anything());
  });

  it("does not fetch private hosts", async () => {
    const f = html("<title>secret</title>");
    expect(await fetchTitle("http://localhost:3000/admin", f)).toEqual({ title: "localhost" });
    expect(await fetchTitle("http://192.168.1.1/", f)).toEqual({ title: "192.168.1.1" });
    expect(f).not.toHaveBeenCalled();
  });

  it("rejects non-http URLs", async () => {
    await expect(fetchTitle("ftp://example.com")).rejects.toThrow("Invalid URL");
  });
});
