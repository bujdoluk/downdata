export type Indicator = "none" | "minor" | "major" | "critical" | string;

export const INDICATOR_STYLES: Record<
  string,
  { dot: string; text: string; label: string }
> = {
  none: { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "Operational" },
  minor: { dot: "bg-yellow-500", text: "text-yellow-600 dark:text-yellow-400", label: "Minor issues" },
  major: { dot: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", label: "Major outage" },
  critical: { dot: "bg-red-500", text: "text-red-600 dark:text-red-400", label: "Critical outage" },
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
  { dot: string; text: string; label: string }
> = {
  operational: { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "Operational" },
  degraded_performance: { dot: "bg-yellow-500", text: "text-yellow-600 dark:text-yellow-400", label: "Degraded performance" },
  partial_outage: { dot: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", label: "Partial outage" },
  major_outage: { dot: "bg-red-500", text: "text-red-600 dark:text-red-400", label: "Major outage" },
  under_maintenance: { dot: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", label: "Under maintenance" },
};

export const FALLBACK_STYLE = {
  dot: "bg-black/20 dark:bg-white/30",
  text: "text-neutral-500 dark:text-white/50",
  label: "Unknown",
};
