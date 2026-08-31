"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Board } from "@/types/board";
import { queryKeys } from "@/lib/queryKeys";

// Shared by BoardDetailContent's header and BoardCard's inline rename —
// same toggle-to-edit, PATCH, empty/unchanged-name-is-a-no-op behavior in
// both places, extracted so a future fix only has to happen once.
export function useBoardRename(board: Board) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(board.name);

  const renameMutation = useMutation({
    mutationFn: (name: string) =>
      fetch(`/api/boards/${board.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: (res) => {
      if (!res.ok) return;
      setIsEditing(false);
      // Server Components re-fetch the board's own name via router.refresh();
      // Sidebar's BoardSelect dropdown keeps its own client-cached list, so
      // that needs an explicit invalidation to pick up the new name too.
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.list() });
      router.refresh();
    },
  });

  function startEditing() {
    setNameDraft(board.name);
    setIsEditing(true);
  }

  function cancel() {
    setIsEditing(false);
    setNameDraft(board.name);
  }

  function submit() {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === board.name) {
      cancel();
      return;
    }
    renameMutation.mutate(trimmed);
  }

  return { isEditing, nameDraft, setNameDraft, renaming: renameMutation.isPending, startEditing, cancel, submit };
}
