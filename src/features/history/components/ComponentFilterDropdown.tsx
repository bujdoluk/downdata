"use client";

import { useRef } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { InfoIcon } from "@/components/icons/NavIcons";
import { useCloseDetailsOnOutsideClick } from "@/hooks/useCloseDetailsOnOutsideClick";

export default function ComponentFilterDropdown({
  options,
  selected,
  onToggle,
}: {
  options: { id: string; name: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const { t } = useTranslation();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useCloseDetailsOnOutsideClick(detailsRef);

  if (options.length === 0) return null;

  const summary = selected.size === 0
    ? t("history.filter.allComponents")
    : options
        .filter((option) => selected.has(option.id))
        .map((option) => option.name)
        .join(", ");

  return (
    <div className="flex items-center gap-1.5">
      <details ref={detailsRef} className="dropdown">
        <summary className="select select-bordered select-sm w-56 list-none truncate">{summary}</summary>
        <ul className="dropdown-content menu bg-base-200 border-base-300 z-30 mt-1 max-h-64 w-56 flex-nowrap overflow-y-auto rounded-box border p-2 shadow-xl">
          {options.map((option) => (
            <li key={option.id}>
              <label className="label cursor-pointer justify-start gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={selected.has(option.id)}
                  onChange={() => onToggle(option.id)}
                />
                {option.name}
              </label>
            </li>
          ))}
        </ul>
      </details>
      <span className="tooltip" data-tip={t("history.filter.componentsMethodology")}>
        <InfoIcon className="text-base-content/40" />
      </span>
    </div>
  );
}
