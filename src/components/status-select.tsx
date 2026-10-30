"use client";

import { clsx } from "clsx";
import { useOptimistic, useTransition } from "react";
import { setStatusAction } from "@/app/actions";
import type { Status } from "@/lib/items";

export const STATUS_LABEL: Record<Status, string> = {
  "to-read": "To read",
  reading: "Reading",
  done: "Done",
};

const STATUS_STYLE: Record<Status, string> = {
  "to-read": "text-muted",
  reading: "text-info",
  done: "text-ok",
};

export function StatusSelect({ id, status }: { id: string; status: Status }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useOptimistic(status);

  return (
    <select
      aria-label="Status"
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.currentTarget.value as Status;
        start(async () => {
          setValue(next);
          await setStatusAction(id, next);
        });
      }}
      className={clsx(
        "rounded-md border border-line bg-surface px-1.5 py-1 font-mono text-xs outline-none focus:border-accent",
        STATUS_STYLE[value],
      )}
    >
      {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}
