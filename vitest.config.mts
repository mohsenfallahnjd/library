import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    alias: { "server-only": new URL("./src/test/empty.ts", import.meta.url).pathname },
  },
});
