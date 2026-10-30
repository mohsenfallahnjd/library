"use client";

import { clsx } from "clsx";
import { Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import type { ItemFilter } from "@/lib/items";

type Filter = { kind?: string; status?: string; tag?: string; q?: string };

const KINDS = [
  ["", "All"],
  ["article", "Articles"],
  ["site", "Sites"],
  ["book", "Books"],
] as const;

const STATUSES = [
  ["", "Any status"],
  ["to-read", "To read"],
  ["reading", "Reading"],
  ["done", "Done"],
] as const;

/** Filters live in the URL so they survive reloads and can be bookmarked. */
export function FilterBar({ filter, tags }: { filter: ItemFilter; tags: { tag: string; count: number }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const search = useRef<HTMLInputElement>(null);

  function go(patch: Partial<Filter>) {
    const next = { ...filter, ...patch } as Filter;
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    const qs = params.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  const active = Boolean(filter.kind || filter.status || filter.tag || filter.q);

  return (
    <div className={clsx("space-y-2", pending && "opacity-70")}>
      <div className="flex gap-2">
        <label className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            ref={search}
            type="search"
            defaultValue={filter.q ?? ""}
            placeholder="Search titles…"
            aria-label="Search titles"
            className="input pl-9"
            onChange={(e) => {
              const q = e.currentTarget.value;
              clearTimeout(timer.current);
              timer.current = setTimeout(() => go({ q }), 250);
            }}
          />
        </label>
        <select
          aria-label="Status"
          value={filter.status ?? ""}
          onChange={(e) => go({ status: e.currentTarget.value })}
          className="input w-auto"
        >
          {STATUSES.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 text-sm [scrollbar-width:none]">
        {KINDS.map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => go({ kind: v })}
            className={clsx(
              "shrink-0 rounded-full border px-3 py-1",
              (filter.kind ?? "") === v ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface",
            )}
          >
            {label}
          </button>
        ))}
        {tags.length > 0 && <span className="mx-1 shrink-0 self-center text-line">|</span>}
        {tags.map(({ tag, count }) => (
          <button
            key={tag}
            type="button"
            onClick={() => go({ tag: filter.tag === tag ? "" : tag })}
            className={clsx(
              "shrink-0 rounded-full border px-2.5 py-1 font-mono text-xs",
              filter.tag === tag ? "border-accent text-accent" : "border-line text-muted",
            )}
          >
            #{tag} <span className="opacity-60">{count}</span>
          </button>
        ))}
        {active && (
          <button type="button" onClick={() => {
              if (search.current) search.current.value = "";
              start(() => router.replace(pathname, { scroll: false }));
            }} className="flex shrink-0 items-center gap-1 px-2 text-xs text-muted">
            <X size={12} /> clear
          </button>
        )}
      </div>
    </div>
  );
}
