"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import type { Service } from "@/types/service";
import { useCloseDetailsOnOutsideClick } from "@/hooks/useCloseDetailsOnOutsideClick";

export default function ServiceSearchPicker({
  services,
  value,
  onChange,
  placeholder,
}: {
  services: Service[];
  value: string;
  onChange: (slug: string) => void;
  placeholder: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  useCloseDetailsOnOutsideClick(detailsRef);

  const selected = services.find((service) => service.slug === value);
  const trimmedQuery = query.trim().toLowerCase();
  const matches = trimmedQuery
    ? services.filter((service) => service.name.toLowerCase().startsWith(trimmedQuery))
    : services;

  function handleSelect(service: Service) {
    onChange(service.slug);
    setQuery("");
    setHighlightedIndex(-1);
    if (detailsRef.current) detailsRef.current.open = false;
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const service = matches[highlightedIndex];
      if (service) {
        e.preventDefault();
        handleSelect(service);
      }
    } else if (e.key === "Escape") {
      setHighlightedIndex(-1);
      if (detailsRef.current) detailsRef.current.open = false;
    }
  }

  return (
    <details ref={detailsRef} className="dropdown">
      <summary className="list-none">
        <input
          type="text"
          value={query || selected?.name || ""}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlightedIndex(-1);
          }}
          onFocus={(e) => {
            // Chromium doesn't reliably toggle <details> from an input inside <summary>.
            if (detailsRef.current) detailsRef.current.open = true;
            e.target.select();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          className="input input-bordered input-sm w-56"
        />
      </summary>
      <ul className="dropdown-content menu menu-sm border-base-300 z-30 mt-1 max-h-64 w-56 flex-nowrap overflow-y-auto rounded-box border bg-[var(--color-surface-2)] p-1 shadow-xl">
        {matches.length === 0 ? (
          <li className="text-base-content/50 px-3 py-2 text-xs">—</li>
        ) : (
          matches.map((service, index) => (
            <li key={service.slug}>
              <button
                type="button"
                onClick={() => handleSelect(service)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={index === highlightedIndex ? "menu-focus" : ""}
              >
                {service.name}
              </button>
            </li>
          ))
        )}
      </ul>
    </details>
  );
}
