"use client";

import { PinIcon } from "@/components/icons/NavIcons";

// The pin toggle button itself was identical between Incidents and
// Maintenance list items (icon, hover/active transforms, filled state) —
// only its aria-label and position/size classes differed, so those stay
// caller-supplied rather than baked in here.
export default function PinButton({
  pinned,
  onToggle,
  ariaLabel,
  className = "",
  iconClassName = "h-4 w-4",
}: {
  pinned: boolean;
  onToggle: () => void;
  ariaLabel: string;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={ariaLabel}
      className={`text-base-content/40 hover:text-base-content transition-transform hover:scale-110 active:scale-90 ${className}`}
    >
      <PinIcon className={iconClassName} filled={pinned} />
    </button>
  );
}
