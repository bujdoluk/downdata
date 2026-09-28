"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { OpenIncidentImpact } from "@/types/service";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/statusStyles";
import { AlertIcon } from "@/components/icons/NavIcons";

// Rollup `status.indicator` and an incident's `impact` can disagree upstream; the rollup
// stays the primary label and this flags the worse one (see AGENTS.md Failure log).
export default function MoreSevereIncidentBadge({
  incident,
  className,
  iconClassName = "h-3.5 w-3.5",
}: {
  incident: OpenIncidentImpact;
  className?: string;
  iconClassName?: string;
}) {
  const { t } = useTranslation();
  const style = INDICATOR_STYLES[incident.impact] ?? FALLBACK_STYLE;
  const label = t("status.moreSevereIncidentTooltip", {
    impact: t(style.labelKey),
    name: incident.name,
  });

  // z-50 on ::before/::after so positioned card siblings can't paint over the tooltip.
  const tooltipClassName = `tooltip before:z-50 after:z-50 inline-flex shrink-0 ${style.text} ${className ?? ""}`;

  // incident.io-hosted pages can omit a shortlink.
  return incident.shortlink ? (
    <a href={incident.shortlink} target="_blank" rel="noreferrer" className={tooltipClassName} data-tip={label} aria-label={label}>
      <AlertIcon className={iconClassName} />
    </a>
  ) : (
    <button type="button" className={tooltipClassName} data-tip={label} aria-label={label}>
      <AlertIcon className={iconClassName} />
    </button>
  );
}
