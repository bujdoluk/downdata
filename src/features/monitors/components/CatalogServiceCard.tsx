"use client";

import { useRef } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Indicator, OpenIncidentImpact } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/logos";
import FallbackLogo from "@/components/logos/FallbackLogo";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/statusStyles";
import MoreSevereIncidentBadge from "@/components/MoreSevereIncidentBadge";
import { useCloseDetailsOnOutsideClick } from "@/hooks/useCloseDetailsOnOutsideClick";
import Spinner from "@/components/Spinner";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function DotsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" className={className} aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

export default function CatalogServiceCard({
  slug,
  name,
  indicator,
  openIncidentImpact,
  outages24h,
  isLoading,
  error,
  isMonitored,
  addState,
  removable,
  isFullWidth = false,
  isElevatedBg = false,
}: {
  slug: string;
  name: string;
  indicator?: Indicator;
  openIncidentImpact?: OpenIncidentImpact;
  outages24h?: number;
  isLoading: boolean;
  error: boolean;
  isMonitored: boolean;
  addState?: { isPending: boolean; isAdded: boolean; onAdd: () => void };
  removable?: { removing: boolean; onRemove: () => void };
  // Drops the 370px cap so the card fills a 2-up grid track.
  isFullWidth?: boolean;
  // Uses surface-2 for cards inside a surface-1 panel, where base-200 would blend in.
  isElevatedBg?: boolean;
}) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const style = indicator ? INDICATOR_STYLES[indicator] : undefined;
  const Logo = SERVICE_LOGOS[slug] ?? FallbackLogo;
  const stripeColor = isLoading || error ? "bg-base-content/10" : (style ?? FALLBACK_STYLE).dot;
  // The color stripe is the only status indicator, so it needs an accessible name.
  const statusLabel = isLoading ? t("serviceCard.checkingStatus") : error ? t("serviceCard.unreachable") : t((style ?? FALLBACK_STYLE).labelKey);

  useCloseDetailsOnOutsideClick(menuRef);

  return (
    <div
      className={`card card-border hover:border-base-content/20 relative flex w-full min-w-0 flex-col shadow-md transition-colors ${isElevatedBg ? "bg-[var(--color-surface-2)]" : "bg-base-200"} ${isFullWidth ? "" : "lg:max-w-[370px]"}`}
    >
      {removable && (
        <div className="absolute top-2 right-7 z-10 flex items-center gap-1">
          <details ref={menuRef} className="dropdown dropdown-end">
            <summary
              className="btn btn-ghost btn-circle btn-xs list-none transition-transform hover:scale-110 active:scale-90"
              aria-label={t("serviceCard.options")}
            >
              <DotsIcon />
            </summary>
            <ul className="dropdown-content menu menu-sm bg-[var(--color-surface-2)] border-base-300 z-30 mt-2 w-36 border shadow-xl">
              <li>
                <button type="button" disabled={removable.removing} onClick={removable.onRemove} className="text-error">
                  {removable.removing ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Spinner size="xs" />
                      {t("serviceCard.removing")}
                    </span>
                  ) : (
                    t("serviceCard.remove")
                  )}
                </button>
              </li>
            </ul>
          </details>
        </div>
      )}

      {/* Outside the overflow-hidden row: an overflow-hidden ancestor clips daisyUI tooltips regardless of z-index. */}
      {!addState && openIncidentImpact && (
        // right-7 clears the 12px status stripe.
        <div className="absolute right-7 bottom-2 z-20">
          <MoreSevereIncidentBadge incident={openIncidentImpact} iconClassName="h-6 w-6" />
        </div>
      )}

      {/* Clips only this row (the stripe's corners); on the card it would clip the menu and tooltip. */}
      <div className="flex flex-1 flex-row items-center overflow-hidden rounded-[inherit]">
        <Link href={`/monitors/${slug}`} className="card-body min-w-0 flex-1 gap-0 p-4">
          <div className="flex items-center gap-3 text-base-content">
            <Logo size={28} name={name} />
            <h3 className="card-title min-w-0 truncate text-base">{name}</h3>
            {!addState && isMonitored && (
              <span className="badge badge-soft badge-info ml-auto shrink-0 text-[10px]">
                {t("services.monitoring")}
              </span>
            )}
          </div>

          {!addState && (
            <div className="mt-3 flex items-center gap-2.5">
              <span
                className={`shrink-0 text-[11px] whitespace-nowrap ${
                  isLoading ? "text-base-content/30 animate-pulse" : "text-base-content/50"
                }`}
              >
                {t("serviceCard.outages24h", { count: outages24h ?? 0 })}
              </span>
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
                <span className="inline-flex items-center gap-1.5">
                  <Spinner size="xs" />
                  {t("addService.adding")}
                </span>
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
          <div
            role="img"
            aria-label={statusLabel}
            className={`ml-3 w-3 shrink-0 self-stretch ${stripeColor} ${isLoading ? "animate-pulse" : ""}`}
          />
        )}
      </div>
    </div>
  );
}
