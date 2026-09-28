// "Active" means not resolved, so "monitoring" still counts as ongoing.
export function isActiveIncident(incident: { status: string }): boolean {
  return incident.status === "investigating" || incident.status === "identified" || incident.status === "monitoring";
}
