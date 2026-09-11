import type { Indicator } from "@/types/service";
import type { PublicStatusPageService } from "@/features/status-pages/types";

export type BadgeVariant = "status" | "uptime";
export type BadgeTheme = "light" | "dark";
export type BadgeSize = "small" | "medium" | "large";
export type BadgeLayout = "flat" | "card";

// Hex values, not Tailwind classes — an SVG string built server-side has
// no CSS custom properties in scope, so this duplicates globals.css's
// --color-success/warning/error/base-* values rather than reusing
// statusStyles.ts (which only ever returns class names). success/warning/
// error are identical across both themes in globals.css, so only the
// chrome (background/text) needs a light/dark split.
const INDICATOR_HEX: Record<string, string> = {
  none: "#10b981",
  minor: "#eab308",
  major: "#f97316",
  critical: "#ef4444",
};
const FALLBACK_HEX = "#6b7280";

const CHROME_HEX: Record<BadgeTheme, { bg: string; border: string; text: string; muted: string }> = {
  light: { bg: "#ffffff", border: "#d9dee5", text: "#1c222b", muted: "#6b7280" },
  dark: { bg: "#171821", border: "#191b24", text: "#edeef4", muted: "#9ca3af" },
};

// none < minor < major < critical — same ordering this app's incident
// severity already implies everywhere else (INDICATOR_STYLES's own
// listing order, impact filters, etc.), just made explicit here since a
// board-level badge needs one indicator out of several services' worth.
const SEVERITY_ORDER: Indicator[] = ["none", "minor", "major", "critical"];

// The worst indicator across a board's own services — the same "one
// overall state for several things" idea a real status page's own banner
// shows, which this app doesn't otherwise compute anywhere yet (the
// public status page shows per-service rows + counts, no single combined
// value). A service with indicator null (live fetch failed) is excluded
// rather than treated as critical — an unknown is not the same claim as
// a known outage.
export function worstIndicator(services: PublicStatusPageService[]): Indicator {
  let worst: Indicator = "none";
  for (const service of services) {
    if (!service.indicator) continue;
    const rank = SEVERITY_ORDER.indexOf(service.indicator);
    if (rank > SEVERITY_ORDER.indexOf(worst)) worst = service.indicator;
  }
  return worst;
}

// Plain average across the board's services — the same aggregation
// reports' overallUptimePercent already uses (reportGeneration.ts), so
// this isn't a second, inconsistent definition of "board uptime."
export function averageUptime(services: PublicStatusPageService[]): number {
  if (services.length === 0) return 100;
  const sum = services.reduce((total, service) => total + service.official30daysUptime, 0);
  return Math.round((sum / services.length) * 100) / 100;
}

const SIZE_DIMENSIONS: Record<BadgeSize, { height: number; fontSize: number; padX: number; logoSize: number }> = {
  small: { height: 20, fontSize: 10, padX: 6, logoSize: 12 },
  medium: { height: 28, fontSize: 12, padX: 8, logoSize: 16 },
  large: { height: 36, fontSize: 14, padX: 10, logoSize: 20 },
};

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// A single self-contained SVG string — no external fonts/images, so it
// renders identically wherever it's embedded (a README, a site with its
// own CSS, an email client that allows img tags). Two layouts: "flat" is
// a single-color pill (label + value, shields.io-style); "card" is a
// bordered box with the label stacked above the value, closer to a mini
// status widget than a badge.
export function renderBadgeSvg({
  label,
  value,
  indicator,
  theme,
  size,
  layout,
}: {
  label: string;
  value: string;
  // Only the status variant carries a real indicator — the uptime variant
  // always renders in the chrome's neutral text color, not a status color
  // (a "99.98%" figure isn't itself good or bad without a threshold, and
  // this app doesn't ask the viewer to configure one for a public badge).
  indicator: Indicator | null;
  theme: BadgeTheme;
  size: BadgeSize;
  layout: BadgeLayout;
}): string {
  const dims = SIZE_DIMENSIONS[size];
  const chrome = CHROME_HEX[theme];
  const indicatorHex = indicator ? (INDICATOR_HEX[indicator] ?? FALLBACK_HEX) : null;

  const labelText = escapeXml(label);
  const valueText = escapeXml(value);
  const font = "font-family=\"system-ui,-apple-system,Segoe UI,Roboto,sans-serif\"";

  if (layout === "flat") {
    // Two adjoining rects sized by rough character-width estimate — good
    // enough for the short label/value pairs a badge ever carries (no
    // client-side font metrics are available to measure exactly, same
    // constraint every shields.io-style badge generator works under).
    const charWidth = dims.fontSize * 0.6;
    const labelWidth = Math.round(label.length * charWidth) + dims.padX * 2;
    const valueWidth = Math.round(value.length * charWidth) + dims.padX * 2;
    const totalWidth = labelWidth + valueWidth;
    const valueFill = indicatorHex ?? chrome.muted;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${dims.height}" viewBox="0 0 ${totalWidth} ${dims.height}" role="img" aria-label="${labelText}: ${valueText}">
  <rect width="${labelWidth}" height="${dims.height}" fill="${chrome.bg}" />
  <rect x="${labelWidth}" width="${valueWidth}" height="${dims.height}" fill="${valueFill}" />
  <text x="${labelWidth / 2}" y="${dims.height / 2}" ${font} font-size="${dims.fontSize}" fill="${chrome.text}" text-anchor="middle" dominant-baseline="central">${labelText}</text>
  <text x="${labelWidth + valueWidth / 2}" y="${dims.height / 2}" ${font} font-size="${dims.fontSize}" fill="#ffffff" text-anchor="middle" dominant-baseline="central" font-weight="600">${valueText}</text>
</svg>`;
  }

  // "card": a bordered box, label on top (muted, smaller), value below
  // (bold, colored when it's the status variant) — a small dot next to
  // the value for the status variant, matching statusStyles.ts's own
  // dot+label convention used throughout the rest of the app.
  const charWidth = dims.fontSize * 0.62;
  const contentWidth = Math.max(label.length, value.length) * charWidth + (indicatorHex ? dims.logoSize : 0);
  const width = Math.round(contentWidth) + dims.padX * 2;
  const height = dims.height * 1.8;
  const dotRadius = dims.fontSize / 4;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${labelText}: ${valueText}">
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="6" fill="${chrome.bg}" stroke="${chrome.border}" />
  <text x="${dims.padX}" y="${height * 0.36}" ${font} font-size="${dims.fontSize * 0.85}" fill="${chrome.muted}" dominant-baseline="central">${labelText}</text>
  ${indicatorHex ? `<circle cx="${dims.padX + dotRadius}" cy="${height * 0.68}" r="${dotRadius}" fill="${indicatorHex}" />` : ""}
  <text x="${indicatorHex ? dims.padX + dotRadius * 2 + 4 : dims.padX}" y="${height * 0.68}" ${font} font-size="${dims.fontSize}" font-weight="600" fill="${chrome.text}" dominant-baseline="central">${valueText}</text>
</svg>`;
}
