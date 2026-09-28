import type { CSSProperties } from "react";

// Minimal className joiner: BarList needs no conflict resolution, so no clsx/tailwind-merge.
export function cx(...args: Array<string | false | null | undefined | Record<string, boolean>>): string {
  const classes: string[] = [];
  for (const arg of args) {
    if (!arg) continue;
    if (typeof arg === "string") {
      classes.push(arg);
    } else {
      for (const [key, value] of Object.entries(arg)) {
        if (value) classes.push(key);
      }
    }
  }
  return classes.join(" ");
}

// daisyUI tokens so it follows the theme (Tremor hardcodes blue-500).
export const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-200";

// daisyUI's .tab resets --tab-bg on itself, so an ancestor can't override it.
// `as`: CSSProperties has no index signature for custom properties.
export const TAB_BG_STYLE = { "--tab-bg": "var(--color-surface-1)" } as CSSProperties;
