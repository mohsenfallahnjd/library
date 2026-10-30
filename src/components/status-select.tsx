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
  "to-read": "border-line bg-surface text-muted",
  reading: "border-info/30 bg-info/10 text-info",
  done: "border-ok/30 bg-ok/10 text-ok",
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
        "h-7 rounded-full border pl-2.5 font-mono text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/40",
        "[background-position:right_0.45rem_center]! [background-size:0.85rem]! pr-6.5!",
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
