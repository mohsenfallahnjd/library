"use client";

import { useActionState } from "react";
import { saveTopicsAction } from "@/app/actions";
import { idle } from "@/lib/result-types";
import { Spinner } from "./spinner";

export function TopicsForm({ topics }: { topics: string[] }) {
  const [state, action, pending] = useActionState(saveTopicsAction, idle);
  return (
    <form action={action} className="space-y-2">
      <textarea name="topics" defaultValue={topics.join(", ")} rows={5} aria-label="Stack topics" className="input font-mono" />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} aria-busy={pending} className="btn-primary">
          {pending ? (
            <>
              <Spinner /> Saving…
            </>
          ) : (
            "Save topics"
          )}
        </button>
        {state.message && <span className="text-sm text-ok">{state.message}</span>}
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
