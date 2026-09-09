import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loadTestEnv } from "./loadEnv";

// Real Supabase Auth (local, Docker), real signed-in sessions via the actual
// /login UI, real Next.js server, real browser — same reasoning as
// webhook-connect.spec.ts's header comment: features/boards/services/boards.ts
// reads next/headers's cookies() through lib/supabase/server.ts's
// session-scoped client, which only has a real value inside a real Next.js
// request, so this can't be covered by a unit test with a mocked client.
//
// Two test users, not one: proving a board is only visible to its own
// creator is the actual point of this test, not just that creation
// succeeds. This repo's own AGENTS.md failure log is specifically about RLS
// looking correct (the right user_id on the row) while still not actually
// being enforced for a second session — a single-user test can't catch that
// class of bug, only a real second login can.
const testEnv = loadTestEnv();

const SUPABASE_URL = testEnv.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY = testEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY must be set (from .env.test.local — see scripts/generate-e2e-env.mjs) to create the test users.");
}

const USER_A_EMAIL = `board-e2e-a-${randomUUID()}@example.com`;
const USER_B_EMAIL = `board-e2e-b-${randomUUID()}@example.com`;
const PASSWORD = "board-e2e-test-password-1!";
// Unique per run so it can never collide with the seeded default board (see
// below) or with a previous run's leftover data in the persisted local
// Supabase volume — no cleanup step needed either way.
const NEW_BOARD_NAME = `E2E board ${randomUUID()}`;
// Created for every new account by the on_auth_user_created trigger
// (supabase/migrations/0013_board_ownership.sql's handle_new_user()) — the
// /boards page is never actually empty for a fresh user, so this is what
// each account's own list starts with.
const DEFAULT_BOARD_NAME = "My board";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!);

let userAId: string;

test.beforeAll(async () => {
  // Admin-created, not signed up through the UI — same reasoning as
  // webhook-connect.spec.ts's beforeAll (email confirmation is disabled for
  // local dev, and admin.createUser can set email_confirm directly anyway,
  // so both users can log in immediately with no confirmation step).
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
  // The cookie consent banner renders on top of the login form and blocks
  // the real click from reaching "Log in" underneath it — dismiss it first.
  await page.getByRole("button", { name: "Accept All" }).click();
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/boards/);
}

// These two tests run in the fixed order they're declared (playwright.config.ts
// sets fullyParallel: false, workers: 1) — test 1 creates NEW_BOARD_NAME
// under user A before test 2 checks that user B can't see it.
test("creates a board through the UI, owned by the creator", async ({ page }) => {
  // 1. Real login, through the real UI — not a hand-crafted session cookie
  // (see webhook-connect.spec.ts's header comment for why).
  await login(page, USER_A_EMAIL);

  // 2. The seeded default board is already there — confirmed, not assumed.
  // Scoped to <main>: the sidebar's board switcher can render a board's name
  // too (once one is selected), so an unscoped getByText risks matching more
  // than one element once a second board exists later in this test.
  await expect(page.locator("main").getByText(DEFAULT_BOARD_NAME, { exact: true })).toBeVisible();

  // 3. Create flow: open the "Add board" modal and submit the form, the
  // same as a real user would. exact: true, not a substring match — the
  // sidebar's own board switcher has a "+ Add board" option in its dropdown
  // too (rendered in the DOM even while closed), which would otherwise also
  // match "Add board" as a substring.
  await page.locator("main").getByRole("button", { name: "Add board", exact: true }).click();
  const modal = page.getByRole("dialog").locator(".modal-box");
  await expect(modal).toBeVisible();
  await modal.locator('input[type="text"]').fill(NEW_BOARD_NAME);
  await modal.getByRole("button", { name: "Create" }).click();

  // 4. Success navigates straight to the new board's own page (see
  // CreateBoardForm's onCreated -> BoardsPageContent's router.push). The
  // name now also renders in the sidebar's board switcher and its "All
  // boards" toggle button, not just the page's own <h1> — heading role
  // pins this to the one element actually meant here.
  await page.waitForURL(/\/boards\/[^/]+$/);
  await expect(page.getByRole("heading", { name: NEW_BOARD_NAME })).toBeVisible();

  // 5. It also shows back on the boards list, alongside the default one.
  // Scoped to <main> for the same reason as step 2 — the sidebar now also
  // renders this board's name (it's the currently-selected one).
  await page.goto("/boards");
  await expect(page.locator("main").getByText(DEFAULT_BOARD_NAME, { exact: true })).toBeVisible();
  await expect(page.locator("main").getByText(NEW_BOARD_NAME, { exact: true })).toBeVisible();

  // 6. The fast, precise half of the RLS proof: the row itself is tagged to
  // the actual creator, queried directly rather than re-trusting the UI.
  const { data: row, error } = await admin.from("boards").select("user_id").eq("name", NEW_BOARD_NAME).single();
  if (error) throw error;
  expect(row.user_id).toBe(userAId);
});

test("a board created by one account is not visible to another account", async ({ page }) => {
  // A fresh browser context per test (Playwright's default) means no
  // session from the previous test carries over — this is a genuinely
  // separate login, the real end-to-end half of the RLS proof: an actual
  // second session is blocked, not just a row's user_id column checked.
  await login(page, USER_B_EMAIL);

  await page.goto("/boards");
  // Scoped to <main> for the same reason as the previous test's step 2 —
  // the sidebar's own board switcher can render this same board name too.
  // User B's own default board is there...
  await expect(page.locator("main").getByText(DEFAULT_BOARD_NAME, { exact: true })).toBeVisible();
  // ...but user A's board, created in the previous test, is not.
  await expect(page.locator("main").getByText(NEW_BOARD_NAME, { exact: true })).not.toBeVisible();
});
