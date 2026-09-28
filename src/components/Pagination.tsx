"use client";

import { useId } from "react";

type PageItem = number | "ellipsis";

// Always exactly 4 slots (outer ones become ellipses on a gap) so the bar's
// width stays constant for any currentPage.
function getMiddleItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages - 2 }, (_, i) => i + 2);
  }

  const w = Math.min(Math.max(currentPage - 2, 2), totalPages - 4);
  return [
    w === 2 ? w : "ellipsis",
    w + 1,
    w + 2,
    w + 3 === totalPages - 1 ? w + 3 : "ellipsis",
  ];
}

export default function Pagination({
  currentPage,
  totalPages,
  onChange,
  label,
  prevLabel,
  nextLabel,
}: {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
  label: string;
  prevLabel: string;
  nextLabel: string;
}) {
  // Unique per instance so two paginations' native radios don't cross-talk.
  const name = useId();

  if (totalPages <= 1) return null;

  const items: PageItem[] = [1, ...getMiddleItems(currentPage, totalPages), totalPages];

  return (
    <nav aria-label={label} className="join mt-4">
      <button
        type="button"
        className="join-item btn btn-sm btn-square"
        disabled={currentPage <= 1}
        onClick={() => onChange(currentPage - 1)}
        aria-label={prevLabel}
      >
        «
      </button>
      {items.map((item, i) =>
        item === "ellipsis" ? (
          <button key={`ellipsis-${i}`} type="button" className="join-item btn btn-sm btn-square" disabled aria-hidden="true">
            …
          </button>
        ) : (
          <input
            key={item}
            type="radio"
            name={name}
            className={`join-item btn btn-sm btn-square ${item === currentPage ? "btn-info" : ""}`}
            aria-label={String(item)}
            checked={item === currentPage}
            onChange={() => onChange(item)}
          />
        ),
      )}
      <button
        type="button"
        className="join-item btn btn-sm btn-square"
        disabled={currentPage >= totalPages}
        onClick={() => onChange(currentPage + 1)}
        aria-label={nextLabel}
      >
        »
      </button>
    </nav>
  );
}
