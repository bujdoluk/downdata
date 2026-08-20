import type { StatuspageIncident } from "@/types/service";

export function isActiveIncident(incident: StatuspageIncident): boolean {
  return incident.status === "investigating" || incident.status === "identified";
}
