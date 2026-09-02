import type { CSSProperties } from "react";

// Minimal className joiner — covers what components/BarList.tsx needs
// (conditional strings + a `{class: boolean}` map) without pulling in clsx +
// tailwind-merge for one vendored component. tailwind-merge's actual job is
// resolving conflicting Tailwind classes when a caller overrides a
// component's className; nothing here does that, so it isn't needed.
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

// Shared focus-visible ring for BarList's clickable rows — daisyUI's
// `primary`/`base-200` tokens so it tracks the active theme instead of a
// hardcoded color (Tremor's own version hardcodes `blue-500`).
export const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-200";

// daisyUI's tabs-lift reads the active tab's background from --tab-bg
// (defaults to base-100 unconditionally on every .tab, so it can't be
// overridden by setting the variable on an ancestor — see
// node_modules/daisyui/components/tab.css). Shared by every radio-input
// tabs-lift group in the app so its tab-content panels (bg-base-200) match.
export const TAB_BG_STYLE = { "--tab-bg": "var(--color-base-200)" } as CSSProperties;
