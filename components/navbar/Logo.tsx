export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <rect x="1" y="3" width="6" height="18" rx="2" fill="#10b981" />
      <rect x="9" y="3" width="6" height="18" rx="2" fill="#eab308" />
      <rect x="17" y="3" width="6" height="18" rx="2" fill="#ef4444" />
    </svg>
  );
}
