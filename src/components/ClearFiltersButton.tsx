"use client";

export default function ClearFiltersButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="btn btn-ghost btn-xs">
      {label}
    </button>
  );
}
