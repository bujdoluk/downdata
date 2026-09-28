export const INDICATOR_STYLES: Record<
  string,
  { dot: string; text: string; badge: string; labelKey: string }
> = {
  none: { dot: "bg-success", text: "text-success", badge: "badge-success", labelKey: "status.operational" },
  minor: { dot: "bg-warning", text: "text-warning", badge: "badge-warning", labelKey: "status.minorIssues" },
  major: { dot: "bg-accent", text: "text-accent", badge: "badge-accent", labelKey: "status.majorOutage" },
  critical: { dot: "bg-error", text: "text-error", badge: "badge-error", labelKey: "status.criticalOutage" },
  maintenance: { dot: "bg-info", text: "text-info", badge: "badge-info", labelKey: "status.underMaintenance" },
};

export const COMPONENT_STATUS_STYLES: Record<
  string,
  { dot: string; text: string; badge: string; labelKey: string }
> = {
  operational: { dot: "bg-success", text: "text-success", badge: "badge-success", labelKey: "status.operational" },
  degraded_performance: { dot: "bg-warning", text: "text-warning", badge: "badge-warning", labelKey: "status.degradedPerformance" },
  partial_outage: { dot: "bg-accent", text: "text-accent", badge: "badge-accent", labelKey: "status.partialOutage" },
  major_outage: { dot: "bg-error", text: "text-error", badge: "badge-error", labelKey: "status.majorOutage" },
  under_maintenance: { dot: "bg-info", text: "text-info", badge: "badge-info", labelKey: "status.underMaintenance" },
};

export const ALL_COMPONENT_STATUSES = Object.keys(COMPONENT_STATUS_STYLES);

export const FALLBACK_STYLE = {
  dot: "bg-base-content/20",
  text: "text-base-content/50",
  badge: "badge-ghost",
  labelKey: "status.unknown",
};

// Not Object.keys(INDICATOR_STYLES): its "maintenance" entry is a real incident impact
// for some providers (e.g. Catchpoint), but doesn't belong in a severity filter.
export const IMPACT_CHECKBOX_COLOR: Record<string, string> = {
  none: "checkbox-success",
  minor: "checkbox-warning",
  major: "checkbox-accent",
  critical: "checkbox-error",
};
export const ALL_IMPACTS = Object.keys(IMPACT_CHECKBOX_COLOR);

// The one canonical ranking; don't keep a separate copy elsewhere.
export const INDICATOR_RANK: Record<string, number> = {
  none: 0,
  minor: 1,
  major: 2,
  critical: 3,
};

export const SEVERITY_DISPLAY_ORDER = ["critical", "major", "minor", "none"] as const;
