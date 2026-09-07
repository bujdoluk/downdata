// No official brand color/mark found for Campfire HQ (status.campfirehq.net) —
// an original flame-over-logs mark in the same orange as the prior monogram,
// distinguished from CallFire's plain flame by the log base.
export default function CampfireHqLogo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="#F4511E" aria-hidden="true">
      <path d="M12 3c1 2.6 3.4 4.4 3.4 7.4a3.4 3.4 0 0 1-6.8 0C8.6 7.4 11 5.6 12 3z" />
      <rect x="4" y="17" width="16" height="2" rx="1" />
      <rect x="6" y="20" width="12" height="2" rx="1" />
    </svg>
  );
}
