import { NextResponse } from "next/server";
import { z } from "zod";
import { hasApiToken } from "@/lib/api-token";
import { addItem, ItemError } from "@/lib/items";
import { findUrl } from "@/lib/url";

/**
 * Quick-save, e.g. from an iOS Shortcut:
 *   POST /api/items  Authorization: Bearer <LIBRARY_API_TOKEN>
 *   { "url": "https://…", "title"?: "…", "kind"?: "article" | "site", "tags"?: "a, b" }
 * Share sheets send the link in odd shapes (inside `text`, next to the title,
 * without https://), so the link is looked for in every field.
 * The bearer token is required even when signed in: the UI uses server actions.
 */
const body = z
  .object({
    title: z.string().optional(),
    kind: z.enum(["article", "site"]).optional(),
    tags: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .passthrough();

const NO_LINK =
  "No link found. Share a page from Safari (the Share sheet), or add “Get URLs from Shortcut Input” before this step and send its result as url.";

export async function POST(request: Request) {
  if (!hasApiToken(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = request.headers.get("content-type")?.includes("application/json")
    ? await request.json().catch(() => null)
    : Object.fromEntries((await request.formData().catch(() => new FormData())).entries());
  const parsed = body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const { title, kind, tags, ...rest } = parsed.data;
  // Prefer the url field, then anything else that holds a link.
  const url = findUrl((rest as { url?: unknown }).url, rest, title);
  if (!url) return NextResponse.json({ error: NO_LINK }, { status: 400 });
  // When the title field is the link itself, let the app fetch the real title.
  const cleanTitle = title && !findUrl(title) ? title : undefined;

  try {
    const { item, created } = await addItem({ url, title: cleanTitle, kind, tags, source: "quick-save" });
    return NextResponse.json(
      { id: item.id, title: item.title, url: item.url, tags: item.tags, created },
      { status: created ? 201 : 200 },
    );
  } catch (err) {
    if (err instanceof ItemError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
