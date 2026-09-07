// Contentful's real palette (confirmed via their brand assets) is a signature
// three-color triad — light blue #3AB2E6, gold #FFD75E, coral #F05A65 — used
// across their mascot/mark, not a single flat color.
export default function ContentfulLogo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="9" cy="8.5" r="5" fill="#3AB2E6" />
      <circle cx="16" cy="9.5" r="4.2" fill="#FFD75E" />
      <circle cx="11" cy="16" r="4.6" fill="#F05A65" />
    </svg>
  );
}
