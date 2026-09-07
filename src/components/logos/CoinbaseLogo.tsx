// Coinbase's current mark: a blue circle with a centered white rounded-square
// cutout, leaving a "C" in negative space.
export default function CoinbaseLogo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#0052FF" />
      <rect x="8.2" y="8.2" width="7.6" height="7.6" rx="2" fill="#fff" />
    </svg>
  );
}
