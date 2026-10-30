# ADR 0002: Tech focus, private PDF files and stateless auth

- **Status:** Accepted
- **Date:** 2026-10-30
- **Amends:** [ADR 0001](0001-stack.md)

## Context

While building milestones 1–5, a few choices turned out differently from the
first draft in DESIGN.md and ADR 0001. This ADR records them so the stack
decision in ADR 0001 stays readable.

## Decisions

### 1. A tech library with Discover, not a general book reader

The library is for tech reading. The home page is a live **feed**
(`src/lib/discover.ts`) that pulls recent stories from Hacker News (Algolia
API), Lobsters, dev.to and the TLDR Web Dev and Tech newsletters (articles
parsed out of each daily issue, sponsors skipped), keeps only those that match
the user's **stack topics**, and ranks them by topic matches, score, comments
and age. Posts on the official Next.js and Vercel blogs are always included for
30 days. Results are cached for a few minutes with `"use cache"` and the page
refreshes itself while open. The saved items moved to `/library`.

The stack topics (Next.js, React, TypeScript, Postgres, Drizzle, Bun, …) are
stored in a small `settings` table and are editable in Settings. They are also
used to auto-tag new items, so a saved "PostgreSQL 18 indexing" post gets
`#postgres` without typing anything.

Items get two extra columns: `source` (`hn`, `lobsters`, `devto`,
`quick-save`) and `updatedAt`. `url` is unique, so saving the same link twice
returns the existing item.

### 2. PDFs are private; the database stores a key, not a URL

DESIGN.md has `fileUrl`. Instead the `items.file_key` column stores an opaque
key like `library/<id>-<slug>.pdf`, and `src/lib/storage.ts` decides where it
lives:

- **Vercel Blob, private access** when `BLOB_READ_WRITE_TOKEN` is set. The
  browser uploads directly to Blob with a client token from `/api/upload`, so
  large books are not limited by the 4.5 MB function body limit.
- **Local disk** (`./uploads`) otherwise, for development without a Blob store.

Files are always read through `/api/files/[...key]`, which sits behind auth.
Public Blob URLs would be unguessable but still shareable; private blobs keep
books readable only when signed in.

### 3. Stateless single-password auth in `proxy.ts`

- One password from `LIBRARY_PASSWORD`. The session cookie is
  `v1.<expiresAt>.<HMAC>` signed with `AUTH_SECRET` (falls back to the
  password), httpOnly, `SameSite=Lax`, 90 days. No sessions table.
- Changing the password or `AUTH_SECRET` signs every device out.
- Next.js 16 renamed `middleware.ts` to **`proxy.ts`** (Node.js runtime), so
  the guard lives in `src/proxy.ts`. Server actions check the session again
  next to the data.
- Quick-save `POST /api/items` uses a separate bearer token
  (`LIBRARY_API_TOKEN`) so an iOS Shortcut never needs the password.

### 4. Testing with PGlite

The items module takes its database as a dependency (`createItems({ db, … })`).
Unit tests run it against PGlite (Postgres in WebAssembly) with the real
Drizzle migrations, so tests need no Docker and still exercise real SQL
(arrays, `ilike`, unique constraints).

### 5. No service worker yet

The PWA is installable (manifest, icons, Android share target) but online-only,
as ADR 0001 expected. Offline reading of cached PDFs is a later step.

## Consequences

- (+) Discover makes the library useful even when nothing new was saved.
- (+) Books can't leak through a copied URL; storage is swappable in one file.
- (+) No extra table or library for auth.
- (−) Every PDF read goes through a function (bandwidth and cold starts on
  Vercel). Fine for one reader; revisit if it gets slow.
- (−) Discover depends on three public APIs that may change or rate-limit.
  Each source fails independently and the page still renders.
- (−) Stateless cookies can't be revoked one by one; rotating `AUTH_SECRET`
  revokes all.
