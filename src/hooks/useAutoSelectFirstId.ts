"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { mergeParams } from "@/lib/mergeParams";

// Only touches `id`, so filters from a shared link survive auto-selection.
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
