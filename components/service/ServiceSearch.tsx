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
        className="input input-bordered input-sm w-full"
      />

      {trimmed && (
        <ul className="menu menu-sm bg-base-100 border-base-300 absolute top-full left-0 z-20 mt-2 w-full flex-nowrap border p-1 shadow-xl">
          {results.length === 0 ? (
            <li className="text-base-content/50 px-3 py-2.5 text-sm">No services found.</li>
          ) : (
            results.map((service) => {
              const Logo = SERVICE_LOGOS[service.slug] ?? FallbackLogo;
              return (
                <li key={service.slug}>
                  <Link href={`/service/${service.slug}`} className="flex items-center gap-2.5">
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
