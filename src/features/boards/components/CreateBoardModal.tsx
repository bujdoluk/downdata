"use client";

import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import CreateBoardForm from "@/features/boards/components/CreateBoardForm";
import ModalCloseButton from "@/components/ModalCloseButton";

// The one "create a board" modal, shared by BoardsPageContent's own
// "+ Add board" button and the sidebar's BoardSelect (its dropdown's own
// "+ Add board" option) — these used to be two independent
// implementations (a popover wrapping this same form, and a fully
// hand-rolled duplicate dialog+mutation+state in BoardSelect). dialogRef
// is a plain prop, not a forwarded ref: the caller owns it and calls
// showModal()/close() on it directly from its own trigger, same as every
// other <dialog> in this app (see IntegrationsPageContent's dialogRefs).
export default function CreateBoardModal({
  dialogRef,
  boards,
  onCreated,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  // For the duplicate-name warning in CreateBoardForm — both current
  // callers already have the caller's own board list in scope.
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
              // Closing here, not left to each caller: this component is
              // the one place that could otherwise be forgotten by a future
              // third caller (both current ones — BoardsPageContent and
              // BoardSelect — used to repeat this same call themselves).
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
