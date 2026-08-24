"use client";

export default function Pagination({
  currentPage,
  totalPages,
  onChange,
  prevLabel,
  nextLabel,
  pageLabel,
}: {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
  prevLabel: string;
  nextLabel: string;
  pageLabel: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="join mt-4">
      <button
        type="button"
        className="btn join-item btn-sm"
        disabled={currentPage <= 1}
        onClick={() => onChange(currentPage - 1)}
        aria-label={prevLabel}
      >
        «
      </button>
      <button type="button" className="btn join-item btn-sm pointer-events-none">
        {pageLabel}
      </button>
      <button
        type="button"
        className="btn join-item btn-sm"
        disabled={currentPage >= totalPages}
        onClick={() => onChange(currentPage + 1)}
        aria-label={nextLabel}
      >
        »
      </button>
    </div>
  );
}
