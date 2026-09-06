import type { ComponentType } from "react";
import SlackLogo from "@/components/integrations/SlackLogo";
import EmailLogo from "@/components/integrations/EmailLogo";
import SmsLogo from "@/components/integrations/SmsLogo";

// Distinct from types/integration.ts's Integration/IntegrationDefinition on
// purpose — those describe a connected integration's data (dashboard
// connect/manage flow); this describes the public marketing catalog of
// providers, same relationship FEATURE_CATALOG (lib/featureCatalog.ts) has
// to the app's actual dashboard features.
export type IntegrationProviderSlug = "slack" | "email" | "sms";

export type IntegrationCatalogEntry = {
  slug: IntegrationProviderSlug;
  logo: ComponentType<{ size?: number; className?: string }>;
};

export const INTEGRATION_CATALOG: IntegrationCatalogEntry[] = [
  { slug: "slack", logo: SlackLogo },
  { slug: "email", logo: EmailLogo },
  { slug: "sms", logo: SmsLogo },
];

export function resolveIntegrationProvider(slug: string): IntegrationCatalogEntry | undefined {
  return INTEGRATION_CATALOG.find((entry) => entry.slug === slug);
}
