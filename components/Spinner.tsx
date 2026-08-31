// One bar per app-logo color (components/navbar/Logo.tsx: green, yellow,
// orange, red), same order and staggered animation as LoadingOverlay —
// this is the one shared "logo bars" implementation, sized down per key
// so the bars stay legible instead of muddy at the smallest sizes.
const BAR_COLORS = ["bg-success", "bg-warning", "bg-accent", "bg-primary"];

const SPINNER_SIZES: Record<"xs" | "sm" | "md" | "lg" | "xl" | "2xl", { heightPx: number; barWidthPx: number; gapPx: number }> = {
  xs: { heightPx: 14, barWidthPx: 2, gapPx: 1.5 },
  sm: { heightPx: 18, barWidthPx: 2.5, gapPx: 2 },
  md: { heightPx: 22, barWidthPx: 3, gapPx: 2 },
  lg: { heightPx: 30, barWidthPx: 4, gapPx: 3 },
  xl: { heightPx: 38, barWidthPx: 5, gapPx: 3.5 },
  // Only used by LoadingOverlay today — matches its previous hand-rolled
  // h-10/w-2.5/gap-1.5 dimensions exactly.
  "2xl": { heightPx: 40, barWidthPx: 10, gapPx: 6 },
};

export default function Spinner({
  size = "sm",
  className = "",
}: {
  size?: keyof typeof SPINNER_SIZES;
  className?: string;
}) {
  const { heightPx, barWidthPx, gapPx } = SPINNER_SIZES[size];
  return (
    <span className={`inline-flex items-end ${className}`} style={{ height: heightPx, gap: gapPx }} aria-hidden="true">
      {BAR_COLORS.map((color, i) => (
        <span
          key={color}
          className={`animate-logo-bars rounded-[1px] ${color}`}
          style={{ width: barWidthPx, height: "100%", animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}
