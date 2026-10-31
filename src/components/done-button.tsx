"use client";

import { Check, RotateCcw } from "lucide-react";
import { useTransition } from "react";
import { setStatusAction } from "@/app/actions";
import type { Status } from "@/lib/items";
import { Spinner } from "./spinner";

/** The one status action a card needs: finish it, or bring it back. */
export function DoneButton({ id, status, compact = false }: { id: string; status: Status; compact?: boolean }) {
  const [pending, start] = useTransition();
  const done = status === "done";
  const label = done ? "Read again" : "Done";
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => void (await setStatusAction(id, done ? "to-read" : "done")))}
      aria-label={label}
      title={done ? "Move back to To read" : "Mark as done"}
      className={
        compact
          ? "inline-flex size-10 items-center justify-center rounded-full border border-line text-muted transition hover:border-ok hover:bg-ok/10 hover:text-ok active:scale-95 disabled:opacity-60 sm:size-8"
          : "inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-3.5 text-sm sm:h-8 sm:px-3 sm:text-xs font-medium text-muted transition hover:border-ok hover:bg-ok/10 hover:text-ok disabled:opacity-60"
      }
    >
      {pending ? <Spinner /> : done ? <RotateCcw size={14} /> : <Check size={14} />}
      {!compact && label}
    </button>
  );
}

/** Title link that moves an unread article to Reading when you open it. */
export function OpenLink({
  id,
  status,
  href,
  external,
  className,
  children,
}: {
  id: string;
  status: Status;
  href: string;
  external: boolean;
  className: string;
  children: React.ReactNode;
}) {
  const startReading = () => {
    if (external && status === "to-read") void setStatusAction(id, "reading");
  };
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      onClick={startReading}
      onAuxClick={startReading}
      className={className}
    >
      {children}
    </a>
  );
}
