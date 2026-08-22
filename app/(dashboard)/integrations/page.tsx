import type { Metadata } from "next";
import { getAllIntegrations } from "@/lib/integrations";
import IntegrationsPageContent from "@/components/integrations/IntegrationsPageContent";

export const metadata: Metadata = {
  title: "Integrations · downDATA",
};

// Only one integration exists (Slack) — same as this codebase already
// hardcodes elsewhere (lib/notifyIncidentEvents.ts's `slug !== "slack"`
// check). A separate lib/integrationCatalog.ts module for a single
// hardcoded entry was unnecessary indirection for its one call site.
const INTEGRATION_CATALOG = [{ slug: "slack", name: "Slack" }];

export default async function IntegrationsPage() {
  const integrations = await getAllIntegrations();

  return (
    <main className="flex flex-1 justify-center p-6">
      <IntegrationsPageContent catalog={INTEGRATION_CATALOG} integrations={integrations} />
    </main>
  );
}
