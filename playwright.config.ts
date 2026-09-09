import { defineConfig, devices } from "@playwright/test";
import { loadTestEnv } from "./e2e/loadEnv";

// Real end-to-end: a real production Next.js server (built + started, not
// `next dev` — see the webServer comment below for why), backed by a real
// local Supabase instance (Docker, via `npx supabase start` — see
// scripts/generate-e2e-env.mjs), driven by a real browser. This exists
// specifically because the webhook connect flow's route handler
// (app/api/integrations/webhook/route.ts) reads next/headers's cookies(),
// which only has a valid value inside a real Next.js request — calling the
// route function directly in a unit test has no session to read, real or
// fake. See the plan behind this file for why Vitest+jsdom can't cover this
// particular flow.
const TEST_PORT = 3100;
// "localhost", not "127.0.0.1" — Next.js's own NextURL (used by
// request.nextUrl, and by extension request.url in a Route Handler)
// deliberately canonicalizes every loopback-family hostname (127.x.x.x,
// [::1], "localhost") to the literal string "localhost"
// (node_modules/next/dist/server/web/next-url.js's REGEX_LOCALHOST_HOSTNAME).
// A route that redirects the browser via `new URL(path, request.url)` —
// e.g. the email verify route's post-confirmation redirect — then always
// targets "localhost:<port>", regardless of which loopback address the
// browser actually connected with. Testing against 127.0.0.1 while that
// canonicalization silently rewrites redirect targets to "localhost" means
// the browser's session cookie (scoped to 127.0.0.1) doesn't carry over to
// the redirect's target origin, and the flow bounces to /login as if
// logged out. Using "localhost" everywhere here sidesteps the mismatch
// entirely by already being what Next normalizes to. Confirmed this is
// test-harness-only, not a production bug: production's real domain isn't
// a loopback address, so the regex above never matches there.


export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  // One shared local Supabase instance for every test in this suite —
  // concurrent runs would race on creating/verifying the same test user.
  fullyParallel: false,
  workers: 1,
  // "list" for console output, plus a custom reporter that re-encodes every
  // recorded video from .webm to a real, widely-playable .mp4 right after
  // each test — see mp4VideoReporter.ts's header comment for why Playwright's
  // own video recording can't just be configured to emit .mp4 directly.
  reporter: [["list"], ["./e2e/mp4VideoReporter.ts"]],
  webServer: {
    // next build && next start, not next dev — next dev refuses to run a
    // second instance against the same project directory at all (a
    // directory-wide lock, not just a port check), which collides with a
    // real dev server someone might already have open. A production build
    // also has no such restriction and is arguably the more honest thing
    // to run a "production ready" test against anyway.
    command: `npm run build && npm run start -- -p ${TEST_PORT}`,
    url: `http://localhost:${TEST_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { ...loadTestEnv(), E2E_DIST_DIR: ".next-e2e" },
  },
  use: {
    baseURL: `http://localhost:${TEST_PORT}`,
    trace: "on-first-retry",
    // "on" (not the default "retain-on-failure") — a passing run's video
    // is exactly what's worth watching here, not just a failure's.
    video: "on",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
