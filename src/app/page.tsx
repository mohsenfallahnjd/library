import { clsx } from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/auto-refresh";
import { FeedList } from "@/components/feed-list";
import { SOURCE_LABEL, type SourceId } from "@/lib/discover";
import { getFeed } from "@/lib/discover-feed";
import { listItems } from "@/lib/items";
import { markedKeys } from "@/lib/marks-db";
import { getStackTopics } from "@/lib/stack";
import { topicTag } from "@/lib/topics";
import { normalizeUrl } from "@/lib/url";

export const metadata: Metadata = { title: "Feed" };

export default function FeedPage({ searchParams }: PageProps<"/">) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Today in your stack</h1>
        <p className="text-sm text-muted">
          Hacker News, Lobsters, dev.to and TLDR filtered to your topics, plus the Next.js and Vercel blogs.{" "}
          <Link href="/settings#stack" className="underline decoration-line underline-offset-2 hover:text-ink">
            Edit topics
          </Link>
        </p>
      </div>
      <Suspense fallback={<FeedSkeleton />}>
        <Feed searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Feed({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const params = await searchParams;
  const topic = typeof params.topic === "string" ? params.topic : undefined;
  const source = typeof params.source === "string" && params.source in SOURCE_LABEL ? (params.source as SourceId) : undefined;

  const topics = await getStackTopics();
  const [{ suggestions, fetchedAt }, items, marked] = await Promise.all([getFeed(topics), listItems(), markedKeys()]);
  const reading = items.filter((i) => i.kind === "book" && i.status === "reading" && i.fileKey);
  const saved = new Set(items.flatMap((i) => (i.url ? [normalizeUrl(i.url)] : [])));
  // Read, hidden and saved stories are done with; the feed is what's left.
  const shown = suggestions.filter(
    (s) => !marked.has(s.url) && !saved.has(s.url) && (!topic || s.topics.includes(topic)) && (!source || s.source === source),
  );

  const href = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ topic, source, ...patch })) if (v) next.set(k, v);
    const qs = next.toString();
    return qs ? `/?${qs}` : "/";
  };
  const chip = (active: boolean) =>
    clsx(
      "shrink-0 rounded-full border px-2.5 py-1 text-xs",
      active ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-muted",
    );

  return (
    <div className="space-y-3">
      {reading.length > 0 && (
        <section aria-label="Continue reading" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {reading.map((b) => {
            const pct = b.totalPages && b.lastPage ? Math.round((b.lastPage / b.totalPages) * 100) : 0;
            return (
              <Link
                key={b.id}
                href={`/read/${b.id}`}
                className="flex w-64 shrink-0 items-center gap-3 rounded-xl border border-line bg-surface p-2 pr-3 hover:border-accent/50"
              >
                {b.coverKey ? (
                  // eslint-disable-next-line @next/next/no-img-element -- private file served by our own route
                  <img src={`/api/files/${b.coverKey}`} alt="" className="h-12 w-9 shrink-0 rounded-sm border border-black/10 object-cover object-top" />
                ) : (
                  <span className="h-12 w-9 shrink-0 rounded-sm bg-accent/20" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{b.title}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="font-mono text-[11px] text-muted">p.{b.lastPage ?? 1}</span>
                  </span>
                </span>
              </Link>
            );
          })}
        </section>
      )}
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <Link href={href({ source: undefined })} className={chip(!source)}>
          All sources
        </Link>
        {(Object.keys(SOURCE_LABEL) as SourceId[]).map((s) => (
          <Link key={s} href={href({ source: s })} className={chip(source === s)}>
            {SOURCE_LABEL[s]}
          </Link>
        ))}
      </div>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 font-mono [scrollbar-width:none]">
        {topics.map((t) => {
          const tag = topicTag(t);
          return (
            <Link key={tag} href={href({ topic: topic === tag ? undefined : tag })} className={chip(topic === tag)}>
              #{tag}
            </Link>
          );
        })}
      </div>

      <FeedList key={`${topic}-${source}`} stories={shown} savedUrls={[...saved]} live={<AutoRefresh fetchedAt={fetchedAt} />} />
    </div>
  );
}

function FeedSkeleton() {
  return (
    <ul className="space-y-2" aria-busy>
      {[0, 1, 2, 3, 4].map((i) => (
        <li key={i} className="h-16 animate-pulse rounded-xl border border-line bg-surface" />
      ))}
    </ul>
  );
}
