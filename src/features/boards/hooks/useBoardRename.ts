"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Board } from "@/types/board";
import { queryKeys } from "@/lib/queryKeys";

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
      // refresh() covers Server Components; BoardSelect's client-cached list needs invalidating.
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
