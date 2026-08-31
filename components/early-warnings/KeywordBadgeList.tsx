"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { KeywordWatch } from "@/types/earlyWarning";

export default function KeywordBadgeList({ keywords, onRemove }: { keywords: KeywordWatch[]; onRemove: (id: string) => void }) {
  const { t } = useTranslation();

  if (keywords.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-base-content/50 text-xs font-semibold tracking-wide uppercase">{t("earlyWarnings.keywords")}</span>
      <ul className="flex flex-wrap gap-2">
        {keywords.map((watch) => (
          <li key={watch.id} className="badge badge-soft gap-1.5">
            {watch.keyword}
            <button type="button" onClick={() => onRemove(watch.id)} className="text-error cursor-pointer" aria-label={t("earlyWarnings.removeKeyword")}>
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
