"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { AddLinkForm } from "./add-link-form";
import { UploadBookForm } from "./upload-book-form";

export function AddPanel({ directUpload }: { directUpload: boolean }) {
  const [tab, setTab] = useState<"link" | "book">("link");
  return (
    <section className="space-y-2">
      <div className="flex gap-1 text-sm" role="tablist">
        {(
          [
            ["link", "Link"],
            ["book", "PDF book"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={clsx(
              "rounded-md px-2.5 py-1",
              tab === value ? "bg-surface font-medium shadow-sm ring-1 ring-line" : "text-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "link" ? <AddLinkForm /> : <UploadBookForm direct={directUpload} />}
    </section>
  );
}
