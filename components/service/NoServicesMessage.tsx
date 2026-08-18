"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";

export default function NoServicesMessage() {
  const { t } = useTranslation();

  return (
    <div className="border-base-300 flex flex-col items-center gap-1 rounded-box border border-dashed py-16 text-center">
      <p className="text-base-content/60 text-sm">{t("monitors.noServices")}</p>
    </div>
  );
}
