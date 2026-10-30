import { NextResponse } from "next/server";
import { ItemError, progressSchema, updateProgress } from "@/lib/items";

/**
 * Saves reader progress: { lastPage, totalPages? }.
 * PATCH from the reader; POST too, because navigator.sendBeacon can only POST.
 */
async function saveProgress(request: Request, ctx: RouteContext<"/api/items/[id]">) {
  const { id } = await ctx.params;
  const body = progressSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid progress" }, { status: 400 });
  try {
    const item = await updateProgress(id, body.data);
    return NextResponse.json({ lastPage: item.lastPage, totalPages: item.totalPages, status: item.status });
  } catch (err) {
    if (err instanceof ItemError) {
      return NextResponse.json({ error: err.message }, { status: err.code === "not_found" ? 404 : 400 });
    }
    throw err;
  }
}

export { saveProgress as PATCH, saveProgress as POST };
