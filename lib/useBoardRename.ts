"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Board } from "@/types/board";

// Shared by BoardDetailContent's header and BoardCard's inline rename —
// same toggle-to-edit, PATCH, empty/unchanged-name-is-a-no-op behavior in
// both places, extracted so a future fix only has to happen once.
export function useBoardRename(board: Board) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(board.name);
  const [renaming, setRenaming] = useState(false);

  function startEditing() {
    setNameDraft(board.name);
    setIsEditing(true);
  }

  function cancel() {
    setIsEditing(false);
    setNameDraft(board.name);
  }

  async function submit() {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === board.name) {
      cancel();
      return;
    }

    setRenaming(true);
    try {
      const res = await fetch(`/api/boards/${board.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        setIsEditing(false);
        router.refresh();
      }
    } finally {
      setRenaming(false);
    }
  }

  return { isEditing, nameDraft, setNameDraft, renaming, startEditing, cancel, submit };
}
