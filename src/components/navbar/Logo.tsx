export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <rect x="1" y="3" width="4" height="18" rx="2" fill="#10b981" />
      <rect x="7" y="3" width="4" height="18" rx="2" fill="#eab308" />
      <rect x="13" y="3" width="4" height="18" rx="2" fill="#f97316" />
      <rect x="19" y="3" width="4" height="18" rx="2" fill="#ef4444" />
    </svg>
  );
}
