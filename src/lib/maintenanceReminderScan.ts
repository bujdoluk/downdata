import { epochMs } from "@/lib/formatTime";
import type { MaintenanceReminderRule } from "@/features/maintenance/types";

export type ReminderTargetMaintenance = { status: string; scheduled_for: string };

// Pure (no Supabase) so it's unit-testable and client-safe.

// Only reminds before start. Keyed on the current scheduled_for, so a reschedule re-sends.
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

// Only when the window was missed by more than one tick. Picks the notification template.
export function isSendingEarly(rule: MaintenanceReminderRule, maintenance: ReminderTargetMaintenance, nowMsValue: number): boolean {
  const fullWindowStartMs = epochMs(maintenance.scheduled_for) - rule.minutesBefore * 60 * 1000;
  return nowMsValue > fullWindowStartMs + 60_000;
}
