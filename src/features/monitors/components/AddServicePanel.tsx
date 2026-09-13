"use client";

import { useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Catalog } from "@/types/service";
import type { Board } from "@/types/board";
import CatalogBrowser from "@/features/monitors/components/CatalogBrowser";
import RequestCard from "@/components/RequestCard";
import { SERVICE_LOGOS } from "@/components/logos";
import FallbackLogo from "@/components/logos/FallbackLogo";
import { TAB_BG_STYLE } from "@/lib/utils";
// Direct path, not @/features/boards's own barrel — see this hook's own
// file header for why.
import { useAddServiceToBoard } from "@/features/boards/hooks/useAddServiceToBoard";

// The reusable "search + browse + add" body shared by ServiceCatalogPicker
// (the full /add-service page, which wraps this with its own PageHeader,
// back link, and board-switcher dropdown) and AddServiceModal (the
// board-detail inline dialog, which fixes the board instead). Everything
// here assumes a single, already-decided board — board switching is the
// caller's job, not this component's.
//
// `board` is read straight from the prop, with no local mirror — both
// callers already own real state of their own (ServiceCatalogPicker's
// `boards` array, BoardDetailContent's own board state) and re-render this
// with a fresh `board` on every successful add, so "Added" state and
// addedHosts stay correct without a second, separate copy here that could
// drift out of sync with the caller's.
export default function AddServicePanel({
  catalog,
  board,
  onAdded,
}: {
  catalog: Catalog[];
  board: Board;
  onAdded?: (board: Board) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [dropdownDismissed, setDropdownDismissed] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const trimmedQuery = query.trim();
  const suggestions = trimmedQuery && !dropdownDismissed
    ? catalog.filter((entry) => entry.name.toLowerCase().startsWith(trimmedQuery.toLowerCase()))
    : [];

  const { pendingHosts, handleAdd, error } = useAddServiceToBoard(board.id, (updatedBoard) => onAdded?.(updatedBoard));

  const addedHosts = new Set(catalog.filter((entry) => board.Slugs.includes(entry.slug)).map((entry) => entry.host));

  function handleQueryChange(value: string) {
    setQuery(value);
    setDropdownDismissed(false);
    setHighlightedIndex(-1);
  }

  function selectSuggestion(entry: Catalog) {
    setQuery(entry.name);
    setDropdownDismissed(true);
    setHighlightedIndex(-1);
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const entry = suggestions[highlightedIndex];
      if (entry) {
        e.preventDefault();
        selectSuggestion(entry);
      }
    } else if (e.key === "Escape") {
      setDropdownDismissed(true);
      setHighlightedIndex(-1);
    }
  }

  return (
    <div className="mt-4 flex flex-col items-start gap-6 lg:flex-row">
      {/* Radio-input tabs: selection is pure CSS (:checked + sibling
          selector), which only works with each tab-content as the
          immediate next sibling of its own radio — so both panels stay
          mounted, no React state needed to switch between them. */}
      <div role="tablist" className="tabs tabs-lift min-w-0 flex-1">
        <input
          type="radio"
          name="addServiceTabs"
          className="tab"
          aria-label={t("addService.tabService")}
          style={TAB_BG_STYLE}
          defaultChecked
        />
        <div className="tab-content bg-[var(--color-surface-1)] border-base-300 p-6">
          <div className="relative w-full max-w-sm">
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t("nav.searchPlaceholder", { count: catalog.length })}
              className="input input-bordered input-sm w-full"
              style={{ backgroundColor: "var(--color-surface-2)" }}
              autoFocus
            />

            {suggestions.length > 0 && (
              <ul className="menu menu-sm border-base-300 absolute top-full left-0 z-20 mt-2 w-full flex-nowrap border bg-[var(--color-surface-2)] p-1 shadow-xl">
                {suggestions.map((entry, index) => {
                  const Logo = SERVICE_LOGOS[entry.slug] ?? FallbackLogo;
                  return (
                    <li key={entry.slug}>
                      <button
                        type="button"
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onClick={() => selectSuggestion(entry)}
                        className={`flex items-center gap-2.5 ${index === highlightedIndex ? "menu-focus" : ""}`}
                      >
                        <Logo size={18} name={entry.name} />
                        {entry.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {error && (
            <div role="alert" className="alert alert-error alert-soft mt-3 py-2 text-xs">
              <span>{error.message}</span>
            </div>
          )}

          <div className="mt-4">
            <CatalogBrowser
              catalog={catalog}
              trackedHosts={[]}
              pendingHosts={pendingHosts}
              addedHosts={addedHosts}
              onAdd={handleAdd}
              query={query}
            />
          </div>
        </div>

        <input
          type="radio"
          name="addServiceTabs"
          className="tab"
          aria-label={t("addService.tabWebsite")}
          style={TAB_BG_STYLE}
        />
        <div className="tab-content bg-[var(--color-surface-1)] border-base-300 p-6">
          <p className="text-base-content/50 text-sm">{t("addService.websiteComingSoon")}</p>
        </div>
      </div>

      <RequestCard title={t("addService.requestCard.title")} buttonLabel={t("addService.requestCard.button")} kind="service" />
    </div>
  );
}
