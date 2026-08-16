import { getAllServices } from "@/lib/services";
import { SERVICE_CATALOG } from "@/lib/serviceCatalog";
import ServiceCatalogPicker from "@/components/service/ServiceCatalogPicker";

export default function AddServicePage() {
  const trackedHosts = new Set(getAllServices().map((service) => service.host));
  const available = SERVICE_CATALOG.filter((entry) => !trackedHosts.has(entry.host));

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <ServiceCatalogPicker catalog={available} />
    </main>
  );
}
