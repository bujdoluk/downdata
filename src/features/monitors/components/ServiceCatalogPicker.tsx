"use client";

import { useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Catalog } from "@/types/service";
import type { Board } from "@/types/board";
import CatalogBrowser from "@/features/monitors/components/CatalogBrowser";
import RequestCard from "@/components/RequestCard";
import SelectDropdown from "@/components/SelectDropdown";
import PageHeader from "@/components/PageHeader";
import { SERVICE_LOGOS } from "@/components/logos";
import FallbackLogo from "@/components/logos/FallbackLogo";
import { queryKeys } from "@/lib/queryKeys";
import { TAB_BG_STYLE } from "@/lib/utils";

export default function ServiceCatalogPicker({
  catalog,
  boards: initialBoards,
  initialBoardId,
  backHref,
}: {
  catalog: Catalog[];
  boards: Board[];
  initialBoardId?: string;
  // Where the "← Back" link actually returns to — the specific board's own
  // page when arrived via ?board=<id>, otherwise the generic boards list.
  // Resolved server-side in add-service/page.tsx, where the raw (pre-
  // fallback) ?board= value is still available.
  backHref: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [boards, setBoards] = useState(initialBoards);
  const [boardId, setBoardId] = useState(initialBoardId ?? initialBoards[0]?.id);
  const [query, setQuery] = useState("");
  const [dropdownDismissed, setDropdownDismissed] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [pendingHosts, setPendingHosts] = useState<Set<string>>(new Set());
  const trimmedQuery = query.trim();
  const suggestions = trimmedQuery && !dropdownDismissed
    ? catalog.filter((entry) => entry.name.toLowerCase().startsWith(trimmedQuery.toLowerCase()))
    : [];

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

  function applyUpdatedBoard(updatedBoard: Board) {
    setBoards((prev) => prev.map((board) => (board.id === updatedBoard.id ? updatedBoard : board)));
    queryClient.invalidateQueries({ queryKey: queryKeys.catalogStatus() });
    router.refresh();
  }

  const board = boards.find((b) => b.id === boardId);
  const addedHosts = new Set(catalog.filter((entry) => board?.Slugs.includes(entry.slug)).map((entry) => entry.host));

  const addMutation = useMutation({
    mutationFn: async (entry: Catalog) => {
      if (!boardId) throw new Error(t("addService.pickBoardFirst"));
      const res = await fetch(`/api/boards/${boardId}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: entry.slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("addService.somethingWrong"));
      return { entry, board: data as Board };
    },
    onSuccess: ({ board: updatedBoard }) => applyUpdatedBoard(updatedBoard),
    // `variables` is this specific call's own entry — only clear that
    // one host's pending state, not whichever add happened to be in
    // flight when this one settled.
    onSettled: (_data, _error, entry) =>
      setPendingHosts((prev) => {
        const next = new Set(prev);
        next.delete(entry.host);
        return next;
      }),
  });

  function handleAdd(entry: Catalog) {
    setPendingHosts((prev) => new Set(prev).add(entry.host));
    addMutation.mutate(entry);
  }

  return (
    <div className="flex w-full flex-col self-start">
      <PageHeader
        back={
          <Link href={backHref} className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium">
            {t("addService.back")}
          </Link>
        }
      >
      <div className="mx-auto flex w-full max-w-6xl flex-col">
        <h1 className="text-base-content text-lg font-semibold">{t("addService.title")}</h1>
        <p className="text-base-content/60 mt-1 text-sm">{t("addService.subtitle")}</p>

      <div className="mt-4 flex max-w-xs flex-col gap-1">
        {/* Not htmlFor-linked to the dropdown below — <details>/<summary>
            isn't a labelable form control the way a real <select> is, so
            the dropdown's own ariaLabel carries its accessible name instead. */}
        <span className="text-base-content/60 text-xs">{t("addService.board")}</span>
        <SelectDropdown
          ariaLabel={t("addService.board")}
          value={boardId ?? ""}
          onChange={setBoardId}
          options={boards.map((b) => ({ value: b.id, label: b.name }))}
          // No className meant no width utility on either the trigger or
          // the menu (menuClassName falls back to className) — the trigger
          // happened to stretch to fill this flex-col wrapper, but the menu
          // fell back to shrink-to-content, so it never matched the
          // trigger's actual rendered width. Every other SelectDropdown
          // caller already passes an explicit width for exactly this reason.
          className="w-full"
        />
      </div>

      {/* RequestCard sits outside the tabs entirely (not inside either
          tab-content) so it stays visible across both tabs instead of
          disappearing when "Website" is selected. */}
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

            {addMutation.isError && (
              <div role="alert" className="alert alert-error alert-soft mt-3 py-2 text-xs">
                <span>{addMutation.error.message}</span>
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
      </div>
      </PageHeader>
    </div>
  );
}
