"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";

export default function ComponentFilterModeToggle({
  mode,
  onChooseAll,
  onChooseCustom,
  mustKeepOneWarning,
  saveError,
}: {
  mode: "all" | "custom";
  onChooseAll: () => void;
  onChooseCustom: () => void;
  mustKeepOneWarning: boolean;
  // A failed save (e.g. the server rejecting a submitted component id that
  // no longer exists upstream) previously had no visible sign anything
  // went wrong — the checkbox stayed toggled locally with nothing telling
  // the account it was never actually persisted.
  saveError: string | null;
}) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label className="label cursor-pointer gap-1.5">
          <input type="checkbox" className="checkbox checkbox-xs" checked={mode === "all"} onChange={onChooseAll} />
          {t("serviceDetail.componentFilterAllComponents")}
        </label>
        <label className="label cursor-pointer gap-1.5">
          <input type="checkbox" className="checkbox checkbox-xs" checked={mode === "custom"} onChange={onChooseCustom} />
          {t("serviceDetail.componentFilterCustom")}
        </label>
      </div>
      {mustKeepOneWarning && <p className="text-warning mt-1 text-[11px]">{t("serviceDetail.componentFilterMustKeepOne")}</p>}
      {saveError && (
        <p role="alert" className="text-error mt-1 text-[11px]">
          {saveError}
        </p>
      )}
    </div>
  );
}
