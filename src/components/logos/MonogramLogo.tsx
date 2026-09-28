// An original badge, not a reproduction of any trademarked logo.
export default function MonogramLogo({ size = 28, initials, color }: { size?: number; initials: string; color: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <rect width="24" height="24" rx="6" fill={color} />
      <text
        x="12"
        y="12.5"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={initials.length > 1 ? 9 : 11}
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
        fill="#fff"
      >
        {initials}
      </text>
    </svg>
  );
}
