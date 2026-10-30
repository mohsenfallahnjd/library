"use client";

import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import Link from "next/link";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState } from "react";

const SAVE_DELAY_MS = 800;

type Props = { id: string; title: string; fileUrl: string; initialPage: number };

/** One page at a time, fit to width. Saves the page (debounced) and resumes there. */
export function PdfReader({ id, title, fileUrl, initialPage }: Props) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(initialPage);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const width = useWidth(box);

  // Load the document.
  useEffect(() => {
    let cancelled = false;
    let task: PDFDocumentLoadingTask | null = null;
    (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      task = pdfjs.getDocument({ url: fileUrl, disableRange: true });
      const loaded = await task.promise;
      if (cancelled) return;
      setDoc(loaded);
      setPage((p) => Math.min(Math.max(1, p), loaded.numPages));
    })().catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
      task?.destroy();
    };
  }, [fileUrl]);

  // Render the current page.
  useEffect(() => {
    if (!doc || !canvas.current || !width) return;
    let task: RenderTask | null = null;
    let cancelled = false;
    (async () => {
      const p = await doc.getPage(page);
      if (cancelled) return;
      const base = p.getViewport({ scale: 1 });
      const viewport = p.getViewport({ scale: (width / base.width) * zoom });
      const ratio = window.devicePixelRatio || 1;
      const el = canvas.current!;
      el.width = Math.floor(viewport.width * ratio);
      el.height = Math.floor(viewport.height * ratio);
      el.style.width = `${Math.floor(viewport.width)}px`;
      el.style.height = `${Math.floor(viewport.height)}px`;
      task = p.render({ canvas: el, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
      await task.promise;
    })().catch((err: Error) => {
      if (err?.name !== "RenderingCancelledException") setError(err.message);
    });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, page, width, zoom]);

  // Save progress, debounced; flush when the tab is hidden or closed.
  const pending = useRef<string | null>(null);
  const flush = useCallback(() => {
    if (!pending.current) return;
    navigator.sendBeacon(`/api/items/${id}`, new Blob([pending.current], { type: "application/json" }));
    pending.current = null;
  }, [id]);

  useEffect(() => {
    if (!doc) return;
    const body = JSON.stringify({ lastPage: page, totalPages: doc.numPages });
    pending.current = body;
    const timer = setTimeout(() => {
      pending.current = null;
      fetch(`/api/items/${id}`, { method: "PATCH", body, headers: { "content-type": "application/json" }, keepalive: true });
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [doc, id, page]);

  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  const total = doc?.numPages ?? 0;
  const go = useCallback((delta: number) => setPage((p) => Math.min(Math.max(1, p + delta), total || p)), [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") go(1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // Swipe left/right on touch screens.
  const touch = useRef<{ x: number; y: number } | null>(null);

  return (
    <div className="-mx-4 -mt-5 -mb-5 flex min-h-[calc(100dvh-49px-env(safe-area-inset-top))] flex-col">
      <div className="sticky top-[calc(49px+env(safe-area-inset-top))] z-10 flex items-center gap-2 border-b border-line bg-bg/95 px-3 py-2 text-sm backdrop-blur">
        <Link href="/" className="shrink-0 text-muted hover:text-ink" aria-label="Back to library">
          ←
        </Link>
        <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
        <button type="button" className="btn-ghost px-2 py-1" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} aria-label="Zoom out">
          <Minus size={14} />
        </button>
        <button type="button" className="btn-ghost px-2 py-1" onClick={() => setZoom((z) => Math.min(3, z + 0.25))} aria-label="Zoom in">
          <Plus size={14} />
        </button>
      </div>

      <div
        ref={box}
        className="relative flex-1 overflow-x-auto bg-bg px-2 py-3 select-none"
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const start = touch.current;
          touch.current = null;
          if (!start || zoom > 1) return;
          const dx = e.changedTouches[0].clientX - start.x;
          const dy = e.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
        }}
      >
        {error ? (
          <p className="py-20 text-center text-sm text-red-600">Could not open this PDF: {error}</p>
        ) : !doc ? (
          <p className="py-20 text-center text-sm text-muted">Loading PDF…</p>
        ) : null}
        <canvas ref={canvas} className="mx-auto block bg-white shadow-sm" aria-label={`Page ${page} of ${total}`} />
      </div>

      <div className="sticky bottom-0 flex items-center justify-center gap-3 border-t border-line bg-bg/95 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur">
        <button type="button" className="btn-ghost" onClick={() => go(-1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft size={16} />
        </button>
        <form
          className="flex items-center gap-1 font-mono text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(new FormData(e.currentTarget).get("page"));
            if (n >= 1 && n <= total) setPage(n);
          }}
        >
          <input
            key={page}
            name="page"
            defaultValue={page}
            inputMode="numeric"
            aria-label="Page"
            className="w-14 rounded-md border border-line bg-surface px-2 py-1 text-center"
          />
          <span className="text-muted">/ {total || "…"}</span>
        </form>
        <button type="button" className="btn-ghost" onClick={() => go(1)} disabled={!total || page >= total} aria-label="Next page">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/** Content width of an element, tracked with ResizeObserver. */
function useWidth(ref: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.floor(entry.contentRect.width);
      setWidth((prev) => (Math.abs(prev - w) > 4 ? w : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return Math.min(width, 900);
}
