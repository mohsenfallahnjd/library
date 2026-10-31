"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { addLinkAction } from "@/app/actions";
import { idle } from "@/lib/result-types";
import { Spinner } from "./spinner";

export function SaveForm({ url, title }: { url: string; title: string }) {
  const [state, action, pending] = useActionState(addLinkAction, idle);

  if (state.ok) {
    return (
      <div className="space-y-3 rounded-xl border border-line bg-surface p-4 text-center">
        <Check className="mx-auto text-ok" />
        <p className="text-sm">{state.message}</p>
        <div className="flex justify-center gap-2">
          <button type="button" className="btn-ghost" onClick={() => window.close()}>
            Close
          </button>
          <Link href="/library" className="btn-primary">
            Open library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <input name="url" type="url" required defaultValue={url} aria-label="URL" className="input font-mono" />
      <input name="title" defaultValue={title} placeholder="Title (fetched automatically)" aria-label="Title" className="input" />
      <div className="grid grid-cols-2 gap-2">
        <select name="kind" defaultValue="article" aria-label="Kind" className="input">
          <option value="article">Article</option>
          <option value="site">Site / resource</option>
        </select>
        <input name="tags" placeholder="tags" aria-label="Tags" className="input" />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} aria-busy={pending} autoFocus className="btn-primary w-full py-3">
        {pending ? (
          <>
            <Spinner /> Saving…
          </>
        ) : (
          "Save"
        )}
      </button>
    </form>
  );
}
