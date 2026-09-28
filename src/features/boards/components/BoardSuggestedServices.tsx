"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import type { Catalog } from "@/types/service";
import { POPULAR_SERVICE_SLUGS } from "@/lib/popularServices";
import { CatalogServiceGrid } from "@/features/monitors";
import { useAddServiceToBoard } from "@/features/boards/hooks/useAddServiceToBoard";

// `board` is read from the prop, not mirrored: BoardDetailContent owns the live state.
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
          <span className="break-words">{error.message}</span>
        </div>
      )}
      <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),370px))] justify-center gap-4">
        {/* No addedHosts: suggestions already exclude this board's services. */}
        <CatalogServiceGrid catalog={suggestions} trackedHosts={[]} pendingHosts={pendingHosts} onAdd={handleAdd} />
      </div>
    </div>
  );
}
