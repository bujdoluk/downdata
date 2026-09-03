"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Catalog, ServiceStatusBatchResponse } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/service/statusStyles";
import { PlusIcon } from "@/components/icons/NavIcons";

// Bare content only, no outer margin/card/sizing — BoardDetailContent's
// grid owns that uniformly across all 6 cells. Each tile is a stripped-down
// CatalogServiceCard: just the logo and its right-edge status stripe (same
// stripeColor logic that card uses), no name/badge text — this cell is a
// compact overview, not the full per-service card grid this route used to
// have. The Add Monitor button moved here too, into this cell's own
// heading row, since the section it used to live in (the full "On this
// board" cards grid) is gone.
export default function BoardTrackedServicesGrid({
  boardId,
  entries,
  data,
  fetchFailed,
}: {
  boardId: string;
  entries: Catalog[];
  data: ServiceStatusBatchResponse | undefined;
  fetchFailed: boolean;
}) {
  const { t } = useTranslation();
  const isLoading = !data && !fetchFailed;

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-base-content/40 text-xs font-semibold tracking-wide uppercase">
          {t("boards.trackedServices")} ({entries.length})
        </h2>
        <Link href={`/add-service?board=${boardId}`} className="btn btn-info btn-xs">
          <PlusIcon />
          {t("nav.addService")}
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="text-base-content/50 mt-3 text-sm">{t("boards.noServicesOnBoard")}</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {entries.map((entry) => {
            const status = data?.[entry.slug];
            const entryFailed = fetchFailed || (status ? "error" in status : false);
            const indicator = status && "status" in status ? status.status.indicator : undefined;
            const style = indicator ? INDICATOR_STYLES[indicator] : undefined;
            const stripeColor = isLoading || entryFailed ? "bg-base-content/10" : (style ?? FALLBACK_STYLE).dot;
            const Logo = SERVICE_LOGOS[entry.slug] ?? FallbackLogo;
            return (
              <Link key={entry.slug} href={`/monitors/${entry.slug}`} className="tooltip" data-tip={entry.name}>
                <div className="card card-border bg-base-100 hover:border-base-content/20 flex h-14 w-14 flex-row items-center overflow-hidden transition-colors">
                  <span className="flex flex-1 items-center justify-center">
                    <Logo size={24} name={entry.name} />
                  </span>
                  <span className={`w-2 self-stretch shrink-0 ${stripeColor} ${isLoading ? "animate-pulse" : ""}`} aria-hidden="true" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
