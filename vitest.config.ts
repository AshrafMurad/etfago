import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Integration suites share a database/outbox; avoid interference and excess memory.
    fileParallelism: false,
    maxWorkers: 1,
    server: { deps: { inline: ["next-intl"] } },
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
