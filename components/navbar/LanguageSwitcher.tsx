"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { languages, getLanguage } from "@/lib/i18n/languages";

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const current = getLanguage(i18n.language);
  const CurrentFlag = current.flag;

  // Apply a previously-saved choice once mounted — the server always
  // renders the default (English) since localStorage isn't available
  // during SSR, so returning non-English users see a brief correction on
  // load rather than a flash-free switch (same tradeoff accepted for the
  // theme toggle, but text content can't be solved the same CSS-only way).
  useEffect(() => {
    try {
      const saved = localStorage.getItem("language");
      if (saved && saved !== i18n.language) i18n.changeLanguage(saved);
    } catch {
      // ignore
    }
  }, [i18n]);

  function handleChange(code: string) {
    i18n.changeLanguage(code);
    try {
      localStorage.setItem("language", code);
    } catch {
      // ignore
    }
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <details ref={detailsRef} className="dropdown dropdown-end">
      <summary
        className="btn btn-ghost btn-circle btn-sm list-none"
        aria-label={t("nav.language")}
        title={current.name}
      >
        <span className="block h-5 w-5 overflow-hidden rounded-full">
          <CurrentFlag className="h-full w-full" />
        </span>
      </summary>
      <ul className="dropdown-content bg-base-100 border-base-300 z-30 mt-2 grid w-40 list-none grid-cols-4 gap-2 rounded-box border p-3 shadow-xl">
        {languages.map((language) => {
          const Flag = language.flag;
          const isActive = language.code === current.code;
          return (
            <li key={language.code}>
              <button
                type="button"
                onClick={() => handleChange(language.code)}
                aria-label={language.name}
                title={language.name}
                className={`block h-7 w-7 overflow-hidden rounded-full transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  isActive ? "ring-primary ring-2" : "hover:ring-base-content/30 hover:ring-2"
                }`}
              >
                <Flag className="h-full w-full" />
              </button>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
