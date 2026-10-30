import { NextResponse } from "next/server";
import { z } from "zod";
import { hasApiToken } from "@/lib/api-token";
import { addItem, ItemError } from "@/lib/items";

/**
 * Quick-save, e.g. from an iOS Shortcut:
 *   POST /api/items  Authorization: Bearer <LIBRARY_API_TOKEN>
 *   { "url": "https://…", "title"?: "…", "kind"?: "article" | "site", "tags"?: "a, b" }
 * Share sheets sometimes send the link inside `text`, so that works too.
 * The bearer token is required even when signed in: the UI uses server actions.
 */
const body = z
  .object({
    url: z.string().optional(),
    text: z.string().optional(),
    title: z.string().optional(),
    kind: z.enum(["article", "site"]).optional(),
    tags: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .transform(({ url, text, ...rest }) => ({
    ...rest,
    url: url?.trim() || text?.match(/https?:\/\/\S+/)?.[0] || "",
  }));

export async function POST(request: Request) {
  if (!hasApiToken(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = request.headers.get("content-type")?.includes("application/json")
    ? await request.json().catch(() => null)
    : Object.fromEntries((await request.formData().catch(() => new FormData())).entries());
  const parsed = body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  try {
    const { item, created } = await addItem({ ...parsed.data, source: "quick-save" });
    return NextResponse.json(
      { id: item.id, title: item.title, url: item.url, tags: item.tags, created },
      { status: created ? 201 : 200 },
    );
  } catch (err) {
    if (err instanceof ItemError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
