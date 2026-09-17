"use client";

import type { Catalog, ServiceStatusBatchResponse } from "@/types/service";
import CatalogServiceCard from "@/features/monitors/components/CatalogServiceCard";
import { INDICATOR_RANK } from "@/components/statusStyles";

function severityOf(entry: Catalog, data: ServiceStatusBatchResponse | null): number {
  const status = data?.[entry.slug];
  if (!status || "error" in status) return -1;
  return INDICATOR_RANK[status.status.indicator] ?? 0;
}

// A service whose open incident outranks its own public rollup (see
// MoreSevereIncidentBadge's own comment on why that can happen) — used as a
// secondary sort key, never a primary one, so a card with a genuinely worse
// rollup indicator still always sorts first regardless of this.
export function hasAlertIcon(entry: Catalog, data: ServiceStatusBatchResponse | null): boolean {
  const status = data?.[entry.slug];
  return !!(status && "openIncidentImpact" in status && status.openIncidentImpact);
}

// Extracted so it's unit-testable without mounting the component (this repo
// has no component-rendering test setup — see resolveReminderRule.ts for
// the same reasoning applied to a different pure function).
export function sortCatalog(catalog: Catalog[], data: ServiceStatusBatchResponse | null, sortAlertsToTop: boolean): Catalog[] {
  return [...catalog].sort((a, b) => {
    const severityDiff = severityOf(b, data) - severityOf(a, data);
    if (severityDiff !== 0 || !sortAlertsToTop) return severityDiff;
    return Number(hasAlertIcon(b, data)) - Number(hasAlertIcon(a, data));
  });
}

export default function CatalogServiceGrid({
  catalog,
  trackedHosts,
  data = null,
  fetchFailed = false,
  pendingHosts,
  addedHosts,
  onAdd,
  removingSlugs,
  onRemove,
  isFullWidth = false,
  isElevatedBg = false,
  sortAlertsToTop = false,
}: {
  catalog: Catalog[];
  trackedHosts: string[];
  data?: ServiceStatusBatchResponse | null;
  fetchFailed?: boolean;
  pendingHosts?: Set<string>;
  addedHosts?: Set<string>;
  onAdd?: (entry: Catalog) => void;
  removingSlugs?: Set<string>;
  onRemove?: (entry: Catalog) => void;
  isFullWidth?: boolean;
  isElevatedBg?: boolean;
  // Opt-in, /monitors-only tie-break: a card whose alert icon is showing
  // (hasAlertIcon) sorts ahead of one without it, but only within equal
  // severityOf rank — never overriding a real severity difference. Off by
  // default so the add-service picker (CatalogBrowser.tsx) and
  // BoardSuggestedServices.tsx keep today's plain severity-only order.
  sortAlertsToTop?: boolean;
}) {
  const isAddMode = Boolean(onAdd);
  const monitoredHosts = new Set(trackedHosts);

  const sortedCatalog = sortCatalog(catalog, data, sortAlertsToTop);

  return (
    <>
      {sortedCatalog.map((entry) => {
        const status = data?.[entry.slug];
        const entryFailed = fetchFailed || (status ? "error" in status : false);
        return (
          <CatalogServiceCard
            key={entry.slug}
            slug={entry.slug}
            name={entry.name}
            isLoading={!isAddMode && !data && !fetchFailed}
            error={entryFailed}
            indicator={status && "status" in status ? status.status.indicator : undefined}
            outages24h={status && "status" in status ? status.outages24h : undefined}
            openIncidentImpact={status && "status" in status ? status.openIncidentImpact : undefined}
            isMonitored={monitoredHosts.has(entry.host)}
            addState={
              onAdd
                ? {
                    isPending: pendingHosts?.has(entry.host) ?? false,
                    isAdded: addedHosts?.has(entry.host) ?? false,
                    onAdd: () => onAdd(entry),
                  }
                : undefined
            }
            removable={
              onRemove
                ? {
                    removing: removingSlugs?.has(entry.slug) ?? false,
                    onRemove: () => onRemove(entry),
                  }
                : undefined
            }
            isFullWidth={isFullWidth}
            isElevatedBg={isElevatedBg}
          />
        );
      })}
    </>
  );
}
