"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import { PlusIcon } from "@/components/icons/NavIcons";

// Opens the inline add-service modal (features/boards/components/AddServiceModal)
// — every current caller (BoardDetailContent, MonitorsPageContent's two
// empty states, MonitorsBoardSection's per-board section) owns one and
// passes its own open-handler here, since which board (if any) to
// pre-select differs per caller.
export default function NoServicesMessage({ board, onAddClick }: { board?: Board; onAddClick: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="border-base-300 flex flex-col items-center gap-3 rounded-box border border-dashed py-16 text-center">
      <p className="text-base-content/60 text-sm">{t(board ? "boards.noServicesOnBoard" : "monitors.noServices")}</p>
      <button type="button" onClick={onAddClick} className="btn btn-info btn-sm">
        <PlusIcon />
        {t("monitors.addMonitor")}
      </button>
    </div>
  );
}
