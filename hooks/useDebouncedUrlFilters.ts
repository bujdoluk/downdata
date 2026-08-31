"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { mergeParams } from "@/lib/mergeParams";

// "Debounced filter state, synced to the URL" was duplicated near-identically
// between Incidents and Maintenance page content: parse/serialize/patch are
// page-specific (different filter fields), but the debounce-then-write and
// read-external-change effects, and the loop-prevention fingerprint ref,
// were byte-identical. parse/serialize/toPatch must be stable references
// (module-level functions, not redefined per render) — both callers already
// define them that way.
export function useDebouncedUrlFilters<T>({
  path,
  parse,
  serialize,
  toPatch,
  debounceMs = 300,
}: {
  path: string;
  parse: (searchParams: URLSearchParams) => T;
  serialize: (value: T) => string;
  toPatch: (value: T) => Record<string, string | null>;
  debounceMs?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [pendingFilters, setPendingFilters] = useState<T>(() => parse(searchParams));
  const lastWrittenRef = useRef(serialize(pendingFilters));
  const debounced = useDebouncedValue(pendingFilters, debounceMs);

  // pendingFilters -> URL, only once it's settled for debounceMs.
  useEffect(() => {
    const serialized = serialize(debounced);
    if (serialized === lastWrittenRef.current) return;
    lastWrittenRef.current = serialized;
    const next = mergeParams(searchParams, toPatch(debounced));
    router.replace(`${path}?${next.toString()}`, { scroll: false });
  }, [debounced, searchParams, router, path, serialize, toPatch]);

  // URL -> pendingFilters, for changes we didn't just make ourselves
  // (back/forward button, a pasted link with filters already in it).
  useEffect(() => {
    const parsed = parse(searchParams);
    const serialized = serialize(parsed);
    if (serialized === lastWrittenRef.current) return;
    lastWrittenRef.current = serialized;
    setPendingFilters(parsed);
  }, [searchParams, parse, serialize]);

  function updateParams(patch: Record<string, string | null>) {
    router.replace(`${path}?${mergeParams(searchParams, patch).toString()}`, { scroll: false });
  }

  return { pendingFilters, setPendingFilters, updateParams, searchParams, router };
}
