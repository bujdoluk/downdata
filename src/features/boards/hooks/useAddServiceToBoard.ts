"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import type { Catalog } from "@/types/service";

// Import by direct path, never via the boards barrel: it re-exports server-only boards.ts.
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
