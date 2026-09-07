export default function CloverLogo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="#228800" aria-hidden="true">
      <circle cx="9" cy="9" r="4.2" />
      <circle cx="15" cy="9" r="4.2" />
      <circle cx="9" cy="15" r="4.2" />
      <circle cx="15" cy="15" r="4.2" />
      <path d="M11.2 12.8h1.6v8.4h-1.6z" />
    </svg>
  );
}
