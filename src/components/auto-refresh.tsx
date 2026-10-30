"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const EVERY_MS = 3 * 60_000;

/** Re-renders the feed every few minutes while the tab is visible, and on demand. */
export function AutoRefresh({ fetchedAt }: { fetchedAt: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [now, setNow] = useState(() => Date.parse(fetchedAt));

  useEffect(() => {
    const tick = () => {
      setNow(Date.now());
      if (document.visibilityState === "visible") start(() => router.refresh());
    };
    const timer = setInterval(tick, EVERY_MS);
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    const clock = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      clearInterval(timer);
      clearInterval(clock);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  const mins = Math.max(0, Math.round((now - Date.parse(fetchedAt)) / 60_000));
  return (
    <button
      type="button"
      onClick={() => start(() => router.refresh())}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[11px] text-muted hover:text-ink"
      title="Refresh now"
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-ok" />
      </span>
      {pending ? "updating…" : mins < 1 ? "live · just now" : `live · ${mins}m ago`}
      <RefreshCw size={11} className={pending ? "animate-spin" : ""} />
    </button>
  );
}
