// Structural, not Incident — status is the only field this reads,
// so both full incidents and the trimmed *Summary variants satisfy it.
// "Active" means "not resolved" — matches /incidents' own five-status
// list (IncidentsPageContent.tsx), which also treats "monitoring" (fix
// applied, not yet confirmed resolved) as ongoing, not "identified" alone.
export function isActiveIncident(incident: { status: string }): boolean {
  return incident.status === "investigating" || incident.status === "identified" || incident.status === "monitoring";
}
