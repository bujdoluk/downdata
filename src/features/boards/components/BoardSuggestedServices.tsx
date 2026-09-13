"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import type { Catalog } from "@/types/service";
import { POPULAR_SERVICE_SLUGS } from "@/lib/popularServices";
import { CatalogServiceGrid } from "@/features/monitors";
import { useAddServiceToBoard } from "@/features/boards/hooks/useAddServiceToBoard";

// Shown only on a brand-new, empty board — a handful of well-known
// services to add with one click instead of making the empty state a dead
// end. Reuses the same curated POPULAR_SERVICE_SLUGS list the landing
// footer's "Popular Services" column uses (lib/popularServices.ts), since
// that's already the one place this app keeps a "good starting suggestions"
// list — an empty board has no service of its own to derive category-based
// recommendations from the way RecommendedServices (the public service
// detail page's "you may also want to track" sidebar) does.
//
// No local board-state mirror here — unlike AddServicePanel's earlier draft,
// `board` is read straight from the prop. BoardDetailContent (the only
// caller) owns the real optimistic state and re-renders this with a fresh
// `board` on every successful add, so a second, separate copy here would
// just be a second thing that could drift out of sync with the first.
export default function BoardSuggestedServices({
  board,
  catalog,
  onAdded,
}: {
  board: Board;
  catalog: Catalog[];
  onAdded?: (board: Board) => void;
}) {
  const { t } = useTranslation();

  const { pendingHosts, handleAdd, error } = useAddServiceToBoard(board.id, (updatedBoard) => onAdded?.(updatedBoard));

  const bySlug = new Map(catalog.map((entry) => [entry.slug, entry]));
  const suggestions = POPULAR_SERVICE_SLUGS.map((slug) => bySlug.get(slug)).filter(
    (entry): entry is Catalog => entry !== undefined && !board.Slugs.includes(entry.slug),
  );

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-6 w-full">
      <h2 className="text-base-content/40 text-center text-xs font-semibold tracking-wide uppercase">
        {t("boards.suggestedServices")}
      </h2>
      {error && (
        <div role="alert" className="alert alert-error alert-soft mx-auto mt-3 max-w-sm py-2 text-xs">
          <span>{error.message}</span>
        </div>
      )}
      <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),370px))] justify-center gap-4">
        {/* addedHosts intentionally omitted — `suggestions` already excludes
            every entry already on this board, so there's no entry left here
            that could ever be "added" to itself; CatalogServiceGrid treats a
            missing addedHosts the same as an empty one. */}
        <CatalogServiceGrid catalog={suggestions} trackedHosts={[]} pendingHosts={pendingHosts} onAdd={handleAdd} />
      </div>
    </div>
  );
}
