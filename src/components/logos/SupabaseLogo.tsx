import { useId } from "react";

export default function SupabaseLogo({ size = 28 }: { size?: number }) {
  // Scoped per-instance so multiple logos on one page (grid + search
  // results + navbar) don't collide on the same gradient id.
  const gradientTop = useId();
  const gradientBottom = useId();

  return (
    <svg viewBox="0 0 109 113" width={size} height={size} fill="none" aria-hidden="true">
      <path
        d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.315L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.869 55.9374L63.7076 110.284Z"
        fill={`url(#${gradientTop})`}
      />
      <path
        d="M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.04075L54.4849 72.2922H9.83113C1.64038 72.2922 -2.92775 62.8321 2.15517 56.4175L45.317 2.07103Z"
        fill={`url(#${gradientBottom})`}
      />
      <defs>
        <linearGradient id={gradientTop} x1="53.9738" y1="54.974" x2="94.1635" y2="71.8295" gradientUnits="userSpaceOnUse">
          <stop stopColor="#249361" />
          <stop offset="1" stopColor="#3ECF8E" />
        </linearGradient>
        <linearGradient id={gradientBottom} x1="36.1558" y1="30.578" x2="54.4844" y2="65.0806" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3ECF8E" />
          <stop offset="1" stopColor="#3ECF8E" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
