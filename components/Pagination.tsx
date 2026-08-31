"use client";

import { useId } from "react";

type PageItem = number | "ellipsis";

// Pages between the fixed first(1)/last(totalPages) anchors: a 4-page
// window slid to stay centered on currentPage but clamped so it never
// overlaps either anchor. The two inner slots are always plain numbers;
// each outer slot independently renders as a number when it's adjacent
// to its anchor, or an ellipsis when there's a real gap — either way the
// slot is always filled, never omitted. That keeps the window at exactly
// 4 items (so the bar's total width is exactly constant) for any
// currentPage, including right at the edges, where the old version used
// to drop a slot entirely and visibly narrow the bar.
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
  // Unique per mounted instance — same-named native radios would
  // otherwise cross-talk (selecting a page in one instance visually
  // deselects another) if this component were ever rendered twice on one
  // page at once.
  const name = useId();

  if (totalPages <= 1) return null;

  // 1 and totalPages double as one-click jump-to-first/jump-to-last —
  // they're always rendered anyway, so no separate «« »» buttons needed.
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
