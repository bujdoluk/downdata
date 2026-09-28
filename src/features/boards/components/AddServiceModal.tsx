"use client";

import { useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import type { Catalog } from "@/types/service";
import ModalCloseButton from "@/components/ModalCloseButton";
import SelectDropdown from "@/components/SelectDropdown";
// Safe from a client component: the monitors barrel has no server-only code.
import { AddServicePanel } from "@/features/monitors";

// Stays open across multiple adds. `board` is derived from the caller-owned
// `boards` prop each render, never mirrored into local state.
export default function AddServiceModal({
  dialogRef,
  boards,
  initialBoardId,
  catalog,
  onAdded,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  boards: Board[];
  initialBoardId?: string;
  catalog: Catalog[];
  onAdded: (board: Board) => void;
}) {
  const { t } = useTranslation();
  const [boardId, setBoardId] = useState(initialBoardId ?? boards[0]?.id);
  const board = boards.find((b) => b.id === boardId) ?? boards.find((b) => b.id === initialBoardId) ?? boards[0];

  return (
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box relative h-[95vh] w-[95vw] max-w-6xl overflow-y-auto">
        <ModalCloseButton />
        <h3 className="text-lg font-bold">
          {board ? t("boards.addServiceModal.title", { name: board.name }) : t("boards.addBoard")}
        </h3>

        {boards.length > 1 && (
          <div className="mt-4 flex max-w-xs flex-col gap-1">
            <span className="text-base-content/60 text-xs">{t("addService.board")}</span>
            <SelectDropdown
              ariaLabel={t("addService.board")}
              value={boardId ?? ""}
              onChange={setBoardId}
              options={boards.map((b) => ({ value: b.id, label: b.name }))}
              className="w-full"
            />
          </div>
        )}

        {/* No key={board.id}: keep the search query across a board switch. */}
        {board && <AddServicePanel catalog={catalog} board={board} onAdded={onAdded} />}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>{t("boards.cancel")}</button>
      </form>
    </dialog>
  );
}
