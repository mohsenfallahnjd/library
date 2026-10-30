# Library — design doc

A personal reading library: PDF books, article links and websites in one place, readable on Mac and phone.

## Problem

Reading material is scattered: PDFs in folders, links in newsletters, tabs left open. Existing reader apps are either paid, closed, or don't fit how I read.

## Goals

- Add three kinds of items: **PDF book** (upload), **article** (URL), **website / resource** (URL).
- Track each item: status (`to-read` → `reading` → `done`), tags, notes, and for PDFs the last page read.
- Read PDFs in the app and resume where I stopped.
- Works on my phone (installable PWA) and syncs between devices.
- Fast to add things: paste a URL, the title is fetched automatically.

## Non-goals (for now)

- Sharing with other people, multiple users, social features.
- Full-text search inside PDFs.
- A perfect PDF reflow view (stretch goal, see milestones).

## Data model (first draft)

```ts
type ItemKind = "book" | "article" | "site";
type Status = "to-read" | "reading" | "done";

interface Item {
  id: string;
  kind: ItemKind;
  title: string;
  url?: string;        // article / site
  fileUrl?: string;    // book: PDF stored in Vercel Blob
  author?: string;
  tags: string[];
  status: Status;
  lastPage?: number;   // book progress
  totalPages?: number;
  notes?: string;      // markdown
  addedAt: Date;
  finishedAt?: Date;
}
```

## Architecture (first draft)

- **Next.js** (App Router) + **Tailwind**, deployed on **Vercel**.
- **Vercel Blob** for PDF files (you already use it in md-reader).
- **Postgres** (Neon via Vercel, or the docker setup from mahragh-new) + **Drizzle** for items.
- **PDF.js** (`pdfjs-dist`) for the reader view.
- Server Actions for add / update / delete; one route to fetch a URL's title (`<title>` / Open Graph).
- **Auth:** it's just you, so start with a single password or a secret in env. Revisit later.

## Open questions

- Local-first (IndexedDB + sync) or server-first (Postgres)? Server-first is simpler and gives sync for free; local-first is the more interesting engineering. Write the decision as an ADR.
- Can I reuse anything from `md-reader` (markdown rendering for notes) or `pdf-briefer`?
- How to add a link from the phone quickly? A bookmarklet, the PWA share target (Android only), or an iOS Shortcut that calls an API route.

## Book ideas to apply while building

- *A Philosophy of Software Design*: keep the `items` module deep, with a small interface (`addItem`, `updateProgress`, `listItems(filter)`) hiding storage details.
- *Fundamentals of Software Architecture*: list the top 3 architecture characteristics before choosing local-first vs. server-first.
- *Software Engineering at Google*: write tests for the items module before the UI grows.
