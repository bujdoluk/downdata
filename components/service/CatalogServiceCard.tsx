"use client";

import { useRef } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Indicator } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/service/statusStyles";
import { PinIcon } from "@/components/icons/NavIcons";
import { useCloseDetailsOnOutsideClick } from "@/lib/useCloseDetailsOnOutsideClick";

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
  outages24h,
  isLoading,
  error,
  isMonitored,
  addState,
  removable,
  pinned,
  onTogglePin,
}: {
  slug: string;
  name: string;
  indicator?: Indicator;
  outages24h?: number;
  isLoading: boolean;
  error: boolean;
  isMonitored: boolean;
  addState?: { isPending: boolean; isAdded: boolean; onAdd: () => void };
  removable?: { removing: boolean; onRemove: () => void };
  pinned?: boolean;
  onTogglePin?: () => void;
}) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const style = indicator ? INDICATOR_STYLES[indicator] : undefined;
  const Logo = SERVICE_LOGOS[slug] ?? FallbackLogo;
  const stripeColor = isLoading || error ? "bg-base-content/10" : (style ?? FALLBACK_STYLE).dot;

  useCloseDetailsOnOutsideClick(menuRef);

  return (
    <div className="card card-border bg-base-200 hover:border-base-content/20 relative flex w-full min-w-0 flex-col overflow-hidden shadow-md transition-colors lg:max-w-[370px]">
      {removable && (
        <div className="absolute top-2 right-7 z-10 flex items-center gap-1">
          {onTogglePin && (
            <button
              type="button"
              onClick={onTogglePin}
              aria-label={t(pinned ? "serviceCard.unpin" : "serviceCard.pin")}
              className="btn btn-ghost btn-circle btn-xs text-base-content/60 hover:text-base-content transition-transform hover:scale-110 active:scale-90"
            >
              <PinIcon className="h-4 w-4" filled={pinned} />
            </button>
          )}
          <details ref={menuRef} className="dropdown dropdown-end">
            <summary
              className="btn btn-ghost btn-circle btn-xs list-none transition-transform hover:scale-110 active:scale-90"
              aria-label={t("serviceCard.options")}
            >
              <DotsIcon />
            </summary>
            <ul className="dropdown-content menu menu-sm bg-base-100 border-base-300 z-30 mt-2 w-36 border shadow-xl">
              <li>
                <button type="button" disabled={removable.removing} onClick={removable.onRemove} className="text-error">
                  {removable.removing ? t("serviceCard.removing") : t("serviceCard.remove")}
                </button>
              </li>
            </ul>
          </details>
        </div>
      )}

      <div className="flex flex-1 flex-row items-center">
        <Link href={`/service/${slug}`} className="card-body min-w-0 flex-1 gap-0 p-4">
          <div className="flex items-center gap-3 text-base-content">
            <Logo size={28} name={name} />
            <h1 className="card-title min-w-0 truncate text-base">{name}</h1>
            {!addState && isMonitored && (
              <span className="badge badge-soft badge-info ml-auto shrink-0 text-[10px]">
                {t("services.monitoring")}
              </span>
            )}
          </div>

          {!addState && (
            <div className="mt-3 flex items-center gap-2.5">
              <span
                className={`badge shrink-0 ${
                  isLoading
                    ? `${FALLBACK_STYLE.badge} animate-pulse`
                    : error
                      ? FALLBACK_STYLE.badge
                      : `${(style ?? FALLBACK_STYLE).badge} text-white`
                }`}
              >
                {isLoading
                  ? t("serviceCard.checkingStatus")
                  : error
                    ? t("serviceCard.unreachable")
                    : t((style ?? FALLBACK_STYLE).labelKey)}
              </span>
              <span
                className={`ml-auto shrink-0 text-[11px] whitespace-nowrap ${
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
