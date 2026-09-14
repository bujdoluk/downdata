import { createHash } from "node:crypto";
import { getSupabaseClient } from "@/lib/supabase";
import { epochMs, nowIso } from "@/lib/formatTime";

export const RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const RATE_LIMIT_MAX_FAILURES = 5;

type AttemptState = { failedCount: number; windowStart: string };

// Not the raw IP — this table has no other reason to retain a visitor's
// address, so only a one-way hash of it is stored.
function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

function isWindowExpired(windowStart: string, nowMsValue: number): boolean {
  return nowMsValue - epochMs(windowStart) >= RATE_LIMIT_WINDOW_MS;
}

// Pure decision logic, exercised directly by rateLimit.test.ts — the actual
// row read/write around it needs a live Supabase instance to test for real,
// which isn't available in every session (see docs/specs/SPEC-status-page-password.md).
export function isRateLimitedGivenState(existing: AttemptState | null, nowMsValue: number): boolean {
  if (!existing) return false;
  if (isWindowExpired(existing.windowStart, nowMsValue)) return false;
  return existing.failedCount >= RATE_LIMIT_MAX_FAILURES;
}

export function computeNextAttemptState(existing: AttemptState | null, nowIsoValue: string): AttemptState {
  const expired = !existing || isWindowExpired(existing.windowStart, epochMs(nowIsoValue));
  return {
    failedCount: expired ? 1 : existing.failedCount + 1,
    windowStart: expired ? nowIsoValue : existing.windowStart,
  };
}

// status_page_password_attempts has no ownership column and no
// client-facing read/write path — service-role client, same class as
// catalog/incidents (see AGENTS.md's client-selection rule).
async function readAttemptState(statusPageId: string, ipHash: string): Promise<AttemptState | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("status_page_password_attempts")
    .select("failed_count, window_start")
    .eq("status_page_id", statusPageId)
    .eq("ip_hash", ipHash)
    .maybeSingle();
  if (error) throw error;
  return data ? { failedCount: data.failed_count, windowStart: data.window_start } : null;
}

export type RateLimitCheck = { limited: boolean; existing: AttemptState | null };

// Checked before a password is even verified — a caller at the limit never
// reaches verifyPassword() at all, per the unlock route's own flow. Returns
// the row it read alongside the decision so a subsequent recordFailedAttempt
// call in the same request can reuse it instead of reading it twice.
export async function checkRateLimit(statusPageId: string, ip: string): Promise<RateLimitCheck> {
  const existing = await readAttemptState(statusPageId, hashIp(ip));
  return { limited: isRateLimitedGivenState(existing, epochMs(nowIso())), existing };
}

// Called only on a wrong password. `existing` should be whatever
// checkRateLimit() already read earlier in the same request — passing it
// skips a second, identical row read; omit it only when no prior read
// happened. Read(-or-reuse)-then-upsert, not atomic — the same non-atomic
// "reserve" shape reportGeneration.ts's sendTestReportEmail already uses
// for its own fixed-window counter, acceptable here for the same reason:
// this is a low-throughput path (one visitor guessing one page's
// password), not a hot path needing a database function.
export async function recordFailedAttempt(statusPageId: string, ip: string, existing?: AttemptState | null): Promise<void> {
  const ipHash = hashIp(ip);
  const priorState = existing !== undefined ? existing : await readAttemptState(statusPageId, ipHash);
  const next = computeNextAttemptState(priorState, nowIso());

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("status_page_password_attempts")
    .upsert(
      { status_page_id: statusPageId, ip_hash: ipHash, failed_count: next.failedCount, window_start: next.windowStart },
      { onConflict: "status_page_id,ip_hash" },
    );
  if (error) throw error;
}
