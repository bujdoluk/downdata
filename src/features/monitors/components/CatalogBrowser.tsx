"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Category, Catalog, ServiceStatusBatchResponse } from "@/types/service";
import CatalogServiceGrid from "@/features/monitors/components/CatalogServiceGrid";

// Categories column + services-in-category column — the shared "browse the
// catalog and add a service" UI, used both by the add-service page and by a
// board's "add a service to this board" flow. A caller-specific third column
// (e.g. BoardDetailContent's "On board" list) stays with the caller, since
// it's independent of whatever's selected/searched here.
export default function CatalogBrowser({
  catalog,
  trackedHosts,
  data = null,
  fetchFailed = false,
  pendingHosts,
  addedHosts,
  onAdd,
  query,
}: {
  catalog: Catalog[];
  trackedHosts: string[];
  data?: ServiceStatusBatchResponse | null;
  fetchFailed?: boolean;
  pendingHosts?: Set<string>;
  addedHosts?: Set<string>;
  onAdd?: (entry: Catalog) => void;
  query: string;
}) {
  const { t, i18n } = useTranslation();

  // Fixed per-category catalog totals — deliberately not "how many are
  // still addable", so the count doesn't shrink/jump around as services get
  // added, matching entries themselves never disappearing from column 2.
  // Categories present are derived from the catalog itself rather than a
  // separately-maintained list (the Category union in types/service.ts is
  // the one source of truth for which values are valid) and sorted by each
  // viewer's own translated label — alphabetical order genuinely differs
  // per language, so a single fixed order could never be "A-Z" for more
  // than one locale at a time.
  const categoryCounts = Array.from(new Set(catalog.map((entry) => entry.category)))
    .map((category) => ({
      category,
      count: catalog.filter((entry) => entry.category === category).length,
    }))
    .sort((a, b) => t(`addService.category.${a.category}`).localeCompare(t(`addService.category.${b.category}`), i18n.language));

  // Defaults to the first non-empty category so column 2 shows something
  // useful the moment you land on the page, instead of an empty prompt.
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    () => categoryCounts[0]?.category ?? null,
  );

  const trimmedQuery = query.trim().toLowerCase();
  // A non-empty search overrides category browsing entirely.
  const visibleEntries = trimmedQuery
    ? catalog.filter((entry) => entry.name.toLowerCase().startsWith(trimmedQuery))
    : selectedCategory
      ? catalog.filter((entry) => entry.category === selectedCategory)
      : [];

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
                isSelected ? "bg-info text-info-content" : "text-base-content/70 hover:bg-base-200"
              }`}
            >
              <span>{t(`addService.category.${category}`)}</span>
              {/* badge has no badge-color modifier, so daisyUI's own default
                  badge border falls back to base-200 — nearly identical to
                  surface-2 in light theme (near-white colors compress
                  contrast no matter how the fill is tuned). An explicit
                  border-base-300 is what actually makes it legible there,
                  the same bg+border-base-300 pairing used throughout the
                  app for exactly this reason. */}
              <span className="badge badge-sm border border-base-300 bg-[var(--color-surface-2)]">{count}</span>
            </button>
          );
        })}
      </div>

      <div>
        {visibleEntries.length === 0 ? (
          <p className="text-base-content/50 text-sm">{trimmedQuery ? t("nav.noServicesFound") : t("boards.pickCategory")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <CatalogServiceGrid
              catalog={visibleEntries}
              trackedHosts={trackedHosts}
              data={data}
              fetchFailed={fetchFailed}
              pendingHosts={pendingHosts}
              addedHosts={addedHosts}
              onAdd={onAdd}
              isFullWidth
              isElevatedBg
            />
          </div>
        )}
      </div>
    </div>
  );
}
