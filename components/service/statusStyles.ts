export type Indicator = "none" | "minor" | "major" | "critical" | string;

export const INDICATOR_STYLES: Record<
  string,
  { dot: string; text: string; badge: string; label: string }
> = {
  none: { dot: "bg-success", text: "text-success", badge: "badge-success", label: "Operational" },
  minor: { dot: "bg-warning", text: "text-warning", badge: "badge-warning", label: "Minor issues" },
  major: { dot: "bg-accent", text: "text-accent", badge: "badge-accent", label: "Major outage" },
  critical: { dot: "bg-error", text: "text-error", badge: "badge-error", label: "Critical outage" },
};

export type ComponentStatus =
  | "operational"
  | "degraded_performance"
  | "partial_outage"
  | "major_outage"
  | "under_maintenance"
  | string;

export const COMPONENT_STATUS_STYLES: Record<
  string,
  { dot: string; text: string; badge: string; label: string }
> = {
  operational: { dot: "bg-success", text: "text-success", badge: "badge-success", label: "Operational" },
  degraded_performance: { dot: "bg-warning", text: "text-warning", badge: "badge-warning", label: "Degraded performance" },
  partial_outage: { dot: "bg-accent", text: "text-accent", badge: "badge-accent", label: "Partial outage" },
  major_outage: { dot: "bg-error", text: "text-error", badge: "badge-error", label: "Major outage" },
  under_maintenance: { dot: "bg-info", text: "text-info", badge: "badge-info", label: "Under maintenance" },
};

export const FALLBACK_STYLE = {
  dot: "bg-base-content/20",
  text: "text-base-content/50",
  badge: "badge-ghost",
  label: "Unknown",
};
