"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";

export default function CreateBoardForm({ onCreated }: { onCreated: (board: Board) => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");

  const createMutation = useMutation({
    mutationFn: async (trimmedName: string) => {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("addService.somethingWrong"));
      return data as Board;
    },
    onSuccess: (board) => {
      setName("");
      onCreated(board);
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("boards.namePlaceholder")}
          className="input input-bordered input-sm flex-1"
        />
        <button type="submit" disabled={createMutation.isPending || !name.trim()} className="btn btn-info btn-sm">
          {t("boards.createSubmit")}
        </button>
      </form>

      {createMutation.isError && (
        <div role="alert" className="alert alert-error alert-soft mt-3 py-2 text-xs">
          <span>{createMutation.error.message}</span>
        </div>
      )}
    </div>
  );
}
