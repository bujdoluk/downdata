"use client";

import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import CreateBoardForm from "@/features/boards/components/CreateBoardForm";
import ModalCloseButton from "@/components/ModalCloseButton";

export default function CreateBoardModal({
  dialogRef,
  boards,
  onCreated,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  boards: Board[];
  onCreated: (board: Board) => void;
}) {
  const { t } = useTranslation();

  return (
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box relative">
        <ModalCloseButton />
        <h3 className="text-lg font-bold">{t("boards.addBoard")}</h3>
        <div className="mt-4">
          <CreateBoardForm
            dialogRef={dialogRef}
            existingNames={boards.map((board) => board.name)}
            onCreated={(board) => {
              dialogRef.current?.close();
              onCreated(board);
            }}
            onCancel={() => dialogRef.current?.close()}
          />
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>{t("boards.cancel")}</button>
      </form>
    </dialog>
  );
}
