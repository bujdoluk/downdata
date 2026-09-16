import type { MaintenanceReminderRule } from "@/features/maintenance/types";

export function resolveRuleForService(rules: MaintenanceReminderRule[], serviceSlug: string): MaintenanceReminderRule | null {
  return rules.find((rule) => rule.serviceSlug === serviceSlug) ?? rules.find((rule) => rule.serviceSlug === null) ?? null;
}
