import type { Metadata } from "next";
import { getAllServices } from "@/lib/services";
import { SERVICE_CATALOG } from "@/lib/serviceCatalog";
import ServiceCatalogPicker from "@/components/service/ServiceCatalogPicker";

export const metadata: Metadata = {
  title: "Add Service · downDATA",
};

export default async function AddServicePage() {
  const services = await getAllServices();
  const trackedHosts = services.map((service) => service.host);

  return (
    <main className="flex flex-1 justify-center p-6">
      <ServiceCatalogPicker catalog={SERVICE_CATALOG} trackedHosts={trackedHosts} />
    </main>
  );
}
