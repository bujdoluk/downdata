"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { ServiceCardProps } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/service/statusStyles";

function DotsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" className={className} aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

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
  const router = useRouter();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [removing, setRemoving] = useState(false);
  const style = indicator ? INDICATOR_STYLES[indicator] : undefined;
  const Logo = SERVICE_LOGOS[slug] ?? FallbackLogo;
  const stripeColor = isLoading || error ? "bg-base-content/10" : (style ?? FALLBACK_STYLE).dot;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        menuRef.current.open = false;
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch(`/api/services/${slug}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        setRemoving(false);
      }
    } catch {
      setRemoving(false);
    }
    if (menuRef.current) menuRef.current.open = false;
  }

  return (
    <div className="card card-border bg-base-200 hover:border-base-content/20 relative flex w-full max-w-[370px] min-w-0 flex-row overflow-hidden shadow-md transition-colors">
      <Link href={`/service/${slug}`} className="card-body min-w-0 flex-1 gap-0 p-4">
        <div className="flex items-center gap-3 pr-6 text-base-content">
          <Logo size={28} name={name} />
          <h1 className="card-title min-w-0 truncate text-base">{name}</h1>
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
      </Link>

      <div className="absolute top-2 right-[calc(10%+0.4rem)] z-10">
        <details ref={menuRef} className="dropdown dropdown-end">
          <summary
            className="btn btn-ghost btn-circle btn-xs list-none"
            aria-label={t("serviceCard.options")}
          >
            <DotsIcon />
          </summary>
          <ul className="dropdown-content menu menu-sm bg-base-100 border-base-300 z-30 mt-2 w-36 border shadow-xl">
            <li>
              <button type="button" disabled={removing} onClick={handleRemove} className="text-error">
                {removing ? t("serviceCard.removing") : t("serviceCard.remove")}
              </button>
            </li>
          </ul>
        </details>
      </div>

      <div className={`w-[10%] shrink-0 ${stripeColor} ${isLoading ? "animate-pulse" : ""}`} aria-hidden="true" />
    </div>
  );
}
