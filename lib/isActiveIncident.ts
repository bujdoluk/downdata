import type { StatuspageIncident } from "@/types/service";

export function isActiveIncident(incident: StatuspageIncident): boolean {
  return incident.status !== "monitoring" && incident.status !== "resolved";
}
