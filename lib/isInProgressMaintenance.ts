// Structural, not ScheduledMaintenance — status is the only field this
// reads, so both full maintenances and the trimmed Summary variant satisfy it.
export function isInProgressMaintenance(maintenance: { status: string }): boolean {
  return maintenance.status === "in_progress";
}
