import { brandIcon } from "@/lib/brand-icon";

const SIZES = { "192": 192, "512": 512, "maskable-512": 512 } as const;

export function generateStaticParams() {
  return Object.keys(SIZES).map((size) => ({ size }));
}

export async function GET(_: Request, ctx: RouteContext<"/pwa-icon/[size]">) {
  const { size } = await ctx.params;
  const px = SIZES[size as keyof typeof SIZES];
  if (!px) return new Response("Not found", { status: 404 });
  return brandIcon(px, { padded: size.startsWith("maskable") });
}
