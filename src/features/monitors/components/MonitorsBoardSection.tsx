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
      <Link href={`/boards/${board.id}`} className="link link-hover text-base-content text-base font-semibold">
        {board.name}
      </Link>

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
