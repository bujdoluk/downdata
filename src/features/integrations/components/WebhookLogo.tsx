export default function WebhookLogo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`text-base-content ${className ?? ""}`}
    >
      <path d="M8 17a4 4 0 1 1 3-6.6" />
      <circle cx="17" cy="7" r="2.5" />
      <path d="M15 8.3 10 15" />
      <circle cx="8" cy="17" r="2.5" />
      <path d="M12.5 10.5 17 15a2.5 2.5 0 1 1-2 4" />
    </svg>
  );
}
