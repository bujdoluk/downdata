"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { ALL_IMPACTS, IMPACT_CHECKBOX_COLOR, INDICATOR_STYLES } from "@/components/statusStyles";

export default function ImpactFilterCheckboxes({
  selected,
  onToggle,
}: {
  selected: Set<string>;
  onToggle: (impact: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      {ALL_IMPACTS.map((impact) => (
        <label key={impact} className="label cursor-pointer gap-2 text-sm">
          <input
            type="checkbox"
            className={`checkbox checkbox-sm text-white ${IMPACT_CHECKBOX_COLOR[impact]}`}
            checked={selected.has(impact)}
            onChange={() => onToggle(impact)}
          />
          {/* ALL_IMPACTS is a subset of INDICATOR_STYLES's keys, so the lookup always hits */}
          {t(INDICATOR_STYLES[impact]!.labelKey)}
        </label>
      ))}
    </>
  );
}
