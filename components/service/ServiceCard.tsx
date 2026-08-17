"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { ServiceCardProps } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/service/statusStyles";


export default function ServiceCard({
  slug,
  name,
  indicator,
  description,
  outages24h,
  isLoading,
  error,
}: ServiceCardProps) {
  const { t } = useTranslation();
  const style = indicator ? INDICATOR_STYLES[indicator] : undefined;
  const Logo = SERVICE_LOGOS[slug] ?? FallbackLogo;
  const stripeColor = isLoading || error ? "bg-base-content/10" : (style ?? FALLBACK_STYLE).dot;

  return (
    <Link
      href={`/service/${slug}`}
      className="card card-border bg-base-200 hover:border-base-content/20 flex w-96 flex-row overflow-hidden shadow-md transition-colors"
    >
      <div className="card-body min-w-0 flex-1 gap-0 p-4">
        <div className="flex items-center gap-3 text-base-content">
          <Logo size={28} name={name} />
          <h1 className="card-title text-base">{name}</h1>
        </div>

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

        {!isLoading && !error && outages24h !== undefined && (
          <p className="text-base-content/50 mt-2 text-[11px]">
            {t("serviceCard.outages24h", { count: outages24h })}
          </p>
        )}
      </div>

      {/* Right 10% strip — color cue for current status. Full detail
          (components, incident history) stays on the detail page. */}
      <div className={`w-[10%] shrink-0 ${stripeColor} ${isLoading ? "animate-pulse" : ""}`} aria-hidden="true" />
    </Link>
  );
}
