"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Indicator } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/service/statusStyles";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function CatalogServiceCard({
  slug,
  name,
  indicator,
  description,
  outages24h,
  isLoading,
  error,
  isMonitored,
  addState,
}: {
  slug: string;
  name: string;
  indicator?: Indicator;
  description?: string;
  outages24h?: number;
  isLoading: boolean;
  error: boolean;
  isMonitored: boolean;
  addState?: { isPending: boolean; isAdded: boolean; onAdd: () => void };
}) {
  const { t } = useTranslation();
  const style = indicator ? INDICATOR_STYLES[indicator] : undefined;
  const Logo = SERVICE_LOGOS[slug] ?? FallbackLogo;
  const stripeColor = isLoading || error ? "bg-base-content/10" : (style ?? FALLBACK_STYLE).dot;

  return (
    <div className="card card-border bg-base-200 hover:border-base-content/20 relative flex w-full max-w-[370px] min-w-0 flex-col overflow-hidden shadow-md transition-colors">
      <div className="flex flex-1 flex-row items-center">
        <Link href={`/service/${slug}`} className="card-body min-w-0 flex-1 gap-0 p-4">
          <div className="flex items-center gap-3 text-base-content">
            <Logo size={28} name={name} />
            <h1 className="card-title min-w-0 truncate text-base">{name}</h1>
            {!addState && (
              <div className="ml-auto flex shrink-0 items-center gap-2">
                {isMonitored && (
                  <span className="badge badge-soft badge-info text-[10px]">
                    {t("services.monitoring")}
                  </span>
                )}
                {/* Reserved here (not below the status line) and always
                    rendered — even while loading — so the card's height
                    never changes once data arrives, avoiding layout shift. */}
                <span
                  className={`text-[11px] whitespace-nowrap ${
                    isLoading ? "text-base-content/30 animate-pulse" : "text-base-content/50"
                  }`}
                >
                  {t("serviceCard.outages24h", { count: outages24h ?? 0 })}
                </span>
              </div>
            )}
          </div>

          {!addState && (
            <div className="mt-3 flex items-center gap-2.5">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  isLoading
                    ? "bg-base-content/20 animate-pulse"
                    : error
                      ? "bg-base-content/20"
                      : (style ?? FALLBACK_STYLE).dot
                }`}
              />
              <p
                className={`text-xs font-medium ${
                  error || isLoading ? "text-base-content/50" : (style ?? FALLBACK_STYLE).text
                }`}
              >
                {isLoading
                  ? t("serviceCard.checkingStatus")
                  : error
                    ? t("serviceCard.unreachable")
                    : description}
              </p>
            </div>
          )}
        </Link>

        {addState && (
          <div className="pr-4">
            <button
              type="button"
              disabled={addState.isPending || addState.isAdded}
              onClick={addState.onAdd}
              className={`btn btn-xs ${addState.isAdded ? "btn-success" : "btn-outline btn-info"}`}
            >
              {addState.isPending ? (
                t("addService.adding")
              ) : addState.isAdded ? (
                <>
                  <CheckIcon />
                  {t("addService.added")}
                </>
              ) : (
                t("addService.add")
              )}
            </button>
          </div>
        )}

        {!addState && (
          <div className={`ml-3 w-3 shrink-0 self-stretch ${stripeColor} ${isLoading ? "animate-pulse" : ""}`} aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
