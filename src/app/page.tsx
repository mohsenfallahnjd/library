import { Pencil } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AddLinkForm } from "@/components/add-link-form";
import { FilterBar } from "@/components/filter-bar";
import { ItemCard } from "@/components/item-card";
import { StatusSelect } from "@/components/status-select";
import { filterSchema, listItems, listTags } from "@/lib/items";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div className="space-y-4">
      <AddLinkForm />
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
        <ul className="space-y-2">
          {items.map((item) => (
            <ItemCard key={item.id} item={item}>
              <div className="mt-2 flex items-center justify-end gap-2 border-t border-line pt-2">
                <StatusSelect id={item.id} status={item.status} />
                <Link
                  href={`/items/${item.id}`}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:text-ink"
                >
                  <Pencil size={12} /> Edit
                </Link>
              </div>
            </ItemCard>
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
