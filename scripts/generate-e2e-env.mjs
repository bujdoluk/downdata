// Generates .env.test.local for the Playwright webhook E2E suite — starts
// from the real .env (so unrelated env vars the app reads at module scope
// don't go missing and crash an unrelated route) and overrides only the
// three Supabase vars with the local `supabase start` instance's real
// credentials, so the E2E test hits a real local Postgres/Auth/PostgREST
// stack, not production. Run via `npm run test:e2e:setup` after
// `npx supabase start`.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const statusOutput = execSync("npx supabase status -o env", { encoding: "utf8" });
const local = {};
for (const line of statusOutput.split("\n")) {
  const match = line.match(/^([A-Z0-9_]+)="(.*)"$/);
  if (match) local[match[1]] = match[2];
}

if (!local.API_URL || !local.PUBLISHABLE_KEY || !local.SECRET_KEY) {
  console.error("Couldn't parse API_URL/PUBLISHABLE_KEY/SECRET_KEY from `supabase status -o env` — is `supabase start` running?");
  process.exit(1);
}

const realEnv = readFileSync(".env", "utf8");
const OVERRIDES = {
  NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: local.SECRET_KEY,
};

const lines = realEnv.split("\n").map((line) => {
  const key = line.match(/^([A-Z0-9_]+)=/)?.[1];
  return key && key in OVERRIDES ? `${key}=${OVERRIDES[key]}` : line;
});
// In case a key from OVERRIDES wasn't present in .env at all yet.
for (const [key, value] of Object.entries(OVERRIDES)) {
  if (!lines.some((line) => line.startsWith(`${key}=`))) lines.push(`${key}=${value}`);
}

writeFileSync(".env.test.local", lines.join("\n"));
console.log("Wrote .env.test.local, pointed at the local Supabase instance:", local.API_URL);
