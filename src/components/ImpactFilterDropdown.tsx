"use client";

import { useRef } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { ALL_IMPACTS, IMPACT_CHECKBOX_COLOR, INDICATOR_STYLES } from "@/components/statusStyles";
import { useCloseDetailsOnOutsideClick } from "@/hooks/useCloseDetailsOnOutsideClick";

// A native <select> can't hold checkboxes. Settings forms still use the always-visible ImpactFilterCheckboxes.
export default function ImpactFilterDropdown({
  selected,
  onToggle,
}: {
  selected: Set<string>;
  onToggle: (impact: string) => void;
}) {
  const { t } = useTranslation();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useCloseDetailsOnOutsideClick(detailsRef);

  const summary =
    selected.size === ALL_IMPACTS.length
      ? t("incidents.filter.allImpacts")
      : selected.size === 0
        ? t("incidents.filter.noImpactsSelected")
        : ALL_IMPACTS.filter((impact) => selected.has(impact))
            .map((impact) => t(INDICATOR_STYLES[impact]!.labelKey))
            .join(", ");

  return (
    <details ref={detailsRef} className="dropdown">
      <summary className="select select-bordered select-sm w-56 list-none truncate">{summary}</summary>
      <ul className="dropdown-content menu border-base-300 z-30 mt-1 w-52 rounded-box border bg-[var(--color-surface-2)] p-2 shadow-xl">
        {ALL_IMPACTS.map((impact) => (
          <li key={impact}>
            <label className="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                className={`checkbox checkbox-sm text-white ${IMPACT_CHECKBOX_COLOR[impact]}`}
                checked={selected.has(impact)}
                onChange={() => onToggle(impact)}
              />
              {/* ALL_IMPACTS is a subset of INDICATOR_STYLES's keys. */}
              {t(INDICATOR_STYLES[impact]!.labelKey)}
            </label>
          </li>
        ))}
      </ul>
    </details>
  );
}
