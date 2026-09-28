"use client";

import Link from "next/link";
import type { Board } from "@/types/board";
import type { Catalog, ServiceStatusBatchResponse } from "@/types/service";
import CatalogServiceGrid from "@/features/monitors/components/CatalogServiceGrid";
import NoServicesMessage from "@/features/monitors/components/NoServicesMessage";

// A service on several boards deliberately renders in each board's section.
export default function MonitorsBoardSection({
  board,
  entries,
  data,
  fetchFailed,
  removingSlugs,
  onRemove,
  onAddService,
}: {
  board: Board;
  entries: Catalog[];
  data: ServiceStatusBatchResponse | undefined;
  fetchFailed: boolean;
  removingSlugs: Set<string>;
  onRemove: (entry: Catalog) => void;
  onAddService: () => void;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold">
        <Link href={`/boards/${board.id}`} className="link link-hover text-base-content">
          {board.name}
        </Link>
      </h2>

      {entries.length === 0 ? (
        <div className="mt-3">
          <NoServicesMessage board={board} onAddClick={onAddService} />
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CatalogServiceGrid
            catalog={entries}
            trackedHosts={[]}
            data={data}
            fetchFailed={fetchFailed}
            removingSlugs={removingSlugs}
            onRemove={onRemove}
            isFullWidth
            sortAlertsToTop
          />
        </div>
      )}
    </section>
  );
}
