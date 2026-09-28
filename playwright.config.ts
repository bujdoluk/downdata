import { defineConfig, devices } from "@playwright/test";
import { loadTestEnv } from "./e2e/loadEnv";

// E2E rather than unit tests: route handlers read cookies(), which only works inside a real Next request.
const TEST_PORT = 3100;
// Use "localhost", not 127.0.0.1: NextURL canonicalizes loopback hosts to "localhost",
// so redirects would otherwise drop the 127.0.0.1-scoped session cookie.

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  // Tests share one local Supabase, so parallel runs would race on the same test user.
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["./e2e/mp4VideoReporter.ts"]],
  webServer: {
    // Not next dev: it locks the project dir and would clash with an open dev server.
    command: `npm run build && npm run start -- -p ${TEST_PORT}`,
    url: `http://localhost:${TEST_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { ...loadTestEnv(), E2E_DIST_DIR: ".next-e2e" },
  },
  use: {
    baseURL: `http://localhost:${TEST_PORT}`,
    trace: "on-first-retry",
    // Keep passing runs' videos too, not just failures.
    video: "on",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
