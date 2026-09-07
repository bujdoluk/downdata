// Chargify (now Maxio) — no public hex found for the legacy Chargify mark;
// kept in the same orange as the prior monogram, an abstract angled "billing
// cycle" arrow rather than a reproduction of Maxio's current wordmark.
export default function ChargifyLogo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#FF6B35" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 15a8 8 0 0 1 14.5-4.7M20 4v5h-5" />
      <path d="M20 9a8 8 0 0 1-14.5 4.7M4 20v-5h5" />
    </svg>
  );
}
