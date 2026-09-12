"use client";

import Link from "next/link";
import type { Board } from "@/types/board";
import type { Catalog, ServiceStatusBatchResponse } from "@/types/service";
import CatalogServiceGrid from "@/features/monitors/components/CatalogServiceGrid";
import NoServicesMessage from "@/features/monitors/components/NoServicesMessage";

// One board's own slice of /monitors's "all boards" view (MonitorsPageContent),
// repeated once per board — same CatalogServiceGrid used everywhere else on
// this page, just scoped to one board's own entries. A service tracked on
// several of the caller's boards deliberately renders in every one of those
// boards' sections (not deduped) — see MonitorsPageContent's own comment on
// why remove is per-board, not account-wide, as a result.
export default function MonitorsBoardSection({
  board,
  entries,
  data,
  fetchFailed,
  removingSlugs,
  onRemove,
}: {
  board: Board;
  entries: Catalog[];
  data: ServiceStatusBatchResponse | undefined;
  fetchFailed: boolean;
  removingSlugs: Set<string>;
  onRemove: (entry: Catalog) => void;
}) {
  return (
    <section>
      {/* h2, not a bare Link — every other repeated section label in this
          batch (BoardTrackedServicesGrid, BoardActiveIncidentsPanel,
          BoardActiveMaintenancePanel) is a heading; this was the one that
          wasn't, so a screen reader user navigating by heading skipped
          every board name on this specific page. */}
      <h2 className="text-base font-semibold">
        <Link href={`/boards/${board.id}`} className="link link-hover text-base-content">
          {board.name}
        </Link>
      </h2>

      {entries.length === 0 ? (
        <div className="mt-3">
          <NoServicesMessage board={board} />
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),370px))] gap-4">
          <CatalogServiceGrid
            catalog={entries}
            trackedHosts={[]}
            data={data}
            fetchFailed={fetchFailed}
            removingSlugs={removingSlugs}
            onRemove={onRemove}
          />
        </div>
      )}
    </section>
  );
}
