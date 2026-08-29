"use client";

import { useRef } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { INTEGRATION_CATALOG } from "@/lib/integrationCatalog";
import { useCloseDetailsOnOutsideClick } from "@/lib/useCloseDetailsOnOutsideClick";

export default function IntegrationsMegaMenu() {
  const { t } = useTranslation();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useCloseDetailsOnOutsideClick(detailsRef);

  return (
    <details ref={detailsRef} className="dropdown dropdown-end">
      <summary className="text-base-content/70 hover:text-base-content list-none transition-colors">
        {t("nav.integrations")}
      </summary>
      <ul
        className="dropdown-content bg-base-100 border-base-300 z-30 mt-3 grid w-72 list-none grid-cols-1 gap-1 rounded-box border p-2 shadow-xl
          max-xl:fixed max-xl:inset-x-4 max-xl:top-28 max-xl:mt-0 max-xl:w-auto max-xl:max-h-[70vh] max-xl:overflow-y-auto"
      >
        {INTEGRATION_CATALOG.map(({ slug, logo: Logo }) => (
          <li key={slug}>
            <Link
              href={`/integrations/${slug}`}
              onClick={() => {
                if (detailsRef.current) detailsRef.current.open = false;
              }}
              className="hover:bg-base-200 flex items-start gap-3 rounded-lg p-2.5 transition-colors"
            >
              <Logo size={24} className="mt-0.5 shrink-0" />
              <span>
                <span className="text-base-content block text-sm font-medium">{t(`nav.${slug}`)}</span>
                <span className="text-base-content/60 mt-0.5 block text-xs leading-snug">{t(`features.${slug}`)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
