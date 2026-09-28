import { createHash } from "node:crypto";
import { getSupabaseClient } from "@/lib/supabase";
import { epochMs, nowIso } from "@/lib/formatTime";

export const RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const RATE_LIMIT_MAX_FAILURES = 5;

type AttemptState = { failedCount: number; windowStart: string };

// Only a one-way hash is stored: there's no reason to retain a visitor's raw IP.
function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

function isWindowExpired(windowStart: string, nowMsValue: number): boolean {
  return nowMsValue - epochMs(windowStart) >= RATE_LIMIT_WINDOW_MS;
}

// Kept pure so it's unit-testable without a live Supabase instance.
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

// Service-role: this table has no ownership column and no client-facing path.
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

// Returns the row it read so recordFailedAttempt can reuse it instead of reading twice.
export async function checkRateLimit(statusPageId: string, ip: string): Promise<RateLimitCheck> {
  const existing = await readAttemptState(statusPageId, hashIp(ip));
  return { limited: isRateLimitedGivenState(existing, epochMs(nowIso())), existing };
}

// Read-then-upsert, not atomic. Acceptable on this low-throughput path.
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
