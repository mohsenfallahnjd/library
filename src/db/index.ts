import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import postgres from "postgres";
import * as schema from "./schema";

/** Any Postgres driver works (postgres-js in the app, PGlite in tests). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const globalForDb = globalThis as unknown as { pg?: postgres.Sql };

const url = process.env.DATABASE_URL;
const client =
  globalForDb.pg ??
  postgres(url!, {
    max: 5,
    // Neon's pooler (PgBouncer, transaction mode) can't keep prepared statements.
    prepare: !url?.includes("-pooler."),
  });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db: Db = drizzle(client, { schema });
export { schema };
