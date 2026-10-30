import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PdfReader } from "@/components/pdf-reader";
import { getItem } from "@/lib/items";

export const metadata: Metadata = { title: "Reading" };

export default function ReadPage({ params }: PageProps<"/read/[id]">) {
  return (
    <Suspense fallback={<p className="py-20 text-center text-sm text-muted">Opening…</p>}>
      <Reader params={params} />
    </Suspense>
  );
}

async function Reader({ params }: { params: PageProps<"/read/[id]">["params"] }) {
  const { id } = await params;
  const item = await getItem(id);
  if (!item || item.kind !== "book" || !item.fileKey) notFound();
  return (
    <PdfReader
      id={item.id}
      title={item.title}
      fileUrl={`/api/files/${item.fileKey}`}
      initialPage={item.lastPage ?? 1}
      initialTotal={item.totalPages}
    />
  );
}
