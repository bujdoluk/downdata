"use client";

import { useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { useCloseDetailsOnOutsideClick } from "@/hooks/useCloseDetailsOnOutsideClick";

// ~400 entries — too many for a bare <select> to be usable. Same problem
// components/service/ServiceSearchPicker.tsx already solves for picking a
// service out of a long list; this mirrors that pattern (details/summary
// dropdown + filtered text search) rather than reaching for a new
// dependency.
const TIME_ZONES = Intl.supportedValuesOf("timeZone");

export default function TimeZonePicker({
  supabase,
  timeZone,
  onChange,
}: {
  supabase: SupabaseClient;
  timeZone: string;
  onChange: (timeZone: string) => void;
}) {
  const { t } = useTranslation();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [query, setQuery] = useState("");
  useCloseDetailsOnOutsideClick(detailsRef);

  const trimmedQuery = query.trim().toLowerCase();
  // UTC pinned first when not searching — the same quick-default shortcut
  // the old plain <select> gave for free; once there's a query it just
  // filters normally.
  const matches = trimmedQuery
    ? TIME_ZONES.filter((tz) => tz.toLowerCase().includes(trimmedQuery))
    : ["UTC", ...TIME_ZONES.filter((tz) => tz !== "UTC")];

  const mutation = useMutation({
    mutationFn: async (next: string) => {
      const { error } = await supabase.auth.updateUser({ data: { time_zone: next } });
      if (error) throw error;
      return next;
    },
    onSuccess: onChange,
  });

  function handleSelect(tz: string) {
    mutation.mutate(tz);
    setQuery("");
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <div>
      <details ref={detailsRef} className="dropdown">
        <summary className="list-none">
          <input
            type="text"
            value={query || timeZone}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={(e) => {
              // Clicking into an <input> nested inside <summary> doesn't
              // reliably trigger <details>'s native click-to-toggle in
              // Chromium — open it explicitly instead of relying on that.
              if (detailsRef.current) detailsRef.current.open = true;
              e.target.select();
            }}
            disabled={mutation.isPending}
            placeholder={t("nav.timezone")}
            aria-label={t("nav.timezone")}
            className="input input-bordered input-sm w-56"
          />
        </summary>
        <ul className="dropdown-content menu menu-sm bg-base-100 border-base-300 z-30 mt-1 max-h-64 w-56 flex-nowrap overflow-y-auto rounded-box border p-1 shadow-xl">
          {matches.length === 0 ? (
            <li className="text-base-content/50 px-3 py-2 text-xs">—</li>
          ) : (
            matches.map((tz) => (
              <li key={tz}>
                <button type="button" onClick={() => handleSelect(tz)}>
                  {tz}
                </button>
              </li>
            ))
          )}
        </ul>
      </details>
      {mutation.isError && <p className="text-error mt-2 text-xs">{t("account.timezoneUpdateFailed")}</p>}
    </div>
  );
}
