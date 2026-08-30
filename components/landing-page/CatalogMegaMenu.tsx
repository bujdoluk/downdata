"use client";

import { useRef, type ReactNode } from "react";
import Link from "next/link";
import { useCloseDetailsOnOutsideClick } from "@/lib/useCloseDetailsOnOutsideClick";

export default function CatalogMegaMenu<T extends { slug: string }>({
  label,
  entries,
  hrefPrefix,
  menuClassName,
  renderIcon,
  renderLabel,
  renderDescription,
}: {
  label: string;
  entries: T[];
  hrefPrefix: string;
  menuClassName: string;
  renderIcon: (entry: T) => ReactNode;
  renderLabel: (entry: T) => ReactNode;
  renderDescription: (entry: T) => ReactNode;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useCloseDetailsOnOutsideClick(detailsRef);

  return (
    <details ref={detailsRef} className="dropdown dropdown-end">
      <summary className="text-base-content/70 hover:text-base-content list-none transition-colors">{label}</summary>
      <ul
        className={`dropdown-content bg-base-100 border-base-300 z-30 mt-3 grid list-none grid-cols-1 gap-1 rounded-box border p-2 shadow-xl
          max-xl:fixed max-xl:inset-x-4 max-xl:top-28 max-xl:mt-0 max-xl:w-auto max-xl:max-h-[70vh] max-xl:overflow-y-auto ${menuClassName}`}
      >
        {entries.map((entry) => (
          <li key={entry.slug}>
            <Link
              href={`${hrefPrefix}/${entry.slug}`}
              onClick={() => {
                if (detailsRef.current) detailsRef.current.open = false;
              }}
              className="hover:bg-base-200 flex items-start gap-3 rounded-lg p-2.5 transition-colors"
            >
              {renderIcon(entry)}
              <span>
                <span className="text-base-content block text-sm font-medium">{renderLabel(entry)}</span>
                <span className="text-base-content/60 mt-0.5 block text-xs leading-snug">{renderDescription(entry)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
