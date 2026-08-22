"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import type { CatalogCategory, CatalogEntry, ServiceStatusBatchResponse } from "@/types/service";
import CatalogServiceGrid from "@/components/service/CatalogServiceGrid";

const CATEGORY_ORDER: CatalogCategory[] = ["infrastructure", "devtools", "database", "communication", "ai", "other"];

// Categories column + services-in-category column — the browsing half of
// "add a service to this board". The third column (what's already on the
// board) stays in BoardDetailContent, since it's independent of whatever's
// selected/searched here.
export default function AddServiceColumns({
  board,
  catalog,
  trackedHosts,
  data,
  fetchFailed,
  pendingHost,
  addedHosts,
  onAdd,
  query,
}: {
  board: Board;
  catalog: CatalogEntry[];
  trackedHosts: string[];
  data: ServiceStatusBatchResponse | null;
  fetchFailed: boolean;
  pendingHost: string | null;
  addedHosts: Set<string>;
  onAdd: (entry: CatalogEntry) => void;
  query: string;
}) {
  const { t } = useTranslation();

  // Fixed per-category catalog totals — deliberately not "how many are
  // still addable", so the count doesn't shrink/jump around as services get
  // added, matching entries themselves never disappearing from column 2.
  const categoryCounts = CATEGORY_ORDER.map((category) => ({
    category,
    count: catalog.filter((entry) => entry.category === category).length,
  })).filter((group) => group.count > 0);

  // Defaults to the first non-empty category so column 2 shows something
  // useful the moment you land on the page, instead of an empty prompt.
  const [selectedCategory, setSelectedCategory] = useState<CatalogCategory | null>(
    () => categoryCounts[0]?.category ?? null,
  );

  const trimmedQuery = query.trim().toLowerCase();
  // A non-empty search overrides category browsing entirely — matches
  // across the whole catalog, same as ServiceCatalogPicker's own search.
  const visibleEntries = trimmedQuery
    ? catalog.filter((entry) => entry.name.toLowerCase().includes(trimmedQuery))
    : selectedCategory
      ? catalog.filter((entry) => entry.category === selectedCategory)
      : [];

  // Already-on-the-board entries are shown too, not filtered out — merging
  // board membership into the "added" set is what makes CatalogServiceCard's
  // existing disabled-"Added" state stick permanently instead of the card
  // just vanishing once the board actually contains it.
  const onBoardHosts = catalog.filter((entry) => board.serviceSlugs.includes(entry.slug)).map((entry) => entry.host);
  const mergedAddedHosts = new Set([...addedHosts, ...onBoardHosts]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr]">
      <div className="flex flex-col gap-1">
        {categoryCounts.map(({ category, count }) => {
          const isSelected = selectedCategory === category && !trimmedQuery;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`flex items-center justify-between rounded-btn px-3 py-2 text-left text-sm transition-colors ${
                isSelected ? "bg-primary text-primary-content" : "text-base-content/70 hover:bg-base-200"
              }`}
            >
              <span>{t(`addService.category.${category}`)}</span>
              <span className="badge badge-sm">{count}</span>
            </button>
          );
        })}
      </div>

      <div>
        {visibleEntries.length === 0 ? (
          <p className="text-base-content/50 text-sm">{trimmedQuery ? t("nav.noServicesFound") : t("boards.pickCategory")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            <CatalogServiceGrid
              catalog={visibleEntries}
              trackedHosts={trackedHosts}
              data={data}
              fetchFailed={fetchFailed}
              pendingHost={pendingHost}
              addedHosts={mergedAddedHosts}
              onAdd={onAdd}
            />
          </div>
        )}
      </div>
    </div>
  );
}
