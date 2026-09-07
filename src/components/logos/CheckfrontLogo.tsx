// Checkfront — booking/reservation platform; an original calendar-with-check
// mark in the prior monogram's blue (no official hex was findable).
export default function CheckfrontLogo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#2C97DE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18M8 8V3M16 8V3" />
      <path d="M8 14l2.3 2.3L16.5 10.5" />
    </svg>
  );
}
