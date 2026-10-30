"use client";

import { Check, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { saveSuggestionAction } from "@/app/actions";
import type { SourceId } from "@/lib/discover";
import { Spinner } from "./spinner";

export function SaveSuggestionButton(props: { url: string; title: string; source: SourceId; saved: boolean }) {
  const [saved, setSaved] = useState(props.saved);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  if (saved) {
    return (
      <span className="flex items-center gap-1 px-2 py-1 text-xs text-ok">
        <Check size={14} /> Saved
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending}
      onClick={() =>
        start(async () => {
          const result = await saveSuggestionAction({ url: props.url, title: props.title, source: props.source });
          setError(Boolean(result.error));
          if (result.ok) setSaved(true);
        })
      }
      className="btn-ghost shrink-0 px-2 py-1 text-xs"
      title={error ? "Could not save, try again" : "Save to library"}
    >
      {pending ? <Spinner /> : <Plus size={14} />} {pending ? "Saving" : error ? "Retry" : "Save"}
    </button>
  );
}
