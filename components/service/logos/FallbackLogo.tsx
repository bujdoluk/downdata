// Used for any service without a hand-crafted logo (i.e. anything added
// at runtime through /add-service) — a monogram of its first letter.
export default function FallbackLogo({ size = 28, name }: { size?: number; name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      className="flex shrink-0 items-center justify-center border border-black/10 bg-black/10 font-semibold text-neutral-600 dark:border-white/10 dark:bg-white/10 dark:text-white/70"
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}
