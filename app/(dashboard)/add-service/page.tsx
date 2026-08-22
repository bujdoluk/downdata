import type { Metadata } from "next";
import { getAllServices } from "@/lib/services";
import { getCatalog } from "@/lib/catalog";
import ServiceCatalogPicker from "@/components/service/ServiceCatalogPicker";

export const metadata: Metadata = {
  title: "Add Service · downDATA",
};

export default async function AddServicePage() {
  const [services, catalog] = await Promise.all([getAllServices(), getCatalog()]);
  const trackedHosts = services.map((service) => service.host);

  return (
    <main className="flex flex-1 justify-center p-6">
      <ServiceCatalogPicker catalog={catalog} trackedHosts={trackedHosts} />
    </main>
  );
}
