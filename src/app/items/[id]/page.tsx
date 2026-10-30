import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EditItemForm } from "@/components/edit-item-form";
import { getItem } from "@/lib/items";

export const metadata: Metadata = { title: "Edit" };

export default function EditPage({ params }: PageProps<"/items/[id]">) {
  return (
    <div className="space-y-4">
      <Link href="/library" className="text-sm text-muted hover:text-ink">
        ← Library
      </Link>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl border border-line bg-surface" />}>
        <Editor params={params} />
      </Suspense>
    </div>
  );
}

async function Editor({ params }: { params: PageProps<"/items/[id]">["params"] }) {
  const { id } = await params;
  const item = await getItem(id);
  if (!item) notFound();
  return <EditItemForm item={item} />;
}
