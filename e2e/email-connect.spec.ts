import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { loadTestEnv } from "./loadEnv";

// Real Supabase Auth (local, Docker), real signed-in session via the actual
// /login UI, real Next.js server, real browser — same reasoning as
// webhook-connect.spec.ts's header comment (this route also reads
// next/headers's cookies(), so it has no valid session to read from a unit
// test at all). The one real difference from that test: here the "real
// receiver" is Resend's own send API, not a URL the app fetches.
// RESEND_API_KEY/RESEND_FROM_EMAIL come straight from the real .env (see
// scripts/generate-e2e-env.mjs's header comment for why unrelated env vars
// are preserved, not just the three Supabase ones), so this genuinely sends
// through the real Resend account — to delivered@resend.dev, a
// Resend-documented test address: a real send through the real API, but
// nothing lands in an actual inbox and no domain verification is needed on
// the receiving end.
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
// Resend's own documented test address — see the header comment above.
const RECIPIENT = "delivered@resend.dev";
const CONFIRM_SUBJECT = "Confirm your downDATA notification email";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(RESEND_API_KEY);

let testUserId: string;

test.beforeAll(async () => {
  // Admin-created, not signed up through the UI — same reasoning as
  // webhook-connect.spec.ts's beforeAll.
  const { data, error } = await admin.auth.admin.createUser({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  testUserId = data.user.id;
});

test("connect email with critical-only severity, receive a real confirmation email, and verify via its link", async ({ page }) => {
  // 1. Real login, through the real UI — not a hand-crafted session cookie
  // (see webhook-connect.spec.ts's header comment for why).
  await page.goto("/login");
  // The cookie consent banner renders on top of the login form and blocks
  // the real click from reaching "Log in" underneath it — dismiss it first.
  await page.getByRole("button", { name: "Accept All" }).click();
  await page.locator('input[type="email"]').fill(TEST_USER_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_USER_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/boards/);

  // 2. Connect flow.
  await page.goto("/integrations");
  const emailCard = page.locator(".card", { has: page.getByRole("heading", { name: "Email", exact: true }) });
  await emailCard.getByRole("button", { name: "Connect" }).click();

  // Scoped to .modal-box, not the whole <dialog> — the <dialog> also
  // contains the backdrop-dismiss form's own "Cancel" button (invisible,
  // click-outside-to-close), which would otherwise make any getByRole
  // lookup for "Cancel" here ambiguous.
  const modal = page.getByRole("dialog").locator(".modal-box");
  await expect(modal).toBeVisible();

  // Critical-only: major+critical are checked by default (see
  // EmailConnectForm's notifyImpacts default), so uncheck Major too.
  await modal.getByLabel("Major").uncheck();
  await expect(modal.getByLabel("Critical")).toBeChecked();
  // Purely for the recorded video's benefit — see the matching comment in
  // webhook-connect.spec.ts for why these pauses exist.
  await page.waitForTimeout(1_000);

  await modal.locator('input[type="email"]').fill(RECIPIENT);
  await page.waitForTimeout(1_500);
  await modal.getByRole("button", { name: "Add" }).click();

  // Success means the recipient shows up pending — a validation failure
  // (e.g. RESEND_FROM_EMAIL missing) would show an inline error instead.
  await expect(modal.getByText(RECIPIENT)).toBeVisible({ timeout: 15_000 });
  await expect(modal.getByText("Pending")).toBeVisible();
  await page.waitForTimeout(1_500);
  await modal.getByRole("button", { name: "Cancel" }).click();

  // 3. The real proof: a real confirmation email actually went out through
  // Resend, not just that our own DB row got created (the route's send()
  // call is wrapped in a swallowed try/catch — see its own comment — so a
  // dead RESEND_API_KEY/from-domain would otherwise fail silently and this
  // test would never know). Poll Resend's own list API rather than assume
  // the first check hits — the send happens inside the route handler
  // before it responds, but Resend's own indexing has its own small delay
  // (same reasoning as the webhook test's polling loop against
  // webhook.site).
  let sentEmailId: string | undefined;
  for (let attempt = 0; attempt < 10 && !sentEmailId; attempt++) {
    const { data, error } = await resend.emails.list();
    if (error) throw error;
    sentEmailId = data?.data.find((email) => email.to.includes(RECIPIENT) && email.subject === CONFIRM_SUBJECT)?.id;
    if (!sentEmailId) await page.waitForTimeout(1_000);
  }
  expect(sentEmailId, "Resend never sent the confirmation email").toBeTruthy();

  // 4. Read the verification token back out of Supabase directly — the
  // actual link a real inbox would show, not a re-implementation of how
  // the app builds it. Scoped to this test's own user_id since a shared
  // local instance can carry recipient rows from earlier runs at the same
  // address.
  const { data: integrationRow, error: integrationError } = await admin
    .from("integrations")
    .select("id, notify_impacts")
    .eq("user_id", testUserId)
    .eq("slug", "email")
    .single();
  if (integrationError) throw integrationError;
  // The severity filter actually saved what was picked in step 2, not just
  // the default it was seeded with.
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

  // 5. Click through, exactly like a real recipient would from their inbox
  // — a full navigation (not an API request), since the redirect and the
  // page it lands on are both part of what's under test.
  await page.goto(`/api/integrations/email/verify?token=${token}`);
  await page.waitForURL(/\/integrations\?verified=1/);
  await expect(page.getByText("Recipient confirmed.")).toBeVisible();
  await page.waitForTimeout(1_500);

  // 6. The recipient itself now shows as verified, not pending, in the UI
  // — not just the page-level success banner above.
  await emailCard.getByRole("button", { name: "Connected" }).click();
  await expect(modal.getByText(RECIPIENT)).toBeVisible();
  await page.waitForTimeout(1_500);
  await expect(modal.getByText("Verified")).toBeVisible();
});
