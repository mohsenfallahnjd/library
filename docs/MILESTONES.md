# Library — milestones

Each milestone fits roughly two long blocks (2–4 hours).

- [x] **0. Scaffold.** In this folder run `bunx create-next-app@latest .` (TypeScript, Tailwind, App Router). Commit.
- [x] **1. Links.** Add an article/site by URL, auto-fetch its title, list items. Store in Postgres with Drizzle.
- [x] **2. Status, tags, filters.** Change status, add tags, filter the list by kind / status / tag, simple search by title.
- [x] **3. PDF books.** Upload a PDF to Vercel Blob, open it in a PDF.js reader view, save the last page and resume there.
- [x] **4. Phone.** Make it an installable PWA, fix the layout for phone width, add a quick way to save links from the phone.
- [ ] **5. Deploy.** Deploy to Vercel, add a simple password, use it for one full week of real reading.
  - [x] Simple password (single-user auth, `src/proxy.ts`).
  - [ ] Deploy to Vercel (steps in README).
  - [ ] One full week of real reading.
- [x] **Extra: Discover.** Tech articles from Hacker News, Lobsters and dev.to that match my stack, one-click save (see ADR 0002).
- [ ] **6. Stretch.** Pick one: highlights and notes per item exported to Obsidian as Markdown; a reflowed text view for PDFs; a "reading streak" stats page.
