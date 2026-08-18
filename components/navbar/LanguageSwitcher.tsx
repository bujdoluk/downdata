"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { languages, getLanguage } from "@/lib/i18n/languages";

export default function LanguageSwitcher({
  dropdownClassName = "dropdown-end",
}: {
  dropdownClassName?: string;
}) {
  const { t, i18n } = useTranslation();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const current = getLanguage(i18n.language);
  const CurrentFlag = current.flag;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("language");
      if (saved && saved !== i18n.language) i18n.changeLanguage(saved);
    } catch {
      // ignore
    }
  }, [i18n]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) {
        detailsRef.current.open = false;
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <details ref={detailsRef} className={`dropdown ${dropdownClassName}`}>
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
                className={`block h-7 w-7 overflow-hidden rounded-full transition-transform duration-200 ease-out hover:z-10 hover:scale-125 focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none ${
                  isActive ? "ring-primary ring-2" : ""
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
