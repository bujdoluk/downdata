import type { Metadata } from "next";
import { getAllIntegrations } from "@/lib/integrations";
import { INTEGRATION_CATALOG } from "@/lib/integrationCatalog";
import IntegrationsPageContent from "@/components/integrations/IntegrationsPageContent";

export const metadata: Metadata = {
  title: "Integrations · downDATA",
};

export default async function IntegrationsPage() {
  const integrations = await getAllIntegrations();

  return (
    <main className="flex flex-1 justify-center p-6">
      <IntegrationsPageContent catalog={INTEGRATION_CATALOG} integrations={integrations} />
    </main>
  );
}
