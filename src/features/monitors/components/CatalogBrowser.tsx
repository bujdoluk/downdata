"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Category, Catalog, ServiceStatusBatchResponse } from "@/types/service";
import CatalogServiceGrid from "@/features/monitors/components/CatalogServiceGrid";

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

  // Totals, not "still addable", so counts don't jump as services are added.
  // Sorted by translated label since A-Z order differs per locale.
  const categoryCounts = Array.from(new Set(catalog.map((entry) => entry.category)))
    .map((category) => ({
      category,
      count: catalog.filter((entry) => entry.category === category).length,
    }))
    .sort((a, b) => t(`addService.category.${a.category}`).localeCompare(t(`addService.category.${b.category}`), i18n.language));

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    () => categoryCounts[0]?.category ?? null,
  );

  const trimmedQuery = query.trim().toLowerCase();
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
              {/* Explicit border-base-300: the default badge border blends into surface-2 in light theme. */}
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
