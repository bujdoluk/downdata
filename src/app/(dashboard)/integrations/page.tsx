import type { Metadata } from "next";
import { getAllIntegrations } from "@/features/integrations/services/integrations";
import IntegrationsPageContent from "@/features/integrations/components/IntegrationsPageContent";

export const metadata: Metadata = {
  title: "Integrations · downDATA",
};

const INTEGRATION_CATALOG = [
  { slug: "slack", name: "Slack" },
  { slug: "email", name: "Email" },
  { slug: "sms", name: "SMS" },
];

export default async function IntegrationsPage() {
  const integrations = await getAllIntegrations();

  return (
    <main className="flex flex-1 justify-center p-6">
      <IntegrationsPageContent catalog={INTEGRATION_CATALOG} integrations={integrations} />
    </main>
  );
}
