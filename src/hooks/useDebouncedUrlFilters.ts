"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { mergeParams } from "@/lib/mergeParams";

// parse/serialize/toPatch must be stable (module-level) references.
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

  useEffect(() => {
    const serialized = serialize(debounced);
    if (serialized === lastWrittenRef.current) return;
    lastWrittenRef.current = serialized;
    const next = mergeParams(searchParams, toPatch(debounced));
    router.replace(`${path}?${next.toString()}`, { scroll: false });
  }, [debounced, searchParams, router, path, serialize, toPatch]);

  // Only for URL changes we didn't make (back/forward, pasted link).
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
