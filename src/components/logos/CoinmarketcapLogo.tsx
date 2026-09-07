// CoinMarketCap's app icon: a white zigzag "M" mark on a solid blue background.
export default function CoinmarketcapLogo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#1652F0" />
      <path d="M4.75 16.75V7.5l3.7 4.2L12 8l3.55 3.7 3.7-4.2v9.25h-2.1v-5.3l-2.45 2.85L12 11.5l-2.7 2.85-2.45-2.85v5.25z" fill="#fff" />
    </svg>
  );
}
