"use client";

import { Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { addLinkAction } from "@/app/actions";
import { idle, type ActionResult } from "@/lib/result-types";

export function AddLinkForm() {
  const [suggested, setSuggested] = useState("");
  const [open, setOpen] = useState(false);
  // React resets the (uncontrolled) form after the action; clear the hint too.
  const [state, action, pending] = useActionState(async (prev: ActionResult, form: FormData) => {
    const result = await addLinkAction(prev, form);
    if (result.ok) setSuggested("");
    return result;
  }, idle);

  async function lookup(url: string) {
    setSuggested("");
    if (!/^https?:\/\/\S+\.\S+/.test(url)) return;
    const res = await fetch(`/api/title?url=${encodeURIComponent(url)}`).catch(() => null);
    if (res?.ok) setSuggested(((await res.json()) as { title: string }).title);
  }

  return (
    <form action={action} className="space-y-2 rounded-xl border border-line bg-surface p-3">
      <div className="flex gap-2">
        <input
          name="url"
          type="url"
          required
          inputMode="url"
          autoComplete="off"
          placeholder="Paste an article or site URL…"
          className="input"
          onBlur={(e) => lookup(e.currentTarget.value)}
          onPaste={(e) => lookup(e.clipboardData.getData("text"))}
          onFocus={() => setOpen(true)}
        />
        <button type="submit" disabled={pending} className="btn-primary shrink-0">
          <Plus size={16} aria-hidden />
          <span className="hidden sm:inline">{pending ? "Saving…" : "Add"}</span>
          <span className="sr-only sm:hidden">Add</span>
        </button>
      </div>
      {open && (
        <div className="grid gap-2 sm:grid-cols-[1fr_8rem_10rem]">
          <input
            name="title"
            placeholder={suggested || "Title (fetched automatically)"}
            className="input"
            aria-label="Title"
          />
          <select name="kind" className="input" aria-label="Kind" defaultValue="article">
            <option value="article">Article</option>
            <option value="site">Site / resource</option>
          </select>
          <input name="tags" placeholder="tags, comma separated" className="input" aria-label="Tags" />
        </div>
      )}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.message && <p className="text-sm text-ok">{state.message}</p>}
    </form>
  );
}
