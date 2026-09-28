import { createHmac, randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./loadEnv";

const testEnv = loadTestEnv();

// webhook.site, not a local receiver: validateWebhookUrl() rejects loopback/private addresses.
const SUPABASE_URL = testEnv.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY = testEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY must be set (from .env.test.local — see scripts/generate-e2e-env.mjs) to create the test user.");
}

const TEST_EMAIL = `webhook-e2e-${randomUUID()}@example.com`;
const TEST_PASSWORD = "webhook-e2e-test-password-1!";

test.beforeAll(async () => {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
});

test("connect a webhook with critical-only severity and receive a real signed POST", async ({ page, request }) => {
  const tokenRes = await request.post("https://webhook.site/token");
  expect(tokenRes.ok()).toBe(true);
  const { uuid } = await tokenRes.json();
  const webhookUrl = `https://webhook.site/${uuid}`;

  await page.goto("/login");
  // The cookie banner covers the login button.
  await page.getByRole("button", { name: "Accept All" }).click();
  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/boards/);

  await page.goto("/integrations");
  const webhookCard = page.locator(".card", { has: page.getByRole("heading", { name: "Webhook", exact: true }) });
  await webhookCard.getByRole("button", { name: "Connect" }).click();

  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();

  await modal.getByLabel("Operational").uncheck();
  await modal.getByLabel("Minor").uncheck();
  await modal.getByLabel("Major").uncheck();
  await expect(modal.getByLabel("Critical")).toBeChecked();

  await modal.locator('input[type="url"]').fill(webhookUrl);
  // Pause only so the filled URL is readable in the recorded video.
  await page.waitForTimeout(1_500);
  await modal.getByRole("button", { name: "Add" }).click();

  await expect(modal.getByText(webhookUrl)).toBeVisible({ timeout: 15_000 });
  const secret = await modal.locator("code").textContent();
  expect(secret).toMatch(/^[0-9a-f]{64}$/);

  // Polled because webhook.site's ingestion lags.
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

  const expectedSignature = createHmac("sha256", secret!.trim()).update(received!.content).digest("hex");
  const actualSignature = received!.headers["x-webhook-signature"]?.[0];
  expect(actualSignature).toBe(expectedSignature);
});
