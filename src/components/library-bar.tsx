"use client";

import { clsx } from "clsx";
import { FileUp, Plus, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { addLinkAction } from "@/app/actions";
import { idle } from "@/lib/result-types";
import { Spinner } from "./spinner";
import { UploadBookForm } from "./upload-book-form";

const looksLikeUrl = (v: string) => /^(https?:\/\/)?[^\s/]+\.[a-z]{2,}(\/\S*)?$/i.test(v.trim());

/**
 * One box for the two things you do most: type to search, paste a link to
 * save it. The PDF button opens the upload form underneath.
 */
export function LibraryBar({ directUpload }: { directUpload: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [adding, startAdd] = useTransition();
  const [, startNav] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isUrl = looksLikeUrl(value);

  function search(q: string) {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (q.trim()) {
        next.set("q", q.trim());
        next.set("status", "all"); // search everything, not just one tab
      } else next.delete("q");
      startNav(() => router.replace(`${pathname}?${next}`, { scroll: false }));
    }, 250);
  }

  function add() {
    const url = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
    startAdd(async () => {
      const form = new FormData();
      form.set("url", url);
      const result = await addLinkAction(idle, form);
      if (result.error) return setMessage({ text: result.error, error: true });
      setValue("");
      setMessage({ text: result.message ?? "Saved" });
      setTimeout(() => setMessage(null), 4000);
    });
  }

  return (
    <div className="space-y-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isUrl) add();
        }}
        className="flex gap-2"
      >
        <label className="relative flex-1">
          {adding ? (
            <Spinner size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          ) : (
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          )}
          <input
            value={value}
            onChange={(e) => {
              const v = e.currentTarget.value;
              setValue(v);
              setMessage(null);
              if (!looksLikeUrl(v)) search(v);
            }}
            type="text"
            inputMode="url"
            enterKeyHint={isUrl ? "done" : "search"}
            autoComplete="off"
            placeholder="Search or paste a link"
            aria-label="Search or paste a link"
            className="input h-11 pr-24 pl-9"
          />
          {value && (
            <button
              type="button"
              aria-label="Clear"
              onClick={() => {
                setValue("");
                search("");
              }}
              className={clsx("absolute top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink", isUrl ? "right-[5.25rem]" : "right-2")}
            >
              <X size={15} />
            </button>
          )}
          {isUrl && (
            <button
              type="submit"
              disabled={adding}
              className="absolute top-1/2 right-1.5 inline-flex h-8 -translate-y-1/2 items-center gap-1 rounded-md bg-accent px-3 text-sm font-medium text-accent-ink"
            >
              <Plus size={15} /> Save
            </button>
          )}
        </label>
        <button
          type="button"
          onClick={() => setShowUpload((s) => !s)}
          aria-expanded={showUpload}
          aria-label="Add a PDF book"
          title="Add a PDF book"
          className={clsx("btn-ghost h-11 w-11 shrink-0 px-0", showUpload && "border-accent text-accent")}
        >
          <FileUp size={18} />
        </button>
      </form>
      {message && <p className={clsx("text-sm", message.error ? "text-red-600" : "text-ok")}>{message.text}</p>}
      {showUpload && <UploadBookForm direct={directUpload} />}
    </div>
  );
}
