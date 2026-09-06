"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { mergeParams } from "@/lib/mergeParams";

// Auto-selects the first *visible* item, and only ever touches `id` —
// merged into the existing query string so a filter set from a shared link
// survives landing on the page with nothing selected yet. Was duplicated
// identically between Incidents and Maintenance page content, save for
// `path` and which filtered list they're selecting out of.
export function useAutoSelectFirstId(path: string, selectedId: string | null, items: { id: string }[]) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!selectedId && items.length > 0) {
      const next = mergeParams(searchParams, { id: items[0]!.id });
      router.replace(`${path}?${next.toString()}`, { scroll: false });
    }
  }, [selectedId, items, searchParams, router, path]);
}
