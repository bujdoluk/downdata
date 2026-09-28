// Structural so both full and Summary maintenance shapes fit.
export function isInProgressMaintenance(maintenance: { status: string }): boolean {
  return maintenance.status === "in_progress";
}
