"use client";

import { useEffect, useState, type RefObject } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import ModalFormFooter from "@/components/ModalFormFooter";

export default function CreateBoardForm({
  dialogRef,
  existingNames,
  onCreated,
  onCancel,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  // Duplicate names only warn: the DB allows them and they can be legitimate.
  existingNames: string[];
  onCreated: (board: Board) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const trimmedName = name.trim();
  const isDuplicate =
    trimmedName.length > 0 && existingNames.some((existing) => existing.trim().toLowerCase() === trimmedName.toLowerCase());

  // The dialog stays mounted; its native "close" event covers every dismissal path.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const reset = () => setName("");
    dialog.addEventListener("close", reset);
    return () => dialog.removeEventListener("close", reset);
  }, [dialogRef]);

  const createMutation = useMutation({
    mutationFn: async (boardName: string) => {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: boardName }),
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
    if (!trimmedName) return;
    createMutation.mutate(trimmedName);
  }

  return (
    <form onSubmit={handleCreate}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("boards.namePlaceholder")}
        className="input input-bordered input-sm w-full"
        // Works in a mounted dialog: showModal() re-runs focusing on every open.
        autoFocus
      />
      {createMutation.isError ? (
        <p role="alert" className="text-error mt-2 text-xs break-words">
          {createMutation.error.message}
        </p>
      ) : (
        isDuplicate && (
          <p className="text-warning mt-2 text-xs">{t("boards.duplicateNameWarning", { name: trimmedName })}</p>
        )
      )}
      <ModalFormFooter
        onCancel={onCancel}
        cancelLabel={t("boards.cancel")}
        submitLabel={t("boards.createSubmit")}
        isSubmitting={createMutation.isPending}
        submitDisabled={!name.trim()}
      />
    </form>
  );
}
