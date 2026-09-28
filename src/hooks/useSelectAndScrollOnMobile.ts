"use client";

import type { RefObject } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { mergeParams } from "@/lib/mergeParams";

// Below lg the detail pane stacks under the list and would change off-screen.
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
