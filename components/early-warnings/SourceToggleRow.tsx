"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { SourceSetting } from "@/types/earlyWarning";

// One row per lib/keywordSources entry — built from that array (via the
// `sources` prop, sourced server-side from lib/earlyWarnings.ts's
// getAllSourceSettings(), which itself iterates KEYWORD_SOURCES) so a
// future source's toggle is a one-line addition there, not a new
// component here.
export default function SourceToggleRow({
  sources,
  isPending,
  onToggle,
}: {
  sources: SourceSetting[];
  isPending: boolean;
  onToggle: (source: string, enabled: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      <span className="text-base-content/50 text-xs font-semibold tracking-wide uppercase">{t("earlyWarnings.sources")}</span>
      <div className="flex flex-wrap gap-4">
        {sources.map((source) => (
          <label key={source.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={source.enabled}
              disabled={isPending}
              onChange={(e) => onToggle(source.id, e.target.checked)}
            />
            {source.label}
          </label>
        ))}
      </div>
    </div>
  );
}
