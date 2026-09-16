import { describe, expect, it } from "vitest";
import { isDue, isSendingEarly, type ReminderTargetMaintenance } from "@/lib/maintenanceReminderScan";
import type { MaintenanceReminderRule } from "@/features/maintenance/types";

const HOUR_MS = 60 * 60 * 1000;

// Takes hours for test readability, converts to the stored minutes field.
function rule(hoursBefore: number): MaintenanceReminderRule {
  return { id: "rule-1", serviceSlug: "github", minutesBefore: hoursBefore * 60, channels: ["slack"] };
}

function maintenance(scheduledForMs: number, status = "scheduled"): ReminderTargetMaintenance {
  return { status, scheduled_for: new Date(scheduledForMs).toISOString() };
}

describe("isDue", () => {
  it("is false before the reminder window has started", () => {
    const now = 0;
    const m = maintenance(4 * HOUR_MS); // starts in 4h
    expect(isDue(rule(2), m, null, now)).toBe(false); // 2h window hasn't opened yet
  });

  it("is true once the reminder window has started", () => {
    const now = 0;
    const m = maintenance(2 * HOUR_MS); // starts in 2h
    expect(isDue(rule(4), m, null, now)).toBe(true); // 4h window opened 2h ago
  });

  it("is false once already delivered for the current scheduled_for", () => {
    const now = 0;
    const m = maintenance(1 * HOUR_MS);
    const prior = { scheduledFor: m.scheduled_for };
    expect(isDue(rule(4), m, prior, now)).toBe(false);
  });

  it("re-arms when scheduled_for changes after a prior delivery (rescheduled later)", () => {
    const now = 0;
    const original = maintenance(1 * HOUR_MS);
    const prior = { scheduledFor: original.scheduled_for };
    const rescheduled = maintenance(10 * HOUR_MS); // pushed further out
    expect(isDue(rule(4), rescheduled, prior, now)).toBe(false); // window not open yet for the new time
    expect(isDue(rule(12), rescheduled, prior, now)).toBe(true); // but a wide-enough window is
  });

  it("re-arms when scheduled_for changes after a prior delivery (rescheduled earlier)", () => {
    const now = 0;
    const original = maintenance(10 * HOUR_MS);
    const prior = { scheduledFor: original.scheduled_for };
    const rescheduled = maintenance(1 * HOUR_MS); // moved sooner
    expect(isDue(rule(4), rescheduled, prior, now)).toBe(true);
  });

  it("is false once the maintenance is no longer scheduled (in_progress or completed)", () => {
    const now = 0;
    const inProgress = maintenance(-1 * HOUR_MS, "in_progress");
    const completed = maintenance(-1 * HOUR_MS, "completed");
    expect(isDue(rule(4), inProgress, null, now)).toBe(false);
    expect(isDue(rule(4), completed, null, now)).toBe(false);
  });
});

describe("isSendingEarly", () => {
  it("is false right when the full window opens on schedule", () => {
    const now = 0;
    const m = maintenance(4 * HOUR_MS); // starts in 4h — a 4h-before window opens exactly now
    expect(isSendingEarly(rule(4), m, now)).toBe(false);
  });

  it("is true when the rule only started covering something already close (window mostly missed)", () => {
    const now = 0;
    const m = maintenance(1 * HOUR_MS); // starts in 1h
    expect(isSendingEarly(rule(4), m, now)).toBe(true); // a 4h window would've opened 3h ago
  });

  it("is false right at the window's own open tick, not just before it", () => {
    const now = 0;
    const m = maintenance(4 * HOUR_MS - 30_000); // window opens ~30s from now
    expect(isSendingEarly(rule(4), m, now)).toBe(false);
  });
});
