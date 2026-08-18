"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/service/statusStyles";

const TIER_ORDER = ["critical", "major", "minor", "none"] as const;

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
      {TIER_ORDER.map((key) => {
        const style = INDICATOR_STYLES[key] ?? FALLBACK_STYLE;
        return (
          <div key={key} className="stat py-3">
            <div className="stat-title flex items-center gap-1.5 text-xs">
              <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
              {t(style.labelKey)}
            </div>
            <div className={`stat-value text-2xl ${isLoading ? "text-base-content/20 animate-pulse" : style.text}`}>
              {isLoading ? "–" : counts[key]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
