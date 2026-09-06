// Structural, not Incident — status is the only field this reads,
// so both full incidents and the trimmed *Summary variants satisfy it.
export function isActiveIncident(incident: { status: string }): boolean {
  return incident.status === "investigating" || incident.status === "identified";
}
