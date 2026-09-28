import { NextResponse } from "next/server";
import { getPublicStatusPage, resolveStatusPageAccess } from "@/features/status-pages/services/statusPages";
import {
  averageUptime,
  renderBadgeSvg,
  renderLockedBadgeSvg,
  worstIndicator,
  type BadgeLayout,
  type BadgeSize,
  type BadgeTheme,
  type BadgeVariant,
} from "@/features/status-pages/services/badge";
import { isProtectionConfigured } from "@/features/status-pages/services/passwordProtection";

// Public: getPublicStatusPage's `enabled` check is the whole authorization. Stateless by design,
// all options live in the query string so a pasted embed URL always renders the same.
const VALID_VARIANTS: BadgeVariant[] = ["status", "uptime"];
const VALID_THEMES: BadgeTheme[] = ["light", "dark"];
const VALID_SIZES: BadgeSize[] = ["small", "medium", "large"];
const VALID_LAYOUTS: BadgeLayout[] = ["flat", "card"];

const STATUS_LABEL: Record<string, string> = { none: "Operational", minor: "Minor", major: "Major", critical: "Critical" };

// An SVG, not the usual JSON error: the consumer is always an <img> tag, which can't render JSON.
function notFoundSvg(): NextResponse {
  const svg = renderBadgeSvg({ label: "status", value: "not found", indicator: null, theme: "light", size: "small", layout: "flat" });
  return new NextResponse(svg, { status: 404, headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=60" } });
}

// Always "private": a shared cache could keep serving this 403 to a visitor who has since been unlocked.
function lockedSvg(theme: BadgeTheme, size: BadgeSize, layout: BadgeLayout): NextResponse {
  const svg = renderLockedBadgeSvg({ theme, size, layout });
  return new NextResponse(svg, { status: 403, headers: { "Content-Type": "image/svg+xml", "Cache-Control": "private, max-age=60" } });
}

export async function GET(request: Request, { params }: { params: Promise<{ boardSlug: string }> }) {
  const { boardSlug } = await params;
  const url = new URL(request.url);

  const variantParam = url.searchParams.get("type") ?? "status";
  const themeParam = url.searchParams.get("theme") ?? "light";
  const sizeParam = url.searchParams.get("size") ?? "medium";
  const layoutParam = url.searchParams.get("layout") ?? "flat";
  const variant = VALID_VARIANTS.includes(variantParam as BadgeVariant) ? (variantParam as BadgeVariant) : "status";
  const theme = VALID_THEMES.includes(themeParam as BadgeTheme) ? (themeParam as BadgeTheme) : "light";
  const size = VALID_SIZES.includes(sizeParam as BadgeSize) ? (sizeParam as BadgeSize) : "medium";
  const layout = VALID_LAYOUTS.includes(layoutParam as BadgeLayout) ? (layoutParam as BadgeLayout) : "flat";

  // Any failure renders notFoundSvg() so this route always returns a renderable SVG.
  try {
    // Uses the visitor's own IP/cookies, so a badge unlocks only if that browser unlocked the page
    // (docs/specs/SPEC-status-page-password.md).
    const { protection, unlocked } = await resolveStatusPageAccess(boardSlug, request.headers);
    if (!protection) return notFoundSvg();
    if (!unlocked) return lockedSvg(theme, size, layout);

    const statusPage = await getPublicStatusPage(boardSlug);
    if (!statusPage) return notFoundSvg();

    const label = statusPage.companyName;
    const svg =
      variant === "uptime"
        ? renderBadgeSvg({ label, value: `${averageUptime(statusPage.services)}%`, indicator: null, theme, size, layout })
        : renderBadgeSvg({
            label,
            value: STATUS_LABEL[worstIndicator(statusPage.services)] ?? "Unknown",
            indicator: worstIndicator(statusPage.services),
            theme,
            size,
            layout,
          });

    // With protection on, the same URL differs per visitor, so a shared cache must not store it.
    const cacheControl = isProtectionConfigured(protection) ? "private, max-age=60" : "public, max-age=60";
    return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": cacheControl } });
  } catch (error) {
    console.error(`badge: failed for board ${boardSlug}:`, error);
    return notFoundSvg();
  }
}
