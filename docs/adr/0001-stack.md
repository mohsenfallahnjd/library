# ADR 0001: Stack for the library

- **Status:** Accepted (amended by [ADR 0002](0002-tech-focus-private-files-and-stateless-auth.md))
- **Date:** 2026-10-30

## Context

The library must work on Mac and phone, store PDF files and links, and sync between devices. It's a personal project, so simplicity and fun matter more than scale.

## Decision

Next.js + Tailwind on Vercel, Postgres + Drizzle for items, Vercel Blob for PDFs, PDF.js for reading. Server-first: the server is the source of truth, which gives sync between devices for free.

## Consequences

- (+) Same stack as my other projects, so I can focus on the product and the design ideas.
- (+) Sync and phone access work as soon as it's deployed.
- (−) No offline reading at first. A PWA cache could fix this later.
- (−) Depends on Vercel and a hosted Postgres.

## Alternatives considered

- Local-first (IndexedDB/OPFS + a sync layer): more interesting engineering, works offline, but sync is a hard problem to solve first.

> Revisit this ADR in Month 2 after reading FoSA ch. 21 "Architectural Decisions".
