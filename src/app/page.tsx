import { clsx } from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/auto-refresh";
import { BookShelf } from "@/components/book-shelf";
import { FeedList } from "@/components/feed-list";
import { ItemCard } from "@/components/item-card";
import { SOURCE_LABEL, type SourceId } from "@/lib/discover";
import { getFeed } from "@/lib/discover-feed";
import { listItems } from "@/lib/items";
import { markedKeys } from "@/lib/marks-db";
import { buildShelf } from "@/lib/shelf";
import { getStackTopics } from "@/lib/stack";
import { topicTag } from "@/lib/topics";
import { normalizeUrl } from "@/lib/url";

export const metadata: Metadata = { title: "Home" };

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <div className="space-y-4">
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
  const shelf = buildShelf(items);
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
      "shrink-0 rounded-full border px-3 py-1.5 text-xs sm:px-2.5 sm:py-1",
      active ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-muted",
    );

  return (
    <div className="space-y-3">
      {shelf.books.length > 0 && (
        <section className="space-y-2">
          <SectionHeader title="Your books" count={shelf.books.length} href="/books" />
          <BookShelf books={shelf.books} scroll />
        </section>
      )}
      {shelf.savedCount > 0 && (
        <section className="space-y-2">
          <SectionHeader title="Saved to read" count={shelf.savedCount} href="/library" />
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {shelf.savedPreview.map((item) => (
              <ItemCard key={item.id} item={item} density="compact" />
            ))}
          </ul>
        </section>
      )}
      <div className="pt-2">
        <h1 className="text-lg font-semibold tracking-tight">New for your stack</h1>
        <p className="hidden text-sm text-muted sm:block">
          Hacker News, Lobsters, dev.to and TLDR filtered to your topics, plus the Next.js and Vercel blogs.{" "}
          <Link href="/settings#stack" className="underline decoration-line underline-offset-2 hover:text-ink">
            Edit topics
          </Link>
        </p>
      </div>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <Link href={href({ source: undefined })} className={chip(!source)}>
          All sources
        </Link>
        {(Object.keys(SOURCE_LABEL) as SourceId[]).map((s) => (
          <Link key={s} href={href({ source: s })} className={chip(source === s)}>
            {SOURCE_LABEL[s]}
          </Link>
        ))}
        <span aria-hidden className="mx-0.5 shrink-0 self-center text-line">|</span>
        {topics.map((t) => {
          const tag = topicTag(t);
          return (
            <Link key={tag} href={href({ topic: topic === tag ? undefined : tag })} className={clsx(chip(topic === tag), "font-mono")}>
              #{tag}
            </Link>
          );
        })}
      </div>

      <FeedList key={`${topic}-${source}`} stories={shown} savedUrls={[...saved]} live={<AutoRefresh fetchedAt={fetchedAt} />} />
    </div>
  );
}

function SectionHeader({ title, count, href }: { title: string; count: number; href: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-semibold tracking-tight">
        {title} <span className="font-mono text-xs font-normal text-muted">{count}</span>
      </h2>
      <Link href={href} className="py-1 pl-3 text-sm text-muted hover:text-ink">
        See all →
      </Link>
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
