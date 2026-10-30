import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fetchTitle, parseHttpUrl } from "@/lib/title";

const query = z.object({ url: z.string().refine((v) => parseHttpUrl(v) !== null) });

/** GET /api/title?url=… → { title, siteName? } */
export async function GET(request: NextRequest) {
  const parsed = query.safeParse({ url: request.nextUrl.searchParams.get("url") ?? "" });
  if (!parsed.success) return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  return NextResponse.json(await fetchTitle(parsed.data.url));
}
