import type { ScheduledMaintenance } from "@/types/service";

export function isInProgressMaintenance(maintenance: ScheduledMaintenance): boolean {
  return maintenance.status === "in_progress";
}
