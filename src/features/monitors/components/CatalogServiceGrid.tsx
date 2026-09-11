"use client";

import type { Catalog, ServiceStatusBatchResponse } from "@/types/service";
import CatalogServiceCard from "@/features/monitors/components/CatalogServiceCard";
import { usePinned } from "@/hooks/usePinned";

const INDICATOR_SEVERITY: Record<string, number> = {
  critical: 3,
  major: 2,
  minor: 1,
  none: 0,
};

function severityOf(entry: Catalog, data: ServiceStatusBatchResponse | null): number {
  const status = data?.[entry.slug];
  if (!status || "error" in status) return -1;
  return INDICATOR_SEVERITY[status.status.indicator] ?? 0;
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
}) {
  const isAddMode = Boolean(onAdd);
  const monitoredHosts = new Set(trackedHosts);
  const { pinned, togglePin } = usePinned("pinnedServices");

  const sortedCatalog = [...catalog].sort((a, b) => {
    const pinDiff = Number(pinned.has(b.slug)) - Number(pinned.has(a.slug));
    return pinDiff !== 0 ? pinDiff : severityOf(b, data) - severityOf(a, data);
  });

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
            pinned={pinned.has(entry.slug)}
            onTogglePin={onRemove ? () => togglePin(entry.slug) : undefined}
            isFullWidth={isFullWidth}
            isElevatedBg={isElevatedBg}
          />
        );
      })}
    </>
  );
}
