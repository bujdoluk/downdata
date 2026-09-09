import { defineConfig } from "vitest/config";
import path from "node:path";

const rootDir = import.meta.dirname;

// Node environment by default — these are pure-logic unit tests (SSRF IP-range
// checks, HMAC signing), no DOM needed. The real-auth, real-DB, real-browser
// flow lives in playwright.config.ts instead, not here — see AGENTS.md's
// testing section and the plan behind this file for why the two are split.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Mirrors tsconfig.json's "@/*" -> "./src/*" — Vitest doesn't read
      // tsconfig path mappings on its own.
      "@": path.resolve(rootDir, "./src"),
    },
  },
});
