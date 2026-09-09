import { readFileSync } from "node:fs";

// Shared by playwright.config.ts (loads it into the spawned webServer's
// env) and every spec file that needs the same local Supabase credentials
// directly (e.g. to create a test user via the admin API) — Playwright's
// own test-runner process never inherits webServer.env, so a spec can't
// just read process.env.SUPABASE_SERVICE_ROLE_KEY without loading this
// itself too.
export function loadTestEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync(".env.test.local", "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    // Neither capture group is optional in the pattern above, so a
    // successful match guarantees both — noUncheckedIndexedAccess can't see
    // that from the regex itself, hence the assertions.
    if (match) env[match[1]!] = match[2]!;
  }
  return env;
}
