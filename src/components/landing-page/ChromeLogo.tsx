// The official Google Chrome logo — hand-drawn to match its real geometry
// (three 120° wedges around a white ring around a blue center dot), same
// "brand-colored, hard-coded fill" convention as SlackLogo/WebhookLogo
// (features/integrations/components/). Shown next to the Chrome extension
// free-tool's install CTA (lib/freeToolsCatalog.ts) — this is the one place
// a real browser's own mark belongs, not this repo's usual hand-drawn
// generic icon style.
export default function ChromeLogo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
      <path d="M24 24 L24 0 A24 24 0 0 1 44.78 36 Z" fill="#EA4335" />
      <path d="M24 24 L44.78 36 A24 24 0 0 1 3.22 36 Z" fill="#FBBC05" />
      <path d="M24 24 L3.22 36 A24 24 0 0 1 24 0 Z" fill="#34A853" />
      <circle cx="24" cy="24" r="14" fill="#fff" />
      <circle cx="24" cy="24" r="9.5" fill="#4285F4" />
    </svg>
  );
}
