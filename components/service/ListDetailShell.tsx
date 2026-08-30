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
}: {
  title: string;
  subtitle: string;
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
}) {
  return (
    <div className="w-full self-start">
      <h1 className="text-xl font-semibold text-base-content">{title}</h1>
      <p className="text-base-content/60 mt-1 text-sm">{subtitle}</p>

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
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>{filters}{list}</div>
          <div ref={detailRef} className="card card-border bg-base-200 p-4">
            {detail}
          </div>
        </div>
      )}
    </div>
  );
}
