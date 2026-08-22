"use client";

import { useRef, useState } from "react";
import type { ServiceDefinition } from "@/types/service";
import { useCloseDetailsOnOutsideClick } from "@/lib/useCloseDetailsOnOutsideClick";

// A <select>'s "pick exactly one from a list" can't come from a bare text
// input, so this is the one service-picker spot that needs an actual small
// combobox instead of just swapping in a search field (see the filter
// inputs in IncidentsPageContent/MaintenancePageContent for that simpler
// case). Built on the same details/summary dropdown idiom already used
// throughout this repo (LanguageSwitcher, BoardsPageContent), not a new
// dependency.
export default function ServiceSearchPicker({
  services,
  value,
  onChange,
  placeholder,
}: {
  services: ServiceDefinition[];
  value: string;
  onChange: (slug: string) => void;
  placeholder: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [query, setQuery] = useState("");
  useCloseDetailsOnOutsideClick(detailsRef);

  const selected = services.find((service) => service.slug === value);
  const trimmedQuery = query.trim().toLowerCase();
  const matches = trimmedQuery
    ? services.filter((service) => service.name.toLowerCase().includes(trimmedQuery))
    : services;

  function handleSelect(service: ServiceDefinition) {
    onChange(service.slug);
    setQuery("");
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <details ref={detailsRef} className="dropdown">
      <summary className="list-none">
        <input
          type="text"
          value={query || selected?.name || ""}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={(e) => {
            // Clicking into an <input> nested inside <summary> doesn't
            // reliably trigger <details>'s native click-to-toggle in
            // Chromium — open it explicitly instead of relying on that.
            if (detailsRef.current) detailsRef.current.open = true;
            e.target.select();
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="input input-bordered input-sm w-56"
        />
      </summary>
      <ul className="dropdown-content menu menu-sm bg-base-100 border-base-300 z-30 mt-1 max-h-64 w-56 flex-nowrap overflow-y-auto rounded-box border p-1 shadow-xl">
        {matches.length === 0 ? (
          <li className="text-base-content/50 px-3 py-2 text-xs">—</li>
        ) : (
          matches.map((service) => (
            <li key={service.slug}>
              <button type="button" onClick={() => handleSelect(service)}>
                {service.name}
              </button>
            </li>
          ))
        )}
      </ul>
    </details>
  );
}
