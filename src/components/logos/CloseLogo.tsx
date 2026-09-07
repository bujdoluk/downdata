// Close's mark: three interlocking ellipses (close.com/brand) — green, blue,
// and yellow, not a single monochrome color.
export default function CloseLogo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="9" cy="9" r="6" fill="#3ECF8E" opacity="0.85" />
      <circle cx="15" cy="9" r="6" fill="#1463FF" opacity="0.85" />
      <circle cx="12" cy="15" r="6" fill="#FFC53D" opacity="0.85" />
    </svg>
  );
}
