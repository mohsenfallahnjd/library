"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";
import { deleteItemAction, saveItemAction } from "@/app/actions";
import type { Item } from "@/lib/items";
import { idle } from "@/lib/result-types";
import { Spinner } from "./spinner";

const STATUS_LABEL = { "to-read": "To read", reading: "Reading", done: "Done" } as const;

export function EditItemForm({ item }: { item: Item }) {
  const [state, action, pending] = useActionState(saveItemAction.bind(null, item.id), idle);
  const isBook = item.kind === "book";

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3 rounded-xl border border-line bg-surface p-4">
        <Field label="Title">
          <input name="title" defaultValue={item.title} required className="input" />
        </Field>
        <Field label={isBook ? "Link" : "URL"} hint={isBook ? "optional, e.g. where to get the book" : undefined}>
          <input name="url" type="url" defaultValue={item.url ?? ""} required={!isBook} className="input font-mono" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Kind">
            {isBook ? (
              <>
                <input type="hidden" name="kind" value="book" />
                <input value="Book" disabled className="input" />
              </>
            ) : (
              <select name="kind" defaultValue={item.kind} className="input">
                <option value="article">Article</option>
                <option value="site">Site / resource</option>
              </select>
            )}
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={item.status} className="input">
              {Object.entries(STATUS_LABEL).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Author">
            <input name="author" defaultValue={item.author ?? ""} className="input" />
          </Field>
        </div>
        <Field label="Tags" hint="comma separated">
          <input name="tags" defaultValue={item.tags.join(", ")} className="input font-mono" />
        </Field>
        <Field label="Notes" hint="markdown">
          <textarea name="notes" defaultValue={item.notes ?? ""} rows={6} className="input font-mono" />
        </Field>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={pending} aria-busy={pending} className="btn-primary">
            {pending ? (
            <>
              <Spinner /> Saving…
            </>
          ) : (
            "Save"
          )}
          </button>
        </div>
      </form>

      <form
        action={deleteItemAction.bind(null, item.id)}
        onSubmit={(e) => {
          if (!confirm(`Delete “${item.title}”?${item.fileKey ? " The PDF is deleted too." : ""}`)) e.preventDefault();
        }}
        className="flex justify-end"
      >
        <button type="submit" className="btn text-red-600 hover:bg-red-500/10">
          <Trash2 size={14} /> Delete
        </button>
      </form>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted">
        {label} {hint && <span className="font-normal opacity-70">· {hint}</span>}
      </span>
      {children}
    </label>
  );
}
