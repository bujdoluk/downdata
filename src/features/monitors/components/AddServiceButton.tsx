"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { PlusIcon } from "@/components/icons/NavIcons";

export default function AddServiceButton({ boardId }: { boardId?: string }) {
  const { t } = useTranslation();

  return (
    <Link href={boardId ? `/add-service?board=${boardId}` : "/add-service"} className="btn btn-info btn-sm">
      <PlusIcon />
      {t("monitors.addMonitor")}
    </Link>
  );
}
