// Crypto.com's mark: a nested hexagon/shield, in the brand's dark blue with
// a lighter blue accent.
export default function CryptoComLogo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M12 2 20.5 7v10L12 22 3.5 17V7Z" fill="#002967" />
      <path d="M12 6 16.5 8.5v7L12 18l-4.5-2.5v-7Z" fill="#1199FA" />
    </svg>
  );
}
