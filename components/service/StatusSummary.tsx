"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";

const TIERS = [
  { key: "critical", labelKey: "status.criticalOutage", value: "text-error", figure: "bg-error" },
  { key: "major", labelKey: "status.majorOutage", value: "text-accent", figure: "bg-accent" },
  { key: "minor", labelKey: "status.minorIssues", value: "text-warning", figure: "bg-warning" },
  { key: "none", labelKey: "status.operational", value: "text-success", figure: "bg-success" },
] as const;

export default function StatusSummary({
  counts,
  isLoading,
}: {
  counts: Record<"critical" | "major" | "minor" | "none", number>;
  isLoading: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="stats stats-vertical sm:stats-horizontal bg-base-200 border-base-300 mt-4 w-full border shadow-sm">
      {TIERS.map((tier) => (
        <div key={tier.key} className="stat py-3">
          <div className="stat-title flex items-center gap-1.5 text-xs">
            <span className={`h-2 w-2 shrink-0 rounded-full ${tier.figure}`} aria-hidden="true" />
            {t(tier.labelKey)}
          </div>
          <div className={`stat-value text-2xl ${isLoading ? "text-base-content/20 animate-pulse" : tier.value}`}>
            {isLoading ? "–" : counts[tier.key]}
          </div>
        </div>
      ))}
    </div>
  );
}
