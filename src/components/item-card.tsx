import { BookOpen, Globe, Newspaper } from "lucide-react";
import Link from "next/link";
import { SOURCE_LABEL, type SourceId } from "@/lib/discover";
import type { Item } from "@/lib/items";

const KIND_ICON = { book: BookOpen, article: Newspaper, site: Globe } as const;

export function host(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function ItemCard({ item, children }: { item: Item; children?: React.ReactNode }) {
  const Icon = KIND_ICON[item.kind];
  const href = item.kind === "book" ? `/read/${item.id}` : item.url!;
  const external = item.kind !== "book";
  const progress =
    item.kind === "book" && item.totalPages && item.lastPage
      ? Math.round((item.lastPage / item.totalPages) * 100)
      : null;

  return (
    <li className="rounded-xl border border-line bg-surface p-3">
      <div className="flex items-start gap-3">
        <Icon size={18} className="mt-0.5 shrink-0 text-muted" aria-label={item.kind} />
        <div className="min-w-0 flex-1">
          <a
            href={href}
            {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
            className="line-clamp-2 font-medium leading-snug hover:text-accent"
          >
            {item.title}
          </a>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            {host(item.url) && <span className="font-mono">{host(item.url)}</span>}
            {item.author && <span>{item.author}</span>}
            {item.source && item.source in SOURCE_LABEL && (
              <span className="font-mono text-accent">via {SOURCE_LABEL[item.source as SourceId]}</span>
            )}
            {item.tags.map((t) => (
              <Link key={t} href={`/?tag=${encodeURIComponent(t)}`} className="chip hover:border-accent hover:text-accent">
                #{t}
              </Link>
            ))}
          </div>
          {progress !== null && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
              </div>
              <span className="font-mono tabular-nums">
                p.{item.lastPage}/{item.totalPages} · {progress}%
              </span>
            </div>
          )}
        </div>
      </div>
      {children}
    </li>
  );
}
