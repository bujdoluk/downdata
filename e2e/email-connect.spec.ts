import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { loadTestEnv } from "./loadEnv";

// Sends through the real Resend account to delivered@resend.dev, Resend's test address that never reaches an inbox.
const testEnv = loadTestEnv();

const SUPABASE_URL = testEnv.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY = testEnv.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = testEnv.RESEND_API_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY must be set (from .env.test.local — see scripts/generate-e2e-env.mjs) to create the test user.");
}
if (!RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY must be set (carried through from the real .env by generate-e2e-env.mjs) to verify a real send.");
}

const TEST_USER_EMAIL = `email-e2e-${randomUUID()}@example.com`;
const TEST_USER_PASSWORD = "email-e2e-test-password-1!";
const RECIPIENT = "delivered@resend.dev";
const CONFIRM_SUBJECT = "Confirm your downDATA notification email";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(RESEND_API_KEY);

let testUserId: string;

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  testUserId = data.user.id;
});

test("connect email with critical-only severity, receive a real confirmation email, and verify via its link", async ({ page }) => {
  await page.goto("/login");
  // The cookie banner covers the login button.
  await page.getByRole("button", { name: "Accept All" }).click();
  await page.locator('input[type="email"]').fill(TEST_USER_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_USER_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/boards/);

  await page.goto("/integrations");
  const emailCard = page.locator(".card", { has: page.getByRole("heading", { name: "Email", exact: true }) });
  await emailCard.getByRole("button", { name: "Connect" }).click();

  // .modal-box, not <dialog>: the backdrop form has its own hidden "Cancel" button.
  const modal = page.getByRole("dialog").locator(".modal-box");
  await expect(modal).toBeVisible();

  await modal.getByLabel("Major").uncheck();
  await expect(modal.getByLabel("Critical")).toBeChecked();
  // Pauses only make the recorded video readable.
  await page.waitForTimeout(1_000);

  await modal.locator('input[type="email"]').fill(RECIPIENT);
  await page.waitForTimeout(1_500);
  await modal.getByRole("button", { name: "Add" }).click();

  await expect(modal.getByText(RECIPIENT)).toBeVisible({ timeout: 15_000 });
  await expect(modal.getByText("Pending")).toBeVisible();
  await page.waitForTimeout(1_500);
  await modal.getByRole("button", { name: "Cancel" }).click();

  // The route swallows send errors, so check Resend itself. Polled because its indexing lags.
  let sentEmailId: string | undefined;
  for (let attempt = 0; attempt < 10 && !sentEmailId; attempt++) {
    const { data, error } = await resend.emails.list();
    if (error) throw error;
    sentEmailId = data?.data.find((email) => email.to.includes(RECIPIENT) && email.subject === CONFIRM_SUBJECT)?.id;
    if (!sentEmailId) await page.waitForTimeout(1_000);
  }
  expect(sentEmailId, "Resend never sent the confirmation email").toBeTruthy();

  // Scoped to this user: the shared local instance keeps rows from earlier runs at the same address.
  const { data: integrationRow, error: integrationError } = await admin
    .from("integrations")
    .select("id, notify_impacts")
    .eq("user_id", testUserId)
    .eq("slug", "email")
    .single();
  if (integrationError) throw integrationError;
  expect(integrationRow.notify_impacts).toEqual(["critical"]);

  const { data: recipientRow, error: recipientError } = await admin
    .from("integration_recipients")
    .select("verification_code")
    .eq("integration_id", integrationRow.id)
    .eq("channel", "email")
    .eq("value", RECIPIENT)
    .single();
  if (recipientError) throw recipientError;
  const token = recipientRow.verification_code as string;
  expect(token).toBeTruthy();

  // Full navigation, not an API request: the redirect is part of what's tested.
  await page.goto(`/api/integrations/email/verify?token=${token}`);
  await page.waitForURL(/\/integrations\?verified=1/);
  await expect(page.getByText("Recipient confirmed.")).toBeVisible();
  await page.waitForTimeout(1_500);

  await emailCard.getByRole("button", { name: "Connected" }).click();
  await expect(modal.getByText(RECIPIENT)).toBeVisible();
  await page.waitForTimeout(1_500);
  await expect(modal.getByText("Verified")).toBeVisible();
});
