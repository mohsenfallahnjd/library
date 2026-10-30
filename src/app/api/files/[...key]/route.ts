import { readFile } from "@/lib/storage";

/** Streams a stored PDF. Blobs are private, so every read goes through here (and auth). */
export async function GET(_: Request, ctx: RouteContext<"/api/files/[...key]">) {
  const { key } = await ctx.params;
  const file = await readFile(key.join("/"));
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(file.body, {
    headers: {
      "content-type": file.contentType,
      ...(file.size ? { "content-length": String(file.size) } : {}),
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
}
