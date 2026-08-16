"use client";

import { useState } from "react";
import Link from "next/link";
import type { ServiceDefinition } from "@/lib/services";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";

export default function ServiceSearch({ services }: { services: ServiceDefinition[] }) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();

  const results = trimmed
    ? services.filter((service) =>
        service.name.toLowerCase().includes(trimmed.toLowerCase()),
      )
    : [];

  return (
    <div className="relative w-56">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search services…"
        className="w-full border border-black/10 bg-black/5 px-3 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-black/20 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40 dark:focus:border-white/20"
      />

      {trimmed && (
        <ul className="absolute top-full left-0 z-20 mt-2 w-full divide-y divide-black/10 border border-black/10 bg-white shadow-xl dark:divide-white/10 dark:border-white/10 dark:bg-[#0b0d12]">
          {results.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-neutral-500 dark:text-white/50">
              No services found.
            </li>
          ) : (
            results.map((service) => {
              const Logo = SERVICE_LOGOS[service.slug] ?? FallbackLogo;
              return (
                <li key={service.slug}>
                  <Link
                    href={`/service/${service.slug}`}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-neutral-900 transition-colors hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
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
