"use client";

import type { Catalog, ServiceStatusBatchResponse } from "@/types/service";
import CatalogServiceCard from "@/features/monitors/components/CatalogServiceCard";
import { INDICATOR_RANK } from "@/components/statusStyles";

function severityOf(entry: Catalog, data: ServiceStatusBatchResponse | null): number {
  const status = data?.[entry.slug];
  if (!status || "error" in status) return -1;
  return INDICATOR_RANK[status.status.indicator] ?? 0;
}

// Secondary sort key only; a worse rollup indicator always sorts first.
export function hasAlertIcon(entry: Catalog, data: ServiceStatusBatchResponse | null): boolean {
  const status = data?.[entry.slug];
  return !!(status && "openIncidentImpact" in status && status.openIncidentImpact);
}

// Exported for unit tests; there's no component-rendering test setup.
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
  // Tie-break within equal severity only; off so other callers keep severity-only order.
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
