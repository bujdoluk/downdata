import { NextResponse } from "next/server";
import { getPublicStatusPage } from "@/features/status-pages/services/statusPages";
import { averageUptime, renderBadgeSvg, worstIndicator, type BadgeLayout, type BadgeSize, type BadgeTheme, type BadgeVariant } from "@/features/status-pages/services/badge";

// Public, unauthenticated (see proxy.ts's PUBLIC_PREFIXES) — same class as
// /api/summary/[slug]/api/status/[slug]: a badge only ever exists for a
// board that already has a public status page (getPublicStatusPage's own
// `enabled` check is the entire authorization), so there's nothing here
// beyond what that page already shows to anyone with the link. Stateless
// by design — every parameter (type/theme/size/layout) lives in the query
// string, not a saved row, so the exact same URL always renders the same
// way for both the /integrations "Embeds" tab's live preview and whatever
// README/site a user has already pasted the code sample into (see the
// grilling session that settled this — persisting embed configs would
// have added a migration/table for zero actual rendering benefit).
const VALID_VARIANTS: BadgeVariant[] = ["status", "uptime"];
const VALID_THEMES: BadgeTheme[] = ["light", "dark"];
const VALID_SIZES: BadgeSize[] = ["small", "medium", "large"];
const VALID_LAYOUTS: BadgeLayout[] = ["flat", "card"];

const STATUS_LABEL: Record<string, string> = { none: "Operational", minor: "Minor", major: "Major", critical: "Critical" };

// A tiny fallback badge, not a JSON error body — the consumer here is
// always an <img> tag (a README, a site), which can't render JSON at all;
// this at least tells a viewer *something* instead of a browser's generic
// broken-image icon. Deliberately not this app's usual
// NextResponse.json({error}, {status}) error shape for that reason.
function notFoundSvg(): NextResponse {
  const svg = renderBadgeSvg({ label: "status", value: "not found", indicator: null, theme: "light", size: "small", layout: "flat" });
  return new NextResponse(svg, { status: 404, headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=60" } });
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

  // The consumer here is always an <img> tag, which can't render a thrown
  // error at all — notFoundSvg() below is deliberately reused for any
  // failure, not just "board not found", so this route never returns
  // anything other than a renderable SVG (see the file's own header
  // comment on why this can't be this app's usual JSON error shape).
  try {
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

    return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=60" } });
  } catch (error) {
    console.error(`badge: failed for board ${boardSlug}:`, error);
    return notFoundSvg();
  }
}
