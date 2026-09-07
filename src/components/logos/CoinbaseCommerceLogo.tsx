// Coinbase Commerce uses Coinbase's own mark (blue circle, white square cutout).
export default function CoinbaseCommerceLogo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#0052FF" />
      <rect x="8.2" y="8.2" width="7.6" height="7.6" rx="2" fill="#fff" />
    </svg>
  );
}
