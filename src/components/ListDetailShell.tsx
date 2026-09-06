"use client";

import type { ReactNode, RefObject } from "react";
import Spinner from "@/components/Spinner";

// Shared "title/subtitle → loading/error/empty → two-column list+detail"
// scaffold behind /incidents and /maintenance — both pages keep their own
// filter state, list-item markup, and detail-pane resolution, and just pass
// the already-built pieces in here.
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
}: {
  title: string;
  subtitle: string;
  // Content that always renders regardless of loading/error/empty state —
  // e.g. Early Warnings' keyword/source settings panel, which must stay
  // visible even with zero matches yet, unlike `filters` below (which
  // only makes sense once there's a list to filter).
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
  // Rendered as its own centered row below the list/detail grid, not
  // inside `list` — so it stays centered regardless of how tall or narrow
  // the list column is.
  pagination?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl self-start">
      <h1 className="text-xl font-semibold text-base-content">{title}</h1>
      <p className="text-base-content/60 mt-1 text-sm">{subtitle}</p>
      {header}

      {isLoading ? (
        <p className="text-base-content/50 mt-4 flex items-center gap-2 text-sm">
          <Spinner size="sm" />
          {loadingLabel}
        </p>
      ) : isError ? (
        <p className="text-base-content/50 mt-4 text-sm">{unreachableLabel}</p>
      ) : isEmpty ? (
        <p className="text-base-content/50 mt-4 text-sm">{emptyLabel}</p>
      ) : (
        <>
          <div className="mt-4">{filters}</div>
          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>{list}</div>
            <div ref={detailRef} className="card card-border bg-base-200 p-4">
              {detail}
            </div>
          </div>
          {pagination && <div className="mt-4 flex justify-center">{pagination}</div>}
        </>
      )}
    </div>
  );
}
