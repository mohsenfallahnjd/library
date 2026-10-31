import { clsx } from "clsx";
import { X } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { DensityToggle } from "@/components/density-toggle";
import { ItemCard, type Density } from "@/components/item-card";
import { KindSelect } from "@/components/kind-select";
import { LibraryBar } from "@/components/library-bar";
import { filterSchema, listItems, type Status } from "@/lib/items";
import { usesBlob } from "@/lib/storage";

export const metadata: Metadata = { title: "Library" };

type Tab = Status | "all";
const TABS: { value: Tab; label: string }[] = [
  { value: "reading", label: "Reading" },
  { value: "to-read", label: "To read" },
  { value: "done", label: "Done" },
  { value: "all", label: "All" },
];

const EMPTY: Record<Tab, string> = {
  reading: "Nothing in progress. Open something from To read.",
  "to-read": "Your reading list is empty. Paste a link above or save one from the feed.",
  done: "Nothing finished yet.",
  all: "Nothing here yet. Paste a link above.",
};

export default function LibraryPage({ searchParams }: PageProps<"/library">) {
  return (
    <div className="space-y-4">
      <Suspense fallback={<div className="h-11 rounded-lg border border-line bg-surface" />}>
        <LibraryBar directUpload={usesBlob()} />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <Library searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Library({ searchParams }: { searchParams: PageProps<"/library">["searchParams"] }) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const filter = filterSchema.parse({ kind: one(params.kind), tag: one(params.tag), q: one(params.q) });
  const [all, jar] = await Promise.all([listItems(filter), cookies()]);
  const density: Density = jar.get("density")?.value === "compact" ? "compact" : "comfortable";

  const count = (t: Tab) => (t === "all" ? all.length : all.filter((i) => i.status === t).length);
  const requested = TABS.find((t) => t.value === one(params.status))?.value;
  // Open on what you're reading; fall back to the reading list.
  const tab: Tab = requested ?? (count("reading") > 0 ? "reading" : "to-read");
  const items = tab === "all" ? all : all.filter((i) => i.status === tab);

  const href = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ status: tab, kind: filter.kind, tag: filter.tag, q: filter.q, ...patch })) {
      if (v) next.set(k, v);
    }
    return `/library?${next}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <nav aria-label="Status" className="-mx-1 flex min-w-0 flex-1 basis-full gap-0.5 overflow-x-auto px-1 [scrollbar-width:none] sm:basis-auto">
          {TABS.map((t) => (
            <Link
              key={t.value}
              href={href({ status: t.value })}
              aria-current={tab === t.value ? "page" : undefined}
              className={clsx(
                "flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition sm:flex-none",
                tab === t.value ? "bg-ink text-bg" : "text-muted hover:bg-surface hover:text-ink",
              )}
            >
              {t.label}
              <span className={clsx("font-mono text-[11px]", tab === t.value ? "opacity-70" : "opacity-60")}>{count(t.value)}</span>
            </Link>
          ))}
        </nav>
        <span className="font-mono text-xs text-muted sm:hidden">
          {items.length} item{items.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <KindSelect kind={filter.kind} />
          <DensityToggle density={density} />
        </div>
      </div>

      {(filter.tag || filter.q) && (
        <div className="flex flex-wrap gap-1.5">
          {filter.q && (
            <span className="chip gap-1 border-accent/40 text-ink">
              “{filter.q}”
            </span>
          )}
          {filter.tag && (
            <Link href={href({ tag: undefined })} className="chip gap-1 border-accent/40 text-accent hover:bg-accent/10">
              #{filter.tag} <X size={11} />
            </Link>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">{filter.q || filter.tag || filter.kind ? "No matches." : EMPTY[tab]}</p>
      ) : (
        <ul
          className={
            density === "compact" ? "divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface" : "space-y-2.5"
          }
        >
          {items.map((item) => (
            <ItemCard key={item.id} item={item} density={density} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul className="space-y-2" aria-busy>
      {[0, 1, 2].map((i) => (
        <li key={i} className="h-20 animate-pulse rounded-xl border border-line bg-surface" />
      ))}
    </ul>
  );
}
