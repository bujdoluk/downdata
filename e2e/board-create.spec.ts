import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./loadEnv";

// Two users: only a real second session proves RLS is enforced, not just that user_id is set.
const testEnv = loadTestEnv();

const SUPABASE_URL = testEnv.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY = testEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY must be set (from .env.test.local — see scripts/generate-e2e-env.mjs) to create the test users.");
}

const USER_A_EMAIL = `board-e2e-a-${randomUUID()}@example.com`;
const USER_B_EMAIL = `board-e2e-b-${randomUUID()}@example.com`;
const PASSWORD = "board-e2e-test-password-1!";
// Unique per run so leftover data in the persisted local volume never collides.
const NEW_BOARD_NAME = `E2E board ${randomUUID()}`;
// Seeded for every new account by handle_new_user() (0013_board_ownership.sql).
const DEFAULT_BOARD_NAME = "My board";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!);

let userAId: string;

test.beforeAll(async () => {
  const [userA, userB] = await Promise.all([
    admin.auth.admin.createUser({ email: USER_A_EMAIL, password: PASSWORD, email_confirm: true }),
    admin.auth.admin.createUser({ email: USER_B_EMAIL, password: PASSWORD, email_confirm: true }),
  ]);
  if (userA.error) throw userA.error;
  if (userB.error) throw userB.error;
  userAId = userA.data.user.id;
});

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  // The cookie banner covers the login button.
  await page.getByRole("button", { name: "Accept All" }).click();
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/boards/);
}

// Order-dependent: test 2 relies on the board test 1 creates (workers: 1, not fullyParallel).
test("creates a board through the UI, owned by the creator", async ({ page }) => {
  await login(page, USER_A_EMAIL);

  // Scoped to <main>: the sidebar's board switcher can render the same name.
  await expect(page.locator("main").getByText(DEFAULT_BOARD_NAME, { exact: true })).toBeVisible();

  // exact: the sidebar dropdown also has a "+ Add board" option in the DOM.
  await page.locator("main").getByRole("button", { name: "Add board", exact: true }).click();
  const modal = page.getByRole("dialog").locator(".modal-box");
  await expect(modal).toBeVisible();
  await modal.locator('input[type="text"]').fill(NEW_BOARD_NAME);
  await modal.getByRole("button", { name: "Create" }).click();

  // Heading role: the name also renders in the sidebar switcher.
  await page.waitForURL(/\/boards\/[^/]+$/);
  await expect(page.getByRole("heading", { name: NEW_BOARD_NAME })).toBeVisible();

  await page.goto("/boards");
  await expect(page.locator("main").getByText(DEFAULT_BOARD_NAME, { exact: true })).toBeVisible();
  await expect(page.locator("main").getByText(NEW_BOARD_NAME, { exact: true })).toBeVisible();

  const { data: row, error } = await admin.from("boards").select("user_id").eq("name", NEW_BOARD_NAME).single();
  if (error) throw error;
  expect(row.user_id).toBe(userAId);
});

test("a board created by one account is not visible to another account", async ({ page }) => {
  await login(page, USER_B_EMAIL);

  await page.goto("/boards");
  await expect(page.locator("main").getByText(DEFAULT_BOARD_NAME, { exact: true })).toBeVisible();
  await expect(page.locator("main").getByText(NEW_BOARD_NAME, { exact: true })).not.toBeVisible();
});
