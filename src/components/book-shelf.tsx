import { clsx } from "clsx";
import Link from "next/link";
import type { Item } from "@/lib/items";
import { Thumb } from "./item-card";

/** Your unfinished books: one tap to keep reading, or to add a missing PDF. */
export function BookShelf({ books, scroll = false }: { books: Item[]; scroll?: boolean }) {
  return (
    <ul
      className={clsx(
        scroll ? "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" : "grid gap-2 sm:grid-cols-2",
      )}
    >
      {books.map((book) => {
        const pct = book.totalPages && book.lastPage ? Math.round((book.lastPage / book.totalPages) * 100) : 0;
        return (
          <li key={book.id} className={clsx(scroll && "w-64 shrink-0")}>
            <Link
              href={book.fileKey ? `/read/${book.id}` : `/items/${book.id}#pdf`}
              className="flex h-full items-center gap-3 rounded-xl border border-line bg-surface p-2 pr-3 hover:border-accent/50"
            >
              <Thumb item={book} site={null} compact={false} />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm leading-snug font-medium">{book.title}</span>
                {!book.fileKey ? (
                  <span className="mt-1 block text-xs font-medium text-accent">Add PDF</span>
                ) : book.lastPage ? (
                  <span className="mt-1.5 flex items-center gap-2">
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="font-mono text-[11px] text-muted">p.{book.lastPage}</span>
                  </span>
                ) : (
                  <span className="mt-1 block text-xs font-medium text-accent">Start reading</span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
