"use client";

import { BookPlus, Check, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { dismissBookAction, wantBookAction } from "@/app/actions";
import { Spinner } from "./spinner";

/** "Want to read" adds the book to the library; "Not for me" hides it. */
export function BookActions({ bookId, title }: { bookId: string; title: string }) {
  const [state, setState] = useState<"idle" | "added" | "dismissed">("idle");
  const [itemId, setItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [which, setWhich] = useState<"want" | "dismiss" | null>(null);

  if (state === "added") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-ok">
        <Check size={14} /> In your library ·{" "}
        <Link href={itemId ? `/items/${itemId}#pdf` : "/library"} className="underline underline-offset-2">
          add its PDF
        </Link>
      </p>
    );
  }
  if (state === "dismissed") {
    return (
      <p className="flex items-center gap-2 text-xs text-muted">
        Hidden.
        <button
          type="button"
          className="underline underline-offset-2 hover:text-ink"
          onClick={() => start(async () => {
            await dismissBookAction(bookId, true);
            setState("idle");
          })}
        >
          Undo
        </button>
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setWhich("want");
            start(async () => {
              const result = await wantBookAction(bookId);
              setError(result.error ?? null);
              if (result.ok) {
                setItemId(result.id ?? null);
                setState("added");
              }
            });
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-medium text-accent-ink hover:opacity-90 disabled:opacity-60"
        >
          {pending && which === "want" ? <Spinner /> : <BookPlus size={14} />} Want to read
        </button>
        <button
          type="button"
          disabled={pending}
          aria-label={`Not interested in ${title}`}
          title="Not for me"
          onClick={() => {
            setWhich("dismiss");
            start(async () => {
              await dismissBookAction(bookId);
              setState("dismissed");
            });
          }}
          className="inline-flex size-8 items-center justify-center rounded-full border border-line text-muted hover:text-ink disabled:opacity-60"
        >
          {pending && which === "dismiss" ? <Spinner /> : <X size={14} />}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
