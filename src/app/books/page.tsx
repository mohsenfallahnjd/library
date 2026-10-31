import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BookActions } from "@/components/book-actions";
import { suggestBooks } from "@/lib/books";
import { getBookLinks } from "@/lib/books-links";
import { listItems } from "@/lib/items";
import { markedKeys } from "@/lib/marks-db";
import { getStackTopics } from "@/lib/stack";

export const metadata: Metadata = { title: "Books" };

export default function BooksPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Books for your stack</h1>
        <p className="text-sm text-muted">
          Hand-picked tech books, matched to your topics and what you save.{" "}
          <Link href="/settings#stack" className="underline decoration-line underline-offset-2 hover:text-ink">
            Edit topics
          </Link>
        </p>
      </div>
      <Suspense fallback={<Skeleton />}>
        <Suggestions />
      </Suspense>
    </div>
  );
}

async function Suggestions() {
  const [topics, items, dismissed] = await Promise.all([getStackTopics(), listItems(), markedKeys("book:")]);
  const books = suggestBooks(topics, {
    libraryTitles: items.filter((i) => i.kind === "book").map((i) => i.title),
    libraryTags: items.flatMap((i) => i.tags),
    dismissed,
  });
  const links = await Promise.all(books.map((b) => getBookLinks(b.id)));

  if (books.length === 0) {
    return <p className="py-10 text-center text-sm text-muted">You have them all. Impressive.</p>;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {books.map((book, i) => {
        const link = links[i];
        return (
          <li key={book.id} className="flex gap-3 rounded-2xl border border-line bg-surface p-3">
            <a href={link?.pageUrl} target="_blank" rel="noreferrer" className="shrink-0" tabIndex={-1} aria-hidden>
              {link?.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- third-party cover, sized by CSS
                <img
                  src={link.coverUrl}
                  alt=""
                  loading="lazy"
                  className="h-28 w-[4.75rem] rounded-[3px_6px_6px_3px] border border-black/10 bg-bg object-cover shadow-sm"
                />
              ) : (
                <span className="flex h-28 w-[4.75rem] items-end overflow-hidden rounded-[3px_6px_6px_3px] bg-gradient-to-br from-accent/30 to-accent/10 p-1.5 shadow-sm">
                  <span className="line-clamp-4 text-[10px] leading-tight font-bold break-words">{book.title}</span>
                </span>
              )}
            </a>
            <div className="flex min-w-0 flex-1 flex-col">
              <a href={link?.pageUrl} target="_blank" rel="noreferrer" className="font-semibold leading-snug hover:text-accent">
                {book.title}
              </a>
              <p className="truncate text-xs text-muted">
                {book.author} · {book.year}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{book.why}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {book.matched.length ? (
                  book.matched.map((t) => (
                    <span key={t} className="chip border-accent/30 text-accent">
                      #{t}
                    </span>
                  ))
                ) : (
                  <span className="chip">classic</span>
                )}
              </div>
              <div className="mt-auto pt-2">
                <BookActions bookId={book.id} title={book.title} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Skeleton() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2" aria-busy>
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="h-36 animate-pulse rounded-2xl border border-line bg-surface" />
      ))}
    </ul>
  );
}
