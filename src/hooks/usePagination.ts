"use client";

import { useEffect, useRef, useState } from "react";

export function usePagination<T>(items: T[], page: number, pageSize: number) {
  const listRef = useRef<HTMLUListElement>(null);
  const [minListHeight, setMinListHeight] = useState<number>();

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (listRef.current && pageItems.length === pageSize) {
      setMinListHeight(listRef.current.scrollHeight);
    }
  }, [pageItems, pageSize]);

  return { listRef, minListHeight, totalPages, currentPage, pageItems };
}
