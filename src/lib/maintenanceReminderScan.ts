import { epochMs } from "@/lib/formatTime";
import type { MaintenanceReminderRule } from "@/features/maintenance/types";

// The subset of StoredMaintenance these two pure functions actually read —
// kept minimal and local rather than importing the full type, which pulls
// in features/maintenance/services/getStoredMaintenance.ts and, from
// there, nothing server-only, but there's no reason for this pure,
// easily-unit-tested module to depend on more than it needs.
export type ReminderTargetMaintenance = { status: string; scheduled_for: string };

// Pure — no Supabase imports — deliberately its own file, same reasoning
// as resolveReminderRule.ts, so these can be unit tested in isolation and
// (if ever needed) imported from a client component without pulling
// lib/pollMaintenanceReminders.ts's server-only send logic along with them.

// Only ever remind about what hasn't started yet — a maintenance that's
// already in_progress or completed by the time a rule (re)covers it isn't
// something to warn about anymore, regardless of the clock math below.
// A reschedule (either direction) invalidates whatever was already sent
// for the old time — compares against the *current* scheduled_for, not
// just "have we ever sent for this maintenance at all". See
// 0038_maintenance_reminders.sql's maintenance_reminder_deliveries table.
export function isDue(
  rule: MaintenanceReminderRule,
  maintenance: ReminderTargetMaintenance,
  priorDelivery: { scheduledFor: string } | null,
  nowMsValue: number,
): boolean {
  if (maintenance.status !== "scheduled") return false;
  if (priorDelivery?.scheduledFor === maintenance.scheduled_for) return false;
  const windowStartMs = epochMs(maintenance.scheduled_for) - rule.minutesBefore * 60 * 1000;
  return nowMsValue >= windowStartMs;
}

// True only when the rule just started covering something already close —
// the full window was already missed by more than one tick, not "we're
// always a little late". Drives which notification body template is used.
export function isSendingEarly(rule: MaintenanceReminderRule, maintenance: ReminderTargetMaintenance, nowMsValue: number): boolean {
  const fullWindowStartMs = epochMs(maintenance.scheduled_for) - rule.minutesBefore * 60 * 1000;
  return nowMsValue > fullWindowStartMs + 60_000;
}
