"use client";

import { useRef } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { ALL_IMPACTS, IMPACT_CHECKBOX_COLOR, INDICATOR_STYLES } from "@/components/service/statusStyles";
import { useCloseDetailsOnOutsideClick } from "@/hooks/useCloseDetailsOnOutsideClick";

// Select-look dropdown that opens a checkbox list — a native <select> can't
// hold checkboxes as options, so this is the details/summary dropdown idiom
// already used throughout this repo (ServiceSearchPicker, LanguageSwitcher,
// BoardsPageContent, IntegrationCard), not a new pattern. Shared by
// Incidents and History page content, which filter the same Incident.impact
// values through the same ALL_IMPACTS/IMPACT_CHECKBOX_COLOR maps.
//
// Sibling of ImpactFilterCheckboxes.tsx, not a replacement for it —
// SmsConnectForm.tsx still uses the plain checkbox row for its settings
// form (a "choose which severities notify" toggle group reads better fully
// visible than collapsed behind a dropdown there).
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
      <ul className="dropdown-content menu bg-base-200 border-base-300 z-30 mt-1 w-52 rounded-box border p-2 shadow-xl">
        {ALL_IMPACTS.map((impact) => (
          <li key={impact}>
            <label className="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                className={`checkbox checkbox-sm text-white ${IMPACT_CHECKBOX_COLOR[impact]}`}
                checked={selected.has(impact)}
                onChange={() => onToggle(impact)}
              />
              {/* impact comes from ALL_IMPACTS, a subset of INDICATOR_STYLES's keys, so the lookup always hits */}
              {t(INDICATOR_STYLES[impact]!.labelKey)}
            </label>
          </li>
        ))}
      </ul>
    </details>
  );
}
