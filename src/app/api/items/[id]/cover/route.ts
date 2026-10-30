import { NextResponse } from "next/server";
import { ItemError, setCover } from "@/lib/items";

/** POST a JPEG body: the book's first page, rendered in the browser. */
export async function POST(request: Request, ctx: RouteContext<"/api/items/[id]/cover">) {
  const { id } = await ctx.params;
  const image = new Blob([await request.arrayBuffer()], { type: request.headers.get("content-type") ?? "" });
  try {
    const item = await setCover(id, image);
    return NextResponse.json({ coverKey: item.coverKey });
  } catch (err) {
    if (err instanceof ItemError) {
      return NextResponse.json({ error: err.message }, { status: err.code === "not_found" ? 404 : 400 });
    }
    throw err;
  }
}
