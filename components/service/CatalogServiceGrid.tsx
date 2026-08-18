"use client";

import { useEffect, useState } from "react";
import type { CatalogEntry, ServiceStatusBatchResponse } from "@/types/service";
import CatalogServiceCard from "@/components/service/CatalogServiceCard";

const POLL_INTERVAL_MS = 30_000;

export default function CatalogServiceGrid({
  catalog,
  trackedHosts,
  pendingHost,
  addedHosts,
  onAdd,
  removingSlug,
  onRemove,
}: {
  catalog: CatalogEntry[];
  trackedHosts: string[];
  pendingHost?: string | null;
  addedHosts?: Set<string>;
  onAdd?: (entry: CatalogEntry) => void;
  removingSlug?: string | null;
  onRemove?: (entry: CatalogEntry) => void;
}) {
  const isAddMode = Boolean(onAdd);
  const [data, setData] = useState<ServiceStatusBatchResponse | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const monitoredHosts = new Set(trackedHosts);

  useEffect(() => {
    if (isAddMode) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/status/catalog", { cache: "no-store" });
        if (!res.ok) throw new Error("bad response");
        const json = (await res.json()) as ServiceStatusBatchResponse;
        if (!cancelled) {
          setData(json);
          setFetchFailed(false);
        }
      } catch {
        if (!cancelled) setFetchFailed(true);
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isAddMode]);

  return (
    <>
      {catalog.map((entry) => {
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
