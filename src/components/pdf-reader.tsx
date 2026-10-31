"use client";

import { clsx } from "clsx";
import { ArrowLeft, ChevronLeft, ChevronRight, Columns2, Crop, Minus, Moon, Plus, RectangleVertical, Sun, Sunset } from "lucide-react";
import Link from "next/link";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy, RenderTask, TextLayer } from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadPdfjs, uploadCover } from "@/lib/pdf-cover";

const SAVE_DELAY_MS = 800;
const MAX_WIDTH = 760; // comfortable line length on big screens
// Room for the overlaid top and bottom bars, so they never cover the page edges.
const PAD = { x: 16, top: 64, bottom: 76 };
const PREFS_KEY = "reader-prefs";

type Theme = "light" | "sepia" | "night";
type Fit = "width" | "page";
type Prefs = { theme: Theme; fit: Fit; trim: boolean };
/** Part of a page as fractions of its width and height. */
type Box = { x0: number; y0: number; x1: number; y1: number };

const THEMES: Record<Theme, { label: string; icon: typeof Sun; surround: string; page: string; next: Theme }> = {
  light: { label: "Light", icon: Sun, surround: "bg-[#e7e7e4]", page: "", next: "sepia" },
  sepia: { label: "Sepia", icon: Sunset, surround: "bg-[#e6dac2]", page: "sepia-[.35] brightness-[.97]", next: "night" },
  night: { label: "Night", icon: Moon, surround: "bg-[#121214]", page: "invert-[.9] hue-rotate-180", next: "light" },
};

type Props = { id: string; title: string; fileUrl: string; initialPage: number; initialTotal: number | null; hasCover: boolean };

/**
 * Full-screen, one page at a time. Tap the sides (or swipe, or use the arrow
 * keys) to turn pages, tap the middle to show or hide the controls. Saves the
 * page (debounced) and resumes there.
 */
export function PdfReader({ id, title, fileUrl, initialPage, initialTotal, hasCover }: Props) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(initialPage);
  const [zoom, setZoom] = useState(1);
  const [prefs, setPrefs] = usePrefs();
  const [chrome, setChrome] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const textLayer = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const crops = useRef(new Map<number, Box>());
  const size = useSize(scroller);

  // The reader owns the screen while it is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Load the document.
  useEffect(() => {
    let cancelled = false;
    let task: PDFDocumentLoadingTask | null = null;
    (async () => {
      const pdfjs = await loadPdfjs();
      task = pdfjs.getDocument({ url: fileUrl, disableRange: true });
      const loaded = await task.promise;
      if (cancelled) return;
      setDoc(loaded);
      setPage((p) => Math.min(Math.max(1, p), loaded.numPages));
      // Books uploaded before covers existed get one the first time they are opened.
      if (!hasCover) uploadCover(id, loaded);
    })().catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
      task?.destroy();
    };
  }, [fileUrl, hasCover, id]);

  // Render the current page off-screen, then swap it in (no blank flash between pages).
  useEffect(() => {
    if (!doc || !canvas.current || !textLayer.current || !size.width) return;
    let task: RenderTask | null = null;
    let text: TextLayer | null = null;
    let cancelled = false;
    (async () => {
      const pdfjs = await loadPdfjs();
      const p = await doc.getPage(page);
      if (cancelled) return;
      const base = p.getViewport({ scale: 1 });
      // With "trim margins" only the printed area is shown, so text fills phone screens.
      const full = { x0: 0, y0: 0, x1: 1, y1: 1 };
      let crop = full;
      if (prefs.trim) {
        crop = crops.current.get(page) ?? (await findContentBox(p, base.width, base.height));
        crops.current.set(page, crop);
        if (cancelled) return;
      }
      const cropW = base.width * (crop.x1 - crop.x0);
      const cropH = base.height * (crop.y1 - crop.y0);
      const byWidth = Math.min(size.width - PAD.x * 2, MAX_WIDTH) / cropW;
      const byHeight = (size.height - PAD.top - PAD.bottom) / cropH;
      const scale = (prefs.fit === "page" ? Math.min(byWidth, byHeight) : byWidth) * zoom;
      const viewport = p.getViewport({
        scale,
        offsetX: -crop.x0 * base.width * scale,
        offsetY: -crop.y0 * base.height * scale,
      });
      const cssW = Math.floor(cropW * scale);
      const cssH = Math.floor(cropH * scale);
      const ratio = Math.min(window.devicePixelRatio || 1, 3);

      const off = document.createElement("canvas");
      off.width = Math.floor(cssW * ratio);
      off.height = Math.floor(cssH * ratio);
      task = p.render({ canvas: off, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
      await task.promise;
      if (cancelled) return;

      const el = canvas.current!;
      el.width = off.width;
      el.height = off.height;
      el.style.width = `${cssW}px`;
      el.style.height = `${cssH}px`;
      el.getContext("2d")!.drawImage(off, 0, 0);
      setRendered(true);

      // Invisible, selectable text on top of the canvas (copy code and quotes).
      // TextLayer ignores viewport offsets, so lay out the whole page and shift it.
      const layer = textLayer.current!;
      const textViewport = p.getViewport({ scale });
      layer.replaceChildren();
      Object.assign(layer.style, {
        inset: "auto",
        left: `${-crop.x0 * textViewport.width}px`,
        top: `${-crop.y0 * textViewport.height}px`,
      });
      layer.style.setProperty("--total-scale-factor", String(scale));
      // pdf.js sizes the layer with round(…, var(--scale-round-x)).
      layer.style.setProperty("--scale-round-x", "1px");
      layer.style.setProperty("--scale-round-y", "1px");
      text = new pdfjs.TextLayer({ textContentSource: p.streamTextContent(), container: layer, viewport: textViewport });
      await text.render();

      // Warm up the next page so turning feels instant.
      if (page < doc.numPages) doc.getPage(page + 1).catch(() => {});
    })().catch((err: Error) => {
      if (!cancelled && err?.name !== "RenderingCancelledException" && err?.name !== "AbortException") setError(err.message);
    });
    return () => {
      cancelled = true;
      task?.cancel();
      text?.cancel();
    };
  }, [doc, page, size.width, size.height, zoom, prefs.fit, prefs.trim]);

  // New page starts at the top.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [page]);

  // Save progress, debounced; flush when the tab is hidden or closed.
  const pending = useRef<string | null>(null);
  const flush = useCallback(() => {
    if (!pending.current) return;
    navigator.sendBeacon(`/api/items/${id}`, new Blob([pending.current], { type: "application/json" }));
    pending.current = null;
  }, [id]);

  // Only write once the reader actually moves (or the page count is new), so
  // merely opening a book, or a stale tab, never overwrites saved progress.
  const saved = useRef({ page: initialPage, total: initialTotal });
  useEffect(() => {
    if (!doc) return;
    if (saved.current.page === page && saved.current.total === doc.numPages) return;
    saved.current = { page, total: doc.numPages };
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
  const zoomBy = useCallback((d: number) => setZoom((z) => Math.min(3, Math.max(0.5, Math.round((z + d) * 4) / 4))), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === "j") go(1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp" || e.key === "k") go(-1);
      else if (e.key === "+" || e.key === "=") zoomBy(0.25);
      else if (e.key === "-") zoomBy(-0.25);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, zoomBy]);

  // Taps: left third back, right third forward, middle toggles the controls.
  // Swipes turn pages when the page isn't zoomed in.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  function onTap(e: React.MouseEvent<HTMLDivElement>) {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    if (!window.getSelection()?.isCollapsed) return; // selecting text
    const x = e.clientX / window.innerWidth;
    if (x < 0.3) {
      go(-1);
      setChrome(false);
    } else if (x > 0.7) {
      go(1);
      setChrome(false);
    } else setChrome((c) => !c);
  }

  const theme = THEMES[prefs.theme];
  const ThemeIcon = theme.icon;
  const percent = total ? Math.round((page / total) * 100) : 0;
  const bar = "absolute inset-x-0 z-20 transition-[transform,opacity] duration-200";
  const dark = prefs.theme === "night";

  return (
    <div className={clsx("fixed inset-0 z-50 flex flex-col", theme.surround, dark ? "text-zinc-200" : "text-zinc-900")}>
      {/* Reading progress, always visible */}
      <div className="absolute inset-x-0 top-0 z-30 h-0.5 bg-black/5">
        <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>

      <header
        className={clsx(
          bar,
          "top-0 flex items-center gap-1 px-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 backdrop-blur-md",
          dark ? "bg-zinc-900/85" : "bg-white/85",
          !chrome && "pointer-events-none -translate-y-full opacity-0",
        )}
      >
        <Link href="/library" aria-label="Back to library" className="rounded-lg p-2 hover:bg-current/10">
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="truncate font-mono text-[11px] opacity-60">
            {total ? `p.${page} · ${percent}% · ${total - page} left` : "Loading…"}
          </p>
        </div>
        {/* On phones, pinch to zoom instead. */}
        <div className="hidden items-center sm:flex">
          <ToolButton label="Zoom out" onClick={() => zoomBy(-0.25)}>
            <Minus size={16} />
          </ToolButton>
          <span className="w-10 text-center font-mono text-xs tabular-nums opacity-70">{Math.round(zoom * 100)}%</span>
          <ToolButton label="Zoom in" onClick={() => zoomBy(0.25)}>
            <Plus size={16} />
          </ToolButton>
        </div>
        <ToolButton
          label={prefs.fit === "width" ? "Fit whole page" : "Fit width"}
          onClick={() => {
            setPrefs({ ...prefs, fit: prefs.fit === "width" ? "page" : "width" });
            setZoom(1);
          }}
        >
          {prefs.fit === "width" ? <RectangleVertical size={16} /> : <Columns2 size={16} />}
        </ToolButton>
        <ToolButton
          label={prefs.trim ? "Show full page margins" : "Trim page margins"}
          aria-pressed={prefs.trim}
          onClick={() => setPrefs({ ...prefs, trim: !prefs.trim })}
          className={clsx(prefs.trim && "bg-current/10")}
        >
          <Crop size={16} />
        </ToolButton>
        <ToolButton label={`Theme: ${theme.label}`} onClick={() => setPrefs({ ...prefs, theme: theme.next })}>
          <ThemeIcon size={16} />
        </ToolButton>
      </header>

      <div
        ref={scroller}
        onClick={onTap}
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const start = touch.current;
          touch.current = null;
          if (!start || zoom > 1) return;
          const dx = e.changedTouches[0].clientX - start.x;
          const dy = e.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            swiped.current = true;
            go(dx < 0 ? 1 : -1);
          }
        }}
        className="relative flex-1 overflow-auto overscroll-contain"
      >
        {error ? (
          <p className="absolute inset-x-0 top-1/3 px-6 text-center text-sm text-red-500">Could not open this PDF: {error}</p>
        ) : !rendered ? (
          <p className="absolute inset-x-0 top-1/3 animate-pulse text-center text-sm opacity-60">Opening book…</p>
        ) : null}
        <div className="flex min-h-full min-w-fit items-center justify-center px-4 pt-16 pb-[76px]">
          <div className={clsx("relative overflow-hidden shadow-[0_2px_20px_rgba(0,0,0,0.15)]", !rendered && "invisible")}>
            <canvas
              ref={canvas}
              className={clsx("block rounded-[2px] bg-white", theme.page)}
              aria-label={`Page ${page} of ${total}`}
            />
            <div ref={textLayer} className="textLayer" />
          </div>
        </div>
      </div>

      <footer
        className={clsx(
          bar,
          "bottom-0 flex items-center gap-3 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md",
          dark ? "bg-zinc-900/85" : "bg-white/85",
          !chrome && "pointer-events-none translate-y-full opacity-0",
        )}
      >
        <ToolButton label="Previous page" onClick={() => go(-1)} disabled={page <= 1}>
          <ChevronLeft size={18} />
        </ToolButton>
        <input
          type="range"
          min={1}
          max={Math.max(total, 1)}
          value={page}
          disabled={!total}
          onChange={(e) => setPage(Number(e.currentTarget.value))}
          aria-label="Page"
          className="h-1 flex-1 cursor-pointer accent-accent"
        />
        <PageInput page={page} total={total} onGo={setPage} />
        <ToolButton label="Next page" onClick={() => go(1)} disabled={!total || page >= total}>
          <ChevronRight size={18} />
        </ToolButton>
      </footer>
    </div>
  );
}

function ToolButton({
  label,
  children,
  className,
  ...props
}: { label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx("rounded-lg p-2 transition-colors hover:bg-current/10 disabled:opacity-30", className)}
      {...props}
    >
      {children}
    </button>
  );
}

function PageInput({ page, total, onGo }: { page: number; total: number; onGo: (n: number) => void }) {
  return (
    <form
      className="flex items-center gap-1 font-mono text-xs tabular-nums"
      onSubmit={(e) => {
        e.preventDefault();
        const input = e.currentTarget.elements.namedItem("page") as HTMLInputElement;
        const n = Number(input.value);
        if (n >= 1 && n <= total) onGo(n);
        input.blur();
      }}
    >
      <input
        key={page}
        name="page"
        defaultValue={page}
        inputMode="numeric"
        enterKeyHint="go"
        aria-label="Go to page"
        className="w-14 rounded-md border border-current/15 bg-transparent px-1 py-1 text-center text-base sm:w-12 sm:text-xs"
      />
      <span className="opacity-60">/ {total || "…"}</span>
    </form>
  );
}

/**
 * Finds the printed area of a page: renders a small copy and looks for
 * non-white pixels. Keeps a little breathing room around the text.
 */
async function findContentBox(page: PDFPageProxy, width: number, height: number): Promise<Box> {
  const scale = 400 / width;
  const probe = document.createElement("canvas");
  probe.width = Math.ceil(width * scale);
  probe.height = Math.ceil(height * scale);
  await page.render({ canvas: probe, viewport: page.getViewport({ scale }) }).promise;
  const { data, width: w, height: h } = probe.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, probe.width, probe.height);

  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      // Transparent counts as white; anything clearly darker than paper is content.
      if (data[i + 3] > 16 && data[i] + data[i + 1] + data[i + 2] < 690) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { x0: 0, y0: 0, x1: 1, y1: 1 }; // blank page
  const margin = 0.03;
  const box = {
    x0: Math.max(0, x0 / w - margin),
    y0: Math.max(0, y0 / h - margin),
    x1: Math.min(1, (x1 + 1) / w + margin),
    y1: Math.min(1, (y1 + 1) / h + margin),
  };
  // Not worth trimming when the content already fills the page (covers, figures).
  return box.x1 - box.x0 > 0.92 && box.y1 - box.y0 > 0.92 ? { x0: 0, y0: 0, x1: 1, y1: 1 } : box;
}

/** Reader theme, fit and trim, remembered per browser. */
function usePrefs(): [Prefs, (p: Prefs) => void] {
  const [prefs, setPrefs] = useState<Prefs>({ theme: "light", fit: "width", trim: true });
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") as Partial<Prefs> | null;
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      // Reading from storage after mount keeps server and client HTML identical.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrefs({
        theme: saved?.theme && saved.theme in THEMES ? saved.theme : dark ? "night" : "light",
        // Phones read best fit to width; landscape screens fit the whole page.
        fit: saved?.fit ?? (window.innerWidth > window.innerHeight ? "page" : "width"),
        trim: saved?.trim ?? true,
      });
    } catch {}
  }, []);
  const save = useCallback((next: Prefs) => {
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {}
  }, []);
  return [prefs, save];
}

/** Content size of an element, tracked with ResizeObserver. */
function useSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      const height = Math.floor(entry.contentRect.height);
      setSize((prev) => (Math.abs(prev.width - width) > 4 || Math.abs(prev.height - height) > 4 ? { width, height } : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}
