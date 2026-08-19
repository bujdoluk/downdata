import type { Metadata } from "next";
import { getAllServices } from "@/lib/services";
import { SERVICE_CATALOG } from "@/lib/serviceCatalog";
import ServicesPageContent from "@/components/service/ServicesPageContent";

export const metadata: Metadata = {
  title: "Services · downDATA",
};

export default function Home() {
  const trackedHosts = getAllServices().map((service) => service.host);

  return (
    <main className="flex flex-1 justify-center p-6">
      <div className="w-full max-w-6xl">
        <ServicesPageContent catalog={SERVICE_CATALOG} trackedHosts={trackedHosts} />
      </div>
    </main>
  );
}
