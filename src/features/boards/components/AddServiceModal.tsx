"use client";

import { useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import type { Catalog } from "@/types/service";
import ModalCloseButton from "@/components/ModalCloseButton";
import SelectDropdown from "@/components/SelectDropdown";
// @/features/monitors's own barrel, not a relative reach into its
// components/ folder directly — same "a feature's index.ts is the intended
// integration point for cross-feature reuse" idiom AGENTS.md documents
// elsewhere (e.g. landing-page importing features/support's openSupportChat).
// Safe to import from a client component here: unlike @/features/boards's
// own barrel, monitors's barrel re-exports no server-only code.
import { AddServicePanel } from "@/features/monitors";

// The inline "add a service" dialog, opened from board-detail's
// BoardTrackedServicesGrid/NoServicesMessage (a single fixed board — pass a
// one-element `boards` array, no switcher renders) and from /monitors's
// header/empty-states (the full boards list — a switcher renders, since
// unlike board-detail there's often no single board already in view).
// Deliberately stays open across multiple adds (only ×/backdrop/Escape
// close it, same as every other <dialog> in this app) so adding several
// services in one sitting doesn't mean reopening it each time.
//
// `board` is derived from the live `boards` prop by id every render, never
// mirrored into local state — the caller (BoardDetailContent, MonitorsPageContent)
// owns the real board data and re-renders this with it, same reasoning as
// AddServicePanel's own header comment.
export default function AddServiceModal({
  dialogRef,
  boards,
  initialBoardId,
  catalog,
  onAdded,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  boards: Board[];
  // Which board starts selected — defaults to the first (alphabetically,
  // since callers already sort their own board lists that way). Only
  // matters when there's more than one board to choose from; see boardId
  // state below.
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

        {/* Only worth a dropdown when there's an actual choice — board-
            detail's caller passes a single-element array, where a picker
            with one immovable option would just be clutter. */}
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

        {/* No key={board.id} — same reasoning as ServiceCatalogPicker's own
            dropdown: AddServicePanel has no board-derived state of its own
            to reset, and keeping the search query across a board switch
            (rather than clearing it) matches that existing behavior. */}
        {board && <AddServicePanel catalog={catalog} board={board} onAdded={onAdded} />}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>{t("boards.cancel")}</button>
      </form>
    </dialog>
  );
}
