import { getAllServices } from "@/lib/services";
import { SERVICE_CATALOG } from "@/lib/serviceCatalog";
import ServiceCatalogPicker from "@/components/service/ServiceCatalogPicker";

export default function AddServicePage() {
  const trackedHosts = getAllServices().map((service) => service.host);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <ServiceCatalogPicker catalog={SERVICE_CATALOG} trackedHosts={trackedHosts} />
    </main>
  );
}
