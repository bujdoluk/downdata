"use client";

import { useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Service } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/logos";
import FallbackLogo from "@/components/logos/FallbackLogo";

// linkPrefix defaults to the authenticated monitors detail page; the
// public landing navbar passes "/services" instead (see
// app/services/[slug]/page.tsx) — same component, same UI, different
// destination depending on whether the caller has a session.
export default function ServiceSearch({ services, linkPrefix = "/monitors" }: { services: Service[]; linkPrefix?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const trimmed = query.trim();

  const results = trimmed
    ? services.filter((service) =>
        service.name.toLowerCase().startsWith(trimmed.toLowerCase()),
      )
    : [];

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const service = results[highlightedIndex];
      if (service) {
        e.preventDefault();
        router.push(`${linkPrefix}/${service.slug}`);
      }
    } else if (e.key === "Escape") {
      setQuery("");
      setHighlightedIndex(-1);
    }
  }

  return (
    <div className="relative w-56 min-w-56">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlightedIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        placeholder={t("nav.searchPlaceholder")}
        className="input input-bordered input-sm w-full"
      />

      {trimmed && (
        <ul className="menu menu-sm bg-base-100 border-base-300 absolute top-full left-0 z-20 mt-2 w-full flex-nowrap border p-1 shadow-xl">
          {results.length === 0 ? (
            <li className="text-base-content/50 px-3 py-2.5 text-sm">{t("nav.noServicesFound")}</li>
          ) : (
            results.map((service, index) => {
              const Logo = SERVICE_LOGOS[service.slug] ?? FallbackLogo;
              return (
                <li key={service.slug}>
                  <Link
                    href={`${linkPrefix}/${service.slug}`}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`flex items-center gap-2.5 ${index === highlightedIndex ? "menu-focus" : ""}`}
                  >
                    <Logo size={18} name={service.name} />
                    {service.name}
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
