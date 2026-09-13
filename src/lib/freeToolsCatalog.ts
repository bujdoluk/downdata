import type { ComponentType } from "react";
import ChromeLogo from "@/components/landing-page/ChromeLogo";
import ChromeExtensionCard from "@/components/landing-page/ChromeExtensionCard";

// The public marketing catalog of free, standalone lead-magnet tools
// (Statusgator/IsDown-style giveaways, each with a CTA back into the real
// product) — same relationship FEATURE_CATALOG (lib/featureCatalog.ts) and
// INTEGRATION_CATALOG (lib/integrationCatalog.ts) have to their own domains.
//
// Unlike those two, a free tool isn't a fixed-shape "icon + one paragraph"
// blurb — an SSL checker needs a form and a result, a downtime calculator
// needs a form and math, this one needs a promo card with an install CTA.
// So each entry owns its own `Content` component instead of routing every
// slug through one shared generic template (see FreeToolPageContent.tsx).
export type FreeToolSlug = "chromeExtension";

export type FreeToolCatalogEntry = {
  slug: FreeToolSlug;
  // Small, single-color glyph for the footer link — the full-color brand
  // logo (ChromeLogo) belongs to this tool's own Content, not the footer.
  icon: ComponentType<{ className?: string }>;
  Content: ComponentType;
};

export const FREE_TOOLS_CATALOG: FreeToolCatalogEntry[] = [
  { slug: "chromeExtension", icon: ChromeLogo, Content: ChromeExtensionCard },
];

export function resolveFreeTool(slug: string): FreeToolCatalogEntry | undefined {
  return FREE_TOOLS_CATALOG.find((entry) => entry.slug === slug);
}
