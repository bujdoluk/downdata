"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import AddServiceButton from "@/features/monitors/components/AddServiceButton";

export default function NoServicesMessage({ board }: { board?: Board }) {
  const { t } = useTranslation();

  return (
    <div className="border-base-300 flex flex-col items-center gap-3 rounded-box border border-dashed py-16 text-center">
      <p className="text-base-content/60 text-sm">{t(board ? "boards.noServicesOnBoard" : "monitors.noServices")}</p>
      <AddServiceButton boardId={board?.id} />
    </div>
  );
}
