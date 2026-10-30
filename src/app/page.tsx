import { Suspense } from "react";
import { AddLinkForm } from "@/components/add-link-form";
import { ItemCard } from "@/components/item-card";
import { listItems } from "@/lib/items";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div className="space-y-4">
      <AddLinkForm />
      <Suspense fallback={<ListSkeleton />}>
        <ItemList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ItemList({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const items = await listItems({ tag: one(params.tag) });

  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-muted">Nothing here yet. Paste a link above.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </ul>
  );
}

function ListSkeleton() {
  return (
    <ul className="space-y-2" aria-busy>
      {[0, 1, 2].map((i) => (
        <li key={i} className="h-16 animate-pulse rounded-xl border border-line bg-surface" />
      ))}
    </ul>
  );
}
