import { describe, expect, it } from "vitest";
import { computeNextAttemptState, isRateLimitedGivenState, RATE_LIMIT_MAX_FAILURES, RATE_LIMIT_WINDOW_MS } from "@/features/status-pages/services/rateLimit";

// Exercises the pure window/count decision logic directly — the DB read/
// write wrapped around it needs a live Supabase instance, not available in
// every session (see docs/specs/SPEC-status-page-password.md), so it's left
// to manual/integration verification instead.
describe("isRateLimitedGivenState", () => {
  const now = Date.parse("2026-01-01T00:00:30.000Z");
  const recentWindowStart = new Date(now - 10_000).toISOString(); // 10s ago, well within the window
  const expiredWindowStart = new Date(now - RATE_LIMIT_WINDOW_MS - 1).toISOString(); // just past the window

  it("allows when there's no prior attempt", () => {
    expect(isRateLimitedGivenState(null, now)).toBe(false);
  });

  it("allows under the limit", () => {
    expect(isRateLimitedGivenState({ failedCount: RATE_LIMIT_MAX_FAILURES - 1, windowStart: recentWindowStart }, now)).toBe(false);
  });

  it("blocks once the limit is reached within the window", () => {
    expect(isRateLimitedGivenState({ failedCount: RATE_LIMIT_MAX_FAILURES, windowStart: recentWindowStart }, now)).toBe(true);
  });

  it("allows again once the window has expired, even at/above the old limit", () => {
    expect(isRateLimitedGivenState({ failedCount: RATE_LIMIT_MAX_FAILURES, windowStart: expiredWindowStart }, now)).toBe(false);
  });
});

describe("computeNextAttemptState", () => {
  const now = Date.parse("2026-01-01T00:00:30.000Z");
  const nowIso = new Date(now).toISOString();
  const recentWindowStart = new Date(now - 10_000).toISOString();
  const expiredWindowStart = new Date(now - RATE_LIMIT_WINDOW_MS - 1).toISOString();

  it("starts a fresh window at count 1 when there's no prior attempt", () => {
    expect(computeNextAttemptState(null, nowIso)).toEqual({ failedCount: 1, windowStart: nowIso });
  });

  it("increments the count and keeps the window start while still within the window", () => {
    expect(computeNextAttemptState({ failedCount: 3, windowStart: recentWindowStart }, nowIso)).toEqual({
      failedCount: 4,
      windowStart: recentWindowStart,
    });
  });

  it("resets to count 1 with a fresh window once the old window has expired", () => {
    expect(computeNextAttemptState({ failedCount: RATE_LIMIT_MAX_FAILURES, windowStart: expiredWindowStart }, nowIso)).toEqual({
      failedCount: 1,
      windowStart: nowIso,
    });
  });
});
