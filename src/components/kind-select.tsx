"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function KindSelect({ kind }: { kind?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Type"
      value={kind ?? ""}
      disabled={pending}
      onChange={(e) => {
        const next = new URLSearchParams(params);
        if (e.currentTarget.value) next.set("kind", e.currentTarget.value);
        else next.delete("kind");
        start(() => router.replace(`${pathname}?${next}`, { scroll: false }));
      }}
      className="h-8 rounded-lg border border-line bg-surface pl-2.5 text-xs text-muted outline-none focus:border-accent"
    >
      <option value="">All types</option>
      <option value="article">Articles</option>
      <option value="site">Sites</option>
      <option value="book">Books</option>
    </select>
  );
}
