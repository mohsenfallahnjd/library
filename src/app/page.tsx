import { Suspense } from "react";
import { AddPanel } from "@/components/add-panel";
import { FilterBar } from "@/components/filter-bar";
import { ItemCard } from "@/components/item-card";
import { filterSchema, listItems, listTags } from "@/lib/items";
import { usesBlob } from "@/lib/storage";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div className="space-y-4">
      <AddPanel directUpload={usesBlob()} />
      <Suspense fallback={<ListSkeleton />}>
        <Library searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Library({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const filter = filterSchema.parse({
    kind: one(params.kind),
    status: one(params.status),
    tag: one(params.tag),
    q: one(params.q),
  });
  const [items, tags] = await Promise.all([listItems(filter), listTags()]);
  const filtered = Boolean(filter.kind || filter.status || filter.tag || filter.q);

  return (
    <div className="space-y-3">
      <FilterBar filter={filter} tags={tags} />
      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">
          {filtered ? "No items match these filters." : "Nothing here yet. Paste a link above."}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </ul>
      )}
      <p className="text-center font-mono text-xs text-muted">
        {items.length} item{items.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul className="space-y-2" aria-busy>
      {[0, 1, 2].map((i) => (
        <li key={i} className="h-20 animate-pulse rounded-xl border border-line bg-surface" />
      ))}
    </ul>
  );
}
