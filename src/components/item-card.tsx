import { clsx } from "clsx";
import { ArrowRight, Check, Pencil } from "lucide-react";
import Link from "next/link";
import { SOURCE_LABEL, type SourceId } from "@/lib/discover";
import type { Item } from "@/lib/items";
import { Favicon } from "./favicon";
import { StatusSelect } from "./status-select";

const KIND_LABEL = { book: "Book", article: "Article", site: "Site" } as const;

export function host(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** "now", "5m", "3h", "4d", "2w", then a short date. */
function ago(date: Date) {
  const mins = Math.round((Date.now() - date.getTime()) / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.round(days / 7)}w ago`;
  return date.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

/** A stable, pleasant colour per book so spines are easy to tell apart. */
function spineHue(title: string) {
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function initials(title: string) {
  const words = title.replace(/^\d{4}\s+/, "").match(/[A-Za-z0-9]+/g) ?? ["?"];
  return words
    .filter((w) => !/^(a|an|the|of|and|to|in|for|on)$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function ItemCard({ item }: { item: Item }) {
  const isBook = item.kind === "book";
  const href = isBook ? `/read/${item.id}` : item.url!;
  const site = host(item.url);
  const done = item.status === "done";
  const progress =
    isBook && item.totalPages && item.lastPage ? Math.round((item.lastPage / item.totalPages) * 100) : null;
  // "via Hacker News" says something; "dev.to" on a dev.to link doesn't.
  const label = item.source && item.source in SOURCE_LABEL ? SOURCE_LABEL[item.source as SourceId] : null;
  const source = label && site && !site.endsWith(label) ? `via ${label}` : null;
  const when = done && item.finishedAt ? `finished ${ago(item.finishedAt)}` : ago(item.addedAt);

  return (
    <li
      className={clsx(
        "group relative flex gap-3 rounded-2xl border border-line bg-surface p-3 transition hover:border-muted/40 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] sm:p-4",
        done && "bg-surface/60",
      )}
    >
      {item.status === "reading" && (
        <span aria-hidden className="absolute inset-y-4 left-0 w-[3px] rounded-r-full bg-info" />
      )}

      {/* Thumbnail: a coloured spine for books, the site's icon for links */}
      {isBook ? (
        <div
          aria-hidden
          className="relative flex h-16 w-12 shrink-0 items-end overflow-hidden rounded-[4px_8px_8px_4px] p-1.5 shadow-sm"
          style={{
            background: `linear-gradient(135deg, oklch(0.62 0.13 ${spineHue(item.title)}), oklch(0.45 0.12 ${spineHue(item.title) + 30}))`,
          }}
        >
          <span className="absolute inset-y-0 left-1 w-px bg-white/25" />
          <span className="font-mono text-xs font-bold tracking-tight text-white/95">{initials(item.title)}</span>
        </div>
      ) : (
        <div aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-bg">
          {site ? <Favicon host={site} /> : null}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate font-mono text-[11px] text-muted">
          {(isBook ? item.author : site) && (
            <>
              <span className="truncate">{isBook ? item.author : site}</span>
              <span aria-hidden>·</span>
            </>
          )}
          <span className="shrink-0">{KIND_LABEL[item.kind]}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{when}</span>
        </p>

        {/* The title link covers the whole card; controls sit above it. */}
        <a
          href={href}
          {...(isBook ? {} : { target: "_blank", rel: "noreferrer" })}
          className={clsx(
            "mt-0.5 line-clamp-2 font-semibold leading-snug tracking-tight outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-accent/50 group-hover:text-accent",
            done && "text-muted",
          )}
        >
          {done && <Check size={15} className="mr-1 inline -translate-y-px text-ok" aria-label="Done" />}
          {item.title}
        </a>

        {item.notes && <p className="mt-1 line-clamp-1 text-sm text-muted">{item.notes}</p>}

        {progress !== null && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
            </div>
            <span className="font-mono text-[11px] text-muted tabular-nums">
              {item.lastPage}/{item.totalPages} · {progress}%
            </span>
          </div>
        )}

        {(item.tags.length > 0 || source) && (
          <div className="relative z-10 mt-2 flex flex-wrap gap-1">
            {source && <span className="chip border-accent/30 text-accent">{source}</span>}
            {item.tags.map((t) => (
              <Link key={t} href={`/?tag=${encodeURIComponent(t)}`} className="chip hover:border-accent hover:text-accent">
                #{t}
              </Link>
            ))}
          </div>
        )}

        <div className="relative z-10 mt-3 flex items-center gap-2">
          <StatusSelect id={item.id} status={item.status} />
          {isBook && !done && (
            <Link
              href={href}
              className="inline-flex h-7 items-center gap-1 rounded-full bg-accent px-3 text-xs font-medium text-accent-ink hover:opacity-90"
            >
              {item.lastPage && item.lastPage > 1 ? `Continue p.${item.lastPage}` : "Start reading"}
              <ArrowRight size={12} />
            </Link>
          )}
          <Link
            href={`/items/${item.id}`}
            aria-label={`Edit ${item.title}`}
            title="Edit"
            className="ml-auto inline-flex size-7 items-center justify-center rounded-full text-muted transition hover:bg-bg hover:text-ink sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
          >
            <Pencil size={14} />
          </Link>
        </div>
      </div>
    </li>
  );
}
