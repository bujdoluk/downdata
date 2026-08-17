export const INDICATOR_STYLES: Record<
  string,
  { dot: string; text: string; badge: string; labelKey: string }
> = {
  none: { dot: "bg-success", text: "text-success", badge: "badge-success", labelKey: "status.operational" },
  minor: { dot: "bg-warning", text: "text-warning", badge: "badge-warning", labelKey: "status.minorIssues" },
  major: { dot: "bg-accent", text: "text-accent", badge: "badge-accent", labelKey: "status.majorOutage" },
  critical: { dot: "bg-error", text: "text-error", badge: "badge-error", labelKey: "status.criticalOutage" },
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

export const FALLBACK_STYLE = {
  dot: "bg-base-content/20",
  text: "text-base-content/50",
  badge: "badge-ghost",
  labelKey: "status.unknown",
};
