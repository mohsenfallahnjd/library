"use client";

import { clsx } from "clsx";
import { LayoutList, Rows3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Density } from "./item-card";

export const DENSITY_COOKIE = "density";

function saveDensity(density: Density) {
  document.cookie = `${DENSITY_COOKIE}=${density}; path=/; max-age=31536000; samesite=lax`;
}

/** Remembered in a cookie so the server renders the right layout (no flash). */
export function DensityToggle({ density }: { density: Density }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function choose(next: Density) {
    saveDensity(next);
    start(() => router.refresh());
  }

  const option = (value: Density, label: string, Icon: typeof Rows3) => (
    <button
      type="button"
      aria-pressed={density === value}
      aria-label={label}
      title={label}
      onClick={() => choose(value)}
      className={clsx(
        "inline-flex size-8 items-center justify-center rounded-md transition",
        density === value ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink",
      )}
    >
      <Icon size={15} />
    </button>
  );

  return (
    <div className={clsx("flex shrink-0 gap-0.5 rounded-lg bg-line/50 p-0.5", pending && "opacity-60")}>
      {option("comfortable", "Cards", LayoutList)}
      {option("compact", "Compact list", Rows3)}
    </div>
  );
}
