// Chili Piper's own mark is a stylized chili pepper (their name and mascot) —
// hand-drawn as a simple original curved-pod shape, not a trademark reproduction.
// Brand palette confirmed via chilipiper.com/company-utilities/logo-pack:
// orange #FF5722 + electric violet #533DFF (not green).
export default function ChiliPiperLogo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d="M9.5 3.2c1.6-1.6 3.4-2.4 4.3-1.5.8.8.4 2.2-.6 3.5 2.6.2 5 2.1 5.6 5 .8 4-1.9 8.6-5.9 10.4-3.9 1.8-8 .5-9.5-2.9C1.9 14.6 3.4 10.5 7 8c1.3-.9 2.9-1.3 4.2-1.2-1-1.3-2.7-2.6-1.7-3.6z"
        fill="#FF5722"
      />
      <path
        d="M9.5 3.2c1.6-1.6 3.4-2.4 4.3-1.5.6.6.5 1.6-.1 2.6-.6-.5-1.6-.6-2.7.1-.9.6-1.4 1.4-1.5 2.1a5.9 5.9 0 0 0-2.5.4c-1-1.3-2.6-2.6-1.6-3.7.9-.9 2.8-.4 4.1 1z"
        fill="#533DFF"
      />
    </svg>
  );
}
