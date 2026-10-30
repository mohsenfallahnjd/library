import { defineConfig } from "drizzle-kit";

// Next.js loads .env itself; drizzle-kit does not.
try {
  process.loadEnvFile();
} catch {}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Neon sets DATABASE_URL_UNPOOLED; migrations should skip the pooler.
  dbCredentials: { url: (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL)! },
});
