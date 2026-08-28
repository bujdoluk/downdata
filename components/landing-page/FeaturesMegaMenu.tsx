"use client";

import { useRef } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { FEATURE_CATALOG } from "@/lib/featureCatalog";
import { useCloseDetailsOnOutsideClick } from "@/lib/useCloseDetailsOnOutsideClick";

export default function FeaturesMegaMenu() {
  const { t } = useTranslation();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useCloseDetailsOnOutsideClick(detailsRef);

  return (
    <details ref={detailsRef} className="dropdown dropdown-end">
      <summary className="text-base-content/70 hover:text-base-content list-none transition-colors">
        {t("landing.nav.features")}
      </summary>
      <ul className="dropdown-content bg-base-100 border-base-300 z-30 mt-3 grid w-96 list-none grid-cols-1 gap-1 rounded-box border p-2 shadow-xl md:w-[40rem] md:grid-cols-2">
        {FEATURE_CATALOG.map(({ slug, icon: Icon }) => (
          <li key={slug}>
            <Link
              href={`/features/${slug}`}
              onClick={() => {
                if (detailsRef.current) detailsRef.current.open = false;
              }}
              className="hover:bg-base-200 flex items-start gap-3 rounded-lg p-2.5 transition-colors"
            >
              <Icon className="text-primary mt-0.5 h-5 w-5 shrink-0" />
              <span>
                <span className="text-base-content block text-sm font-medium">{t(`nav.${slug}`)}</span>
                <span className="text-base-content/60 mt-0.5 block text-xs leading-snug">
                  {t(`features.${slug}`)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
