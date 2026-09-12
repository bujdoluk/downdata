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
  // Only for resetting the draft name on close (see the effect below) — the
  // dialog's own open/close calls stay owned by CreateBoardModal, not this
  // form.
  dialogRef: RefObject<HTMLDialogElement | null>;
  // Board switching elsewhere (BoardSelect's dropdown, /boards) is
  // name-driven, so two boards sharing a name become genuinely hard to
  // tell apart later. This is advisory, not a hard uniqueness constraint —
  // the DB doesn't enforce one, and a real duplicate (two clients both
  // wanting "Production") is legitimate, so submission still goes through.
  existingNames: string[];
  onCreated: (board: Board) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const trimmedName = name.trim();
  const isDuplicate =
    trimmedName.length > 0 && existingNames.some((existing) => existing.trim().toLowerCase() === trimmedName.toLowerCase());

  // The dialog stays mounted between opens (see the input's own autoFocus
  // comment below), so without this, canceling via Escape or a backdrop
  // click — not just the Cancel button — left a typed draft name showing
  // the next time "+ Add board" was reopened. Listening for the dialog's
  // own native "close" event (not just the Cancel button's onClick) covers
  // every dismissal path, since all of them end in that same event.
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
        // <dialog>'s showModal() re-runs its own focusing steps on every
        // call (not just once on mount like plain HTML autofocus), so this
        // keeps working even though the dialog stays mounted and is just
        // shown/hidden — see the sibling comment in SmsConnectForm.
        autoFocus
      />
      {createMutation.isError ? (
        <p role="alert" className="text-error mt-2 text-xs">
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
