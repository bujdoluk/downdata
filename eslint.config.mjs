import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // .next-e2e is the Playwright E2E suite's own build output (see
  // next.config.ts's distDir / playwright.config.ts) — a separate dist dir
  // specifically so its build doesn't collide with a real dev server's
  // .next/, but that also means it needs its own ignore entry here since
  // it isn't covered by the plain ".next/**" pattern above.
  globalIgnores([".next/**", ".next-e2e/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
