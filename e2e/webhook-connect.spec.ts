import { createHmac, randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./loadEnv";

// Playwright's own test-runner process doesn't inherit playwright.config.ts's
// webServer.env — this file creates the test user directly (not through the
// running server), so it needs the same local credentials loaded again here.
const testEnv = loadTestEnv();

// Real Supabase Auth (local, Docker), real signed-in session via the actual
// /login UI, real Next.js server, real browser. What this test cannot do
// without weakening the code under test: use a receiver on this same
// machine — the webhook ping fires from the Next.js *server* process, and
// any local receiver's address falls into the exact private/loopback
// ranges validateWebhookUrl() is built to reject (see its own comment for
// why). webhook.site is a real public HTTPS endpoint, so the SSRF check
// runs unmodified and passes honestly; its API then lets us fetch back
// what it actually received.
const SUPABASE_URL = testEnv.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY = testEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY must be set (from .env.test.local — see scripts/generate-e2e-env.mjs) to create the test user.");
}

const TEST_EMAIL = `webhook-e2e-${randomUUID()}@example.com`;
const TEST_PASSWORD = "webhook-e2e-test-password-1!";

test.beforeAll(async () => {
  // Admin-created, not signed up through the UI — email confirmation is
  // disabled for local dev (supabase/config.toml's enable_confirmations),
  // and admin.createUser can set email_confirm directly regardless, so
  // this user can log in immediately with no confirmation step.
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
});

test("connect a webhook with critical-only severity and receive a real signed POST", async ({ page, request }) => {
  // 1. A real public receiver — see the file header comment for why this
  // can't be a local server.
  const tokenRes = await request.post("https://webhook.site/token");
  expect(tokenRes.ok()).toBe(true);
  const { uuid } = await tokenRes.json();
  const webhookUrl = `https://webhook.site/${uuid}`;

  // 2. Real login, through the real UI — not a hand-crafted session cookie
  // (see the file header comment: cookies() only works inside a real
  // request, and jsdom doesn't give a real cookie jar either way).
  await page.goto("/login");
  // The cookie consent banner renders on top of the login form and blocks
  // the real click from reaching "Log in" underneath it — dismiss it first.
  await page.getByRole("button", { name: "Accept All" }).click();
  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/boards/);

  // 3. Connect flow.
  await page.goto("/integrations");
  const webhookCard = page.locator(".card", { has: page.getByRole("heading", { name: "Webhook", exact: true }) });
  await webhookCard.getByRole("button", { name: "Connect" }).click();

  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();

  // Critical-only: everything defaults checked (see WebhookConnectForm's
  // notifyImpacts default), so uncheck the other three.
  await modal.getByLabel("Operational").uncheck();
  await modal.getByLabel("Minor").uncheck();
  await modal.getByLabel("Major").uncheck();
  await expect(modal.getByLabel("Critical")).toBeChecked();

  await modal.locator('input[type="url"]').fill(webhookUrl);
  // Purely for the recorded video's benefit: .fill() sets the value in one
  // frame with no typing animation, so without a pause here the URL and the
  // Add click land in the same frame and are never actually readable in
  // playback. Doesn't affect what's being tested.
  await page.waitForTimeout(1_500);
  await modal.getByRole("button", { name: "Add" }).click();

  // Success means the target now shows in the list with its secret — a
  // validation/ping failure would show an inline error instead and never
  // reach this state.
  await expect(modal.getByText(webhookUrl)).toBeVisible({ timeout: 15_000 });
  const secret = await modal.locator("code").textContent();
  expect(secret).toMatch(/^[0-9a-f]{64}$/);

  // 4. The real proof: the server actually POSTed a signed ping to
  // webhook.site. Poll its API rather than assume the first check hits —
  // the ping is sent from inside the route handler before it responds, but
  // webhook.site's own ingestion has its own small delay.
  let received: { content: string; headers: Record<string, string[]> } | undefined;
  for (let attempt = 0; attempt < 10 && !received; attempt++) {
    const res = await request.get(`https://webhook.site/token/${uuid}/requests`);
    const body = await res.json();
    received = body.data?.[0];
    if (!received) await page.waitForTimeout(1_000);
  }
  expect(received, "webhook.site never received the ping POST").toBeTruthy();

  const payload = JSON.parse(received!.content);
  expect(payload).toEqual({ event: "ping", schemaVersion: 1, timestamp: expect.any(String) });

  // Signature: recompute the same HMAC this app's signWebhookPayload()
  // would, over the exact raw body actually received, and compare against
  // the header — the same check a real receiver would run.
  const expectedSignature = createHmac("sha256", secret!.trim()).update(received!.content).digest("hex");
  const actualSignature = received!.headers["x-webhook-signature"]?.[0];
  expect(actualSignature).toBe(expectedSignature);
});
