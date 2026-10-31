import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { createMarks, type Marks } from "./marks";

let db: ReturnType<typeof drizzle<typeof schema>>;
let marks: Marks;

beforeEach(async () => {
  db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  marks = createMarks(db as unknown as Db);
});

describe("marks", () => {
  it("marks, lists and unmarks", async () => {
    await marks.mark("read", [{ key: "https://a.dev/", title: "A" }, { key: "https://b.dev/" }]);
    expect(await marks.markedKeys()).toEqual(new Set(["https://a.dev/", "https://b.dev/"]));
    await marks.unmark(["https://a.dev/"]);
    expect(await marks.markedKeys()).toEqual(new Set(["https://b.dev/"]));
  });

  it("switches state when marked again", async () => {
    await marks.mark("read", [{ key: "https://a.dev/" }]);
    await marks.mark("hidden", [{ key: "https://a.dev/" }]);
    expect(await marks.recent("read")).toEqual([]);
    expect((await marks.recent("hidden")).map((m) => m.key)).toEqual(["https://a.dev/"]);
  });

  it("filters by prefix and keeps books out of the read history", async () => {
    await marks.mark("hidden", [{ key: "book:ddia" }]);
    await marks.mark("read", [{ key: "https://a.dev/" }]);
    expect(await marks.markedKeys("book:")).toEqual(new Set(["book:ddia"]));
    expect((await marks.recent("hidden")).map((m) => m.key)).toEqual([]);
  });

  it("forgets marks older than 60 days", async () => {
    await marks.mark("read", [{ key: "https://old.dev/" }]);
    await db.execute(sql`update marks set created_at = now() - interval '90 days'`);
    await marks.mark("read", [{ key: "https://new.dev/" }]);
    expect(await marks.markedKeys()).toEqual(new Set(["https://new.dev/"]));
  });

  it("validates input", async () => {
    await expect(marks.mark("read", [])).rejects.toThrow();
  });
});
