"use client";

import type { RefObject } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { mergeParams } from "@/lib/mergeParams";

// Identical select-and-scroll behavior was duplicated between Incidents
// and Maintenance page content, differing only in `path`. Below the lg
// breakpoint the list and detail stack vertically — without the scroll,
// picking a row near the top of the list leaves the detail pane rendering
// off-screen with nothing to indicate it changed.
export function useSelectAndScrollOnMobile(path: string, detailRef: RefObject<HTMLDivElement | null>) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return function select(id: string) {
    const next = mergeParams(searchParams, { id });
    router.push(`${path}?${next.toString()}`, { scroll: false });
    if (window.innerWidth < 1024) {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
}
