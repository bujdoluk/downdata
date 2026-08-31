"use client";

import { useId } from "react";

type PageItem = number | "ellipsis";

// Pages between the fixed first(1)/last(totalPages) anchors and
// currentPage: currentPage itself (unless it already coincides with an
// anchor, in which case that anchor already represents it — no
// redundant duplicate number next to it), each side flanked by either
// the one hidden page — no point ellipsis-ing away just one — or an
// ellipsis once there's a real gap. Item count is exactly the same
// (first + up to 3 middle + last = up to 5 numbers, plus 2 arrows) for
// any currentPage at least 3 away from both ends, so the bar's width
// stays constant across the vast majority of navigation; it only
// narrows gradually, one item at a time, right at the edges — nothing
// like a sliding window whose item count can double between page 1 and
// a page in the middle of the list.
function getMiddleItems(currentPage: number, totalPages: number): PageItem[] {
  const items: PageItem[] = [];

  const hiddenBefore = currentPage - 2; // pages strictly between 1 and currentPage
  if (hiddenBefore === 1) items.push(currentPage - 1);
  else if (hiddenBefore > 1) items.push("ellipsis");

  if (currentPage !== 1 && currentPage !== totalPages) items.push(currentPage);

  const hiddenAfter = totalPages - currentPage - 1; // pages strictly between currentPage and totalPages
  if (hiddenAfter === 1) items.push(currentPage + 1);
  else if (hiddenAfter > 1) items.push("ellipsis");

  return items;
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
