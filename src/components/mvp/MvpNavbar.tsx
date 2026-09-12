"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import Logo from "@/components/navbar/Logo";
import LanguageSwitcher from "@/components/navbar/LanguageSwitcher";
import ThemeToggle from "@/components/navbar/ThemeToggle";
import ServiceSearch from "@/features/monitors/components/ServiceSearch";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import type { Catalog } from "@/types/service";

export default function MvpNavbar() {
  const { data: catalog } = useQuery({
    queryKey: queryKeys.catalogAll(),
    queryFn: () => fetchJson<Catalog[]>("/api/catalog"),
  });

  return (
    <nav className="border-base-300 shrink-0 border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-4">
        <div className="flex items-center gap-6">
          <Link href="/mvp" className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
            <Logo className="h-6 w-6" />
            <span>
              <span className="text-primary">down</span>DATA
            </span>
          </Link>
          {catalog ? (
            <div className="hidden md:block">
              <ServiceSearch services={catalog} linkPrefix="/services" />
            </div>
          ) : (
            // Fixed-size placeholder matching ServiceSearch's own footprint
            // (w-56, input-sm height) — avoids the search box popping into
            // the layout once the shared catalog query resolves.
            <div className="bg-base-200 hidden h-8 w-56 animate-pulse rounded-lg md:block" aria-hidden="true" />
          )}
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
