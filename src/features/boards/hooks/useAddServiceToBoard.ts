"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import type { Catalog } from "@/types/service";

// The one "add this catalog entry to that board" mutation — shared by
// AddServicePanel (features/monitors, used by both /add-service and the
// board-detail modal) and BoardSuggestedServices, so there's exactly one
// place that knows POST /api/boards/[id]/services's request shape.
//
// Lives in features/boards (not monitors) since "add a service to a board"
// is a boards-domain action even though its biggest caller today sits in
// monitors — import it by this direct path, never through @/features/boards's
// own barrel. That barrel also re-exports services/boards.ts (server-only,
// reads next/headers's cookies()), and a client component pulling it in
// transitively breaks Next's client/server boundary check — the exact trap
// components/sidebar/BoardSelect.tsx's own comment already documents.
export function useAddServiceToBoard(boardId: string | undefined, onAdded: (board: Board) => void) {
  const { t } = useTranslation();
  const [pendingHosts, setPendingHosts] = useState<Set<string>>(new Set());

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
      return data as Board;
    },
    onSuccess: onAdded,
    // `entry` is this specific call's own variables — only clear that one
    // host's pending state, not whichever add happened to be in flight when
    // this one settled (same reasoning as ServiceCatalogPicker's original
    // inline version of this).
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

  return { pendingHosts, handleAdd, error: addMutation.error };
}
