# Library

A personal tech reading library: PDF books, articles and sites in one place,
readable on Mac and phone. The home page is a live feed of tech articles for
your stack.

- **Library**: paste a URL and the title is fetched for you. Items get a status
  (to read → reading → done), tags, notes and filters by kind, status, tag and title.
- **Books**: upload a PDF, read it in the app (PDF.js), and it opens where you stopped.
- **Home**: your unfinished books and saved articles first, then the feed.
- **Feed** (on Home): recent posts from Hacker News, Lobsters, dev.to and the
  TLDR Web Dev / Tech newsletters that mention your stack topics, plus every new
  post on the Next.js and Vercel blogs. Ranked by relevance, votes and freshness,
  refreshed every few minutes. Newest first, grouped by day: open a story (it is
  marked read), tap ✓ to hide it, or save it to the library; "Mark all read"
  clears a day, and every action can be undone. Read state syncs across devices.
  Keys on the Mac: `j`/`k` move, `o` open, `r` read, `s` save, `u` undo.
- **Books** (`/books`): your books first, then hand-picked tech books matched to your topics and the
  tags you save, with covers from Open Library. "Want to read" adds the book
  to your library; attach its PDF later from the book's edit page.
- **Library** (`/library`): everything you saved, in Up next / Done / All
  tabs. One box searches or, when you paste a link, saves it; the PDF button
  uploads a book. Opening an article moves it to Reading; ✓ Done finishes it.
- **Phone**: installable PWA, a bookmarklet, an Android share target and an iOS Shortcut.
- **Single user**: one password, signed httpOnly cookie.

Stack: Next.js 16 (App Router), Tailwind 4, Postgres + Drizzle, Vercel Blob,
PDF.js, zod, vitest. Design notes: [docs/DESIGN.md](docs/DESIGN.md),
[ADR 0001](docs/adr/0001-stack.md), [ADR 0002](docs/adr/0002-tech-focus-private-files-and-stateless-auth.md).

## Local setup

Needs [Bun](https://bun.sh) and Docker.

```bash
bun install
cp .env.example .env        # then fill in the values below
bun run db:up               # Postgres 17 on localhost:5434
bun run db:migrate          # apply the Drizzle migrations
bun run dev                 # http://localhost:3000
```

### Environment variables

| Variable | Required | What it does |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string. Local: `postgres://library:library@localhost:5434/library` |
| `DATABASE_URL_UNPOOLED` | no | Used by migrations if set (Neon sets it). |
| `LIBRARY_PASSWORD` | yes | The password for the login page. Without it nobody can sign in. |
| `AUTH_SECRET` | recommended | Signs the session cookie. Random string, e.g. `openssl rand -hex 32`. Changing it signs everyone out. |
| `LIBRARY_API_TOKEN` | for quick save | Bearer token for `POST /api/items` (iOS Shortcut). e.g. `openssl rand -hex 24` |
| `BLOB_READ_WRITE_TOKEN` | no | Vercel Blob token. When empty, PDFs are stored in `./uploads`. |

### Scripts

| Command | |
| --- | --- |
| `bun run dev` / `build` / `start` | Next.js |
| `bun run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `bun run test` | vitest (items module, title fetcher, topics, Discover, sessions). Uses PGlite, no Docker needed. |
| `bun run db:up` | Start the Postgres container |
| `bun run db:generate` | Create a migration after changing `src/db/schema.ts` |
| `bun run db:migrate` | Apply migrations |
| `bun run db:studio` | Drizzle Studio |

## Code map

- `src/lib/items.ts`: the items module. `addItem`, `updateItem`, `updateProgress`,
  `deleteItem`, `listItems(filter)` (plus `getItem` and `listTags`). Validation (zod),
  URL normalisation, de-duplication, auto-tagging and file clean-up all live
  here. Pages and routes never import Drizzle.
- `src/lib/title.ts`: fetches `og:title` / `twitter:title` / `<title>`.
- `src/lib/discover.ts`: feed sources (HN, Lobsters, dev.to, TLDR, Next.js and Vercel blogs) plus ranking.
- `src/lib/storage.ts`: PDF storage (Vercel Blob or `./uploads`).
- `src/lib/session.ts`, `src/proxy.ts`: auth. (Next 16 renamed `middleware.ts` to `proxy.ts`.)

## Deploy to Vercel (Neon Postgres + Vercel Blob)

1. Push the repo to GitHub and import it in Vercel. The framework preset is
   detected; Vercel uses Bun because of `bun.lock`.
2. **Database**: in the project, go to *Storage → Create → Neon (Postgres)* and
   connect it to the project. This adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
3. **Files**: *Storage → Create → Blob*, choose **private** access, and connect it.
   This adds `BLOB_READ_WRITE_TOKEN`.
4. **Secrets**: in *Settings → Environment Variables* add `LIBRARY_PASSWORD`,
   `AUTH_SECRET` and `LIBRARY_API_TOKEN` (Production and Preview).
5. **Migrations run on every Vercel build** (`vercel-build` runs `drizzle-kit migrate`
   before `next build`, using `DATABASE_URL_UNPOOLED`). To run them by hand instead:

   ```bash
   bunx vercel link
   bunx vercel env pull .env.production.local
   bun --env-file=.env.production.local run db:migrate
   ```

6. Deploy (push to `main`, or `bunx vercel --prod`). Open the site, sign in,
   and on the phone use *Share → Add to Home Screen*.

## Quick save from the phone

### iOS Shortcut (Safari share sheet)

1. Open **Shortcuts** → **+** → name it “Save to Library”.
2. Tap the **ⓘ** (details) button → turn on **Show in Share Sheet**. In the
   first action's “Receive … from Share Sheet”, choose **URLs** and **Safari web pages**.
3. Add **Get URLs from Input** (input: *Shortcut Input*). Safari shares a
   "web page", not a plain link; this turns it into the URL.
4. Add the action **Get Contents of URL**:
   - URL: `https://<your-domain>/api/items`
   - Method: **POST**
   - Headers: `Authorization` = `Bearer <your LIBRARY_API_TOKEN>`
   - Request Body: **JSON**, add a field `url` (Text) = **URLs** (from step 3)
     (optional: `kind` = `site`, `tags` = `phone, later`)
5. Add **Get Dictionary Value** → key `title` from *Contents of URL*, then
   **Show Notification** with that value, so you see what was saved.
6. In Safari, tap **Share → Save to Library**. (Tapping ▶ in the Shortcuts
   editor has no page to send, so the API answers "No link found".)

The endpoint returns `201` with `{ id, title, url, tags, created: true }`, or `200`
with `created: false` if the link was already saved. You can test it with:

```bash
curl -X POST https://<your-domain>/api/items \
  -H "Authorization: Bearer $LIBRARY_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://nextjs.org/blog"}'
```

### Bookmarklet (desktop browsers)

Open **Settings** in the app and drag the **+ library** button to the
bookmarks bar. Clicking it on any page opens a small window with the link
filled in; press **Save**.

### Android

After installing the PWA, **Share → Library** opens the same save page.
