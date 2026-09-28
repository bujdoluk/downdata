import { defineConfig } from "vitest/config";
import path from "node:path";

const rootDir = import.meta.dirname;

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Vitest doesn't read tsconfig path mappings.
      "@": path.resolve(rootDir, "./src"),
    },
  },
});
