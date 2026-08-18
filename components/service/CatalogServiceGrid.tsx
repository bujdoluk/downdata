"use client";

import type { CatalogEntry, ServiceStatusBatchResponse } from "@/types/service";
import CatalogServiceCard from "@/components/service/CatalogServiceCard";

const INDICATOR_SEVERITY: Record<string, number> = {
  critical: 3,
  major: 2,
  minor: 1,
  none: 0,
};

function severityOf(entry: CatalogEntry, data: ServiceStatusBatchResponse | null): number {
  const status = data?.[entry.slug];
  if (!status || "error" in status) return -1;
  return INDICATOR_SEVERITY[status.status.indicator] ?? 0;
}

export default function CatalogServiceGrid({
  catalog,
  trackedHosts,
  data = null,
  fetchFailed = false,
  pendingHost,
  addedHosts,
  onAdd,
  removingSlug,
  onRemove,
}: {
  catalog: CatalogEntry[];
  trackedHosts: string[];
  data?: ServiceStatusBatchResponse | null;
  fetchFailed?: boolean;
  pendingHost?: string | null;
  addedHosts?: Set<string>;
  onAdd?: (entry: CatalogEntry) => void;
  removingSlug?: string | null;
  onRemove?: (entry: CatalogEntry) => void;
}) {
  const isAddMode = Boolean(onAdd);
  const monitoredHosts = new Set(trackedHosts);

  const sortedCatalog = [...catalog].sort(
    (a, b) => severityOf(b, data) - severityOf(a, data),
  );

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
            description={status && "status" in status ? status.status.description : undefined}
            outages24h={status && "status" in status ? status.outages24h : undefined}
            isMonitored={monitoredHosts.has(entry.host)}
            addState={
              onAdd
                ? {
                    isPending: pendingHost === entry.host,
                    isAdded: addedHosts?.has(entry.host) ?? false,
                    onAdd: () => onAdd(entry),
                  }
                : undefined
            }
            removable={
              onRemove
                ? {
                    removing: removingSlug === entry.slug,
                    onRemove: () => onRemove(entry),
                  }
                : undefined
            }
          />
        );
      })}
    </>
  );
}
