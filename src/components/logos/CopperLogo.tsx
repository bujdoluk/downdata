// Copper's mark: two overlapping dots symbolizing the connection between
// people and technology, in the brand's eggplant + pink palette.
export default function CopperLogo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="9" cy="12" r="7" fill="#3E1F47" fillOpacity="0.88" />
      <circle cx="15" cy="12" r="7" fill="#FF6EC7" fillOpacity="0.88" />
    </svg>
  );
}
