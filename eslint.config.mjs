import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // .next-e2e is the E2E build's separate distDir (see next.config.ts).
  globalIgnores([".next/**", ".next-e2e/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
