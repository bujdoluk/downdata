import type { ComponentType } from "react";
import ChromeLogo from "@/components/landing-page/ChromeLogo";
import ChromeExtensionCard from "@/components/landing-page/ChromeExtensionCard";

// Each entry owns its Content component because tools need different forms/results, not one shared template.
export type FreeToolSlug = "chromeExtension";

export type FreeToolCatalogEntry = {
  slug: FreeToolSlug;
  icon: ComponentType<{ className?: string }>;
  Content: ComponentType;
};

export const FREE_TOOLS_CATALOG: FreeToolCatalogEntry[] = [
  { slug: "chromeExtension", icon: ChromeLogo, Content: ChromeExtensionCard },
];

export function resolveFreeTool(slug: string): FreeToolCatalogEntry | undefined {
  return FREE_TOOLS_CATALOG.find((entry) => entry.slug === slug);
}
