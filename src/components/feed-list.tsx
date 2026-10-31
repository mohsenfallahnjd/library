"use client";

import { clsx } from "clsx";
import { BookmarkPlus, Check, CheckCheck, MessageSquare, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { markStoriesAction, saveSuggestionAction, unmarkStoriesAction } from "@/app/actions";
import { SOURCE_LABEL, type SourceId, type Suggestion } from "@/lib/discover";
import { Spinner } from "./spinner";

type Sort = "new" | "top";
type Toast = { text: string; keys: string[] } | null;

const SORT_KEY = "feed-sort";

const SOURCE_STYLE: Record<SourceId, string> = {
  hn: "text-[#ff6600]",
  lobsters: "text-[#ac130d] dark:text-[#e0605a]",
  devto: "text-ink",
  tldr: "text-info",
  nextjs: "text-ink",
  vercel: "text-ink",
};

/**
 * The daily reading flow: newest first, grouped by day. Opening a story marks
 * it read (it stays, dimmed, until the next refresh); ✓ hides it right away;
 * Save moves it to the library. Everything can be undone for a few seconds.
 * Keys: j/k move, o open, r read, s save, u undo.
 */
export function FeedList({
  stories,
  savedUrls,
  live,
}: {
  stories: Suggestion[];
  savedUrls: string[];
  live?: React.ReactNode;
}) {
  const [sort, setSort] = useSortPref();
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(() => new Set(savedUrls));
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [focus, setFocus] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const visible = useMemo(() => {
    const list = stories.filter((s) => !gone.has(s.url));
    return sort === "new"
      ? list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : list.sort((a, b) => b.rank - a.rank);
  }, [stories, gone, sort]);

  const groups = useMemo(() => (sort === "new" ? groupByDay(visible) : [{ label: "Top stories", stories: visible }]), [visible, sort]);

  const showToast = useCallback((text: string, keys: string[]) => {
    clearTimeout(timer.current);
    setToast({ text, keys });
    timer.current = setTimeout(() => setToast(null), 6000);
  }, []);

  const hide = useCallback(
    async (list: Suggestion[], state: "read" | "hidden", text: string) => {
      const keys = list.map((s) => s.url);
      setGone((g) => new Set([...g, ...keys]));
      showToast(text, keys);
      const result = await markStoriesAction(state, list.map((s) => ({ key: s.url, title: s.title })));
      if (result.error) {
        setGone((g) => new Set([...g].filter((k) => !keys.includes(k))));
        showToast(result.error, []);
      }
    },
    [showToast],
  );

  const undo = useCallback(async () => {
    if (!toast?.keys.length) return;
    const keys = toast.keys;
    setToast(null);
    setGone((g) => new Set([...g].filter((k) => !keys.includes(k))));
    setOpened((o) => new Set([...o].filter((k) => !keys.includes(k))));
    await unmarkStoriesAction(keys);
  }, [toast]);

  const open = useCallback((s: Suggestion) => {
    setOpened((o) => new Set(o).add(s.url));
    // Keep it on screen (dimmed) so the list doesn't jump while you read.
    void markStoriesAction("read", [{ key: s.url, title: s.title }]);
  }, []);

  const save = useCallback(
    async (s: Suggestion) => {
      setBusy(s.url);
      const result = await saveSuggestionAction({ url: s.url, title: s.title, source: s.source });
      setBusy(null);
      if (result.error) return showToast(result.error, []);
      setSaved((v) => new Set(v).add(s.url));
      await hide([s], "read", "Saved to your library");
    },
    [hide, showToast],
  );

  // Keyboard flow for the Mac.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const current = visible[Math.min(focus, visible.length - 1)];
      const move = (to: number) => {
        const next = Math.max(0, Math.min(visible.length - 1, to));
        setFocus(next);
        document.querySelector(`[data-story="${next}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      };
      if (e.key === "j") move(focus + 1);
      else if (e.key === "k") move(focus - 1);
      else if ((e.key === "o" || e.key === "Enter") && current) {
        window.open(current.url, "_blank", "noopener");
        open(current);
      } else if ((e.key === "r" || e.key === "e") && current) void hide([current], "read", "Marked as read");
      else if (e.key === "s" && current && !saved.has(current.url)) void save(current);
      else if (e.key === "u") void undo();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, focus, hide, open, save, undo, saved]);

  let index = -1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted">{visible.length} unread</span>
          {live}
        </div>
        <div className="flex gap-0.5 rounded-lg bg-line/50 p-0.5 text-xs" role="radiogroup" aria-label="Sort">
          {(["new", "top"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={sort === v}
              onClick={() => setSort(v)}
              className={clsx("rounded-md px-2.5 py-1", sort === v ? "bg-surface font-medium shadow-sm ring-1 ring-line" : "text-muted")}
            >
              {v === "new" ? "Newest" : "Top"}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="space-y-1 py-12 text-center">
          <CheckCheck className="mx-auto text-ok" />
          <p className="font-medium">All caught up</p>
          <p className="text-sm text-muted">New stories show up here as they are published.</p>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.label} className="space-y-2">
            <header className="sticky top-[calc(49px+env(safe-area-inset-top))] z-[5] -mx-4 flex items-center justify-between bg-bg/90 px-4 py-1.5 backdrop-blur">
              <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
                {group.label} <span className="font-mono font-normal">· {group.stories.length}</span>
              </h2>
              <button
                type="button"
                onClick={() => hide(group.stories, "read", `Marked ${group.stories.length} as read`)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-surface hover:text-ink"
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            </header>
            <ul className="space-y-2">
              {group.stories.map((s) => {
                index += 1;
                const i = index;
                const isOpened = opened.has(s.url);
                return (
                  <li
                    key={s.url}
                    data-story={i}
                    onMouseEnter={() => setFocus(i)}
                    className={clsx(
                      "flex items-start gap-3 rounded-xl border bg-surface p-3 transition",
                      focus === i ? "border-muted/50" : "border-line",
                      isOpened && "opacity-55",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => open(s)}
                        onAuxClick={() => open(s)}
                        className="line-clamp-2 font-medium leading-snug hover:text-accent visited:text-muted"
                      >
                        {s.title}
                      </a>
                      {s.summary && <p className="mt-1 line-clamp-2 text-sm text-muted">{s.summary}</p>}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        <span className={clsx("font-mono font-medium", SOURCE_STYLE[s.source])}>{SOURCE_LABEL[s.source]}</span>
                        {s.score > 0 && <span className="font-mono tabular-nums">▲ {s.score}</span>}
                        {s.discussionUrl && s.discussionUrl !== s.url && (
                          <a href={s.discussionUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-ink">
                            <MessageSquare size={12} /> {s.source === "tldr" ? "issue" : s.comments}
                          </a>
                        )}
                        {s.readMinutes && <span className="font-mono">{s.readMinutes} min</span>}
                        <span className="font-mono">{host(s.url)}</span>
                        <time dateTime={s.createdAt}>{timeLabel(s.createdAt, sort)}</time>
                        {s.topics.map((t) => (
                          <span key={t} className="chip">
                            #{t}
                          </span>
                        ))}
                        {isOpened && <span className="font-mono text-ok">read</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => hide([s], "read", "Marked as read")}
                        aria-label={`Mark “${s.title}” as read`}
                        title="Mark as read (r)"
                        className="inline-flex size-8 items-center justify-center rounded-full border border-line text-muted transition hover:border-ok hover:bg-ok/10 hover:text-ok"
                      >
                        <Check size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => save(s)}
                        disabled={busy === s.url || saved.has(s.url)}
                        aria-label={`Save “${s.title}” to library`}
                        title="Save to library (s)"
                        className="inline-flex size-8 items-center justify-center rounded-full border border-line text-muted transition hover:border-accent hover:bg-accent/10 hover:text-accent disabled:opacity-60"
                      >
                        {busy === s.url ? <Spinner /> : saved.has(s.url) ? <Check size={15} className="text-ok" /> : <BookmarkPlus size={15} />}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <p className="hidden text-center font-mono text-[11px] text-muted sm:block">
        j / k move · o open · r read · s save · u undo
      </p>

      {toast && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-3 rounded-full bg-ink py-2 pr-2 pl-4 text-sm text-bg shadow-lg"
        >
          <span className="truncate">{toast.text}</span>
          {toast.keys.length > 0 && (
            <button type="button" onClick={undo} className="flex items-center gap-1 rounded-full bg-bg/15 px-3 py-1 font-medium hover:bg-bg/25">
              <Undo2 size={13} /> Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function useSortPref(): [Sort, (s: Sort) => void] {
  const [sort, setSort] = useState<Sort>("new");
  useEffect(() => {
    try {
      // Reading storage after mount keeps server and client HTML identical.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(SORT_KEY) === "top") setSort("top");
    } catch {}
  }, []);
  const save = useCallback((s: Sort) => {
    setSort(s);
    try {
      localStorage.setItem(SORT_KEY, s);
    } catch {}
  }, []);
  return [sort, save];
}

/** Today / Yesterday / Wednesday / Oct 21, in the reader's own time zone. */
function groupByDay(stories: Suggestion[]) {
  const groups: { label: string; stories: Suggestion[] }[] = [];
  const today = startOfDay(new Date());
  for (const s of stories) {
    const days = Math.round((today - startOfDay(new Date(s.createdAt))) / 86_400_000);
    const label =
      days <= 0
        ? "Today"
        : days === 1
          ? "Yesterday"
          : days < 7
            ? new Date(s.createdAt).toLocaleDateString("en", { weekday: "long" })
            : new Date(s.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" });
    const last = groups.at(-1);
    if (last?.label === label) last.stories.push(s);
    else groups.push({ label, stories: [s] });
  }
  return groups;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function host(url: string) {
  return new URL(url).hostname.replace(/^www\./, "");
}

/** Within a day group the clock time is enough; in "Top" show the age. */
function timeLabel(iso: string, sort: Sort) {
  const date = new Date(iso);
  if (sort === "new") {
    // TLDR and some feeds only give a date; midnight UTC means "no time".
    if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0) return "";
    return date.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
  }
  const hours = Math.max(1, Math.round((Date.now() - date.getTime()) / 3_600_000));
  return hours < 48 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}
