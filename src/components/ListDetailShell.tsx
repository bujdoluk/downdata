"use client";

import type { ReactNode, RefObject } from "react";
import Spinner from "@/components/Spinner";

export default function ListDetailShell({
  title,
  subtitle,
  header,
  isLoading,
  isError,
  isEmpty,
  loadingLabel,
  unreachableLabel,
  emptyLabel,
  filters,
  list,
  detailRef,
  detail,
  pagination,
  listColumnWidth = "half",
}: {
  title: string;
  subtitle: string;
  // Always rendered, even when loading, erroring or empty (unlike `filters`).
  header?: ReactNode;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  loadingLabel: string;
  unreachableLabel: string;
  emptyLabel: string;
  filters: ReactNode;
  list: ReactNode;
  detailRef: RefObject<HTMLDivElement | null>;
  detail: ReactNode;
  // Below the grid, not inside `list`, so it stays centered.
  pagination?: ReactNode;
  // "third" gives short list rows 1/3 and a wide detail pane 2/3 (e.g. /status-pages).
  listColumnWidth?: "half" | "third";
}) {
  return (
    <div className="mx-auto w-full max-w-6xl self-start">
      <h1 className="text-xl font-semibold text-base-content">{title}</h1>
      <p className="text-base-content/60 mt-1 text-sm">{subtitle}</p>
      {header}

      {isLoading ? (
        <div className="mt-4 flex min-h-64 flex-col items-center justify-center gap-3">
          <Spinner size="xl" />
          <p className="text-base-content/50 text-sm">{loadingLabel}</p>
        </div>
      ) : isError ? (
        <p className="text-base-content/50 mt-4 text-sm">{unreachableLabel}</p>
      ) : isEmpty ? (
        <p className="text-base-content/50 mt-4 text-sm">{emptyLabel}</p>
      ) : (
        <>
          <div className="mt-4">{filters}</div>
          <div className={`mt-4 grid grid-cols-1 gap-6 ${listColumnWidth === "third" ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
            <div className={listColumnWidth === "third" ? "lg:col-span-1" : undefined}>{list}</div>
            <div ref={detailRef} className={`card card-border bg-base-200 p-4 ${listColumnWidth === "third" ? "lg:col-span-2" : ""}`}>
              {detail}
            </div>
          </div>
          {pagination && <div className="mt-4 flex justify-center">{pagination}</div>}
        </>
      )}
    </div>
  );
}
