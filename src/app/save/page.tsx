import type { Metadata } from "next";
import { Suspense } from "react";
import { SaveForm } from "@/components/save-form";

export const metadata: Metadata = { title: "Save" };

/** Target of the bookmarklet and the Android share sheet: /save?url=…&title=… */
export default function SavePage({ searchParams }: PageProps<"/save">) {
  return (
    <div className="mx-auto max-w-md space-y-3 pt-4">
      <h1 className="font-mono text-sm text-muted">Save to library</h1>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-xl border border-line bg-surface" />}>
        <Prefilled searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Prefilled({ searchParams }: { searchParams: PageProps<"/save">["searchParams"] }) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const text = one(params.text);
  const url = one(params.url) || text.match(/https?:\/\/\S+/)?.[0] || "";
  return <SaveForm url={url} title={one(params.title)} />;
}
