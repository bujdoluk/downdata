"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { OpenIncidentImpact } from "@/types/service";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/statusStyles";
import { AlertIcon } from "@/components/icons/NavIcons";

// Shown next to a service's own page-level status whenever one of its open
// incidents is rated more severely — see AGENTS.md's Failure log: a
// Statuspage's rollup `status.indicator` and an incident's own `impact` are
// independently set and can genuinely disagree (confirmed live against
// GitHub's own feed: rollup "major" while its open incident's own impact is
// "critical"). The rollup stays the primary label everywhere so this app
// never shows a value that contradicts what a user finds by clicking
// through to the source's own banner — this badge is the "here's more
// context, and here's the proof" affordance instead of a silent override.
export default function MoreSevereIncidentBadge({
  incident,
  className,
  iconClassName = "h-3.5 w-3.5",
}: {
  incident: OpenIncidentImpact;
  className?: string;
  // Lets a caller that positions this somewhere roomier (CatalogServiceCard's
  // bottom-right corner badge) size the icon up without changing it for the
  // other two callers (ServiceDetail/PublicServiceDetail), which sit inline
  // next to running text and still want the smaller default.
  iconClassName?: string;
}) {
  const { t } = useTranslation();
  const style = INDICATOR_STYLES[incident.impact] ?? FALLBACK_STYLE;
  const label = t("status.moreSevereIncidentTooltip", {
    impact: t(style.labelKey),
    name: incident.name,
  });

  // z-50 on the tooltip's own pseudo-elements (daisyUI renders the bubble
  // and arrow via ::before/::after on this same element) — belt-and-braces
  // for callers that stack this inside a card with other absolutely
  // positioned siblings (the "..." menu, badges). Doesn't fix a clipping
  // ancestor with overflow-hidden on its own — z-index can't rescue content
  // from that, only removing/relocating the overflow-hidden actually does
  // (see CatalogServiceCard.tsx's own comment on why it no longer clips) —
  // but it does matter once that's fixed, so a taller neighboring element
  // can't still paint over the popped-out tooltip.
  const tooltipClassName = `tooltip before:z-50 after:z-50 inline-flex shrink-0 ${style.text} ${className ?? ""}`;

  // incident.io-hosted pages can omit a shortlink (see IncidentDetail.tsx's
  // matching comment) — falls back to a non-navigating tooltip-only button
  // rather than an <a> with an empty href.
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
