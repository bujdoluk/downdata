// Used for any service without a hand-crafted logo (i.e. anything added
// at runtime from the catalog on the home page) — a monogram of its first letter.
export default function FallbackLogo({ size = 28, name }: { size?: number; name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      className="border-base-300 bg-base-300 text-base-content/70 flex shrink-0 items-center justify-center border font-semibold"
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}
