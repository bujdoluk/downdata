import type { Metadata } from "next";
import { getAllServices } from "@/lib/services";
import { getCatalog } from "@/lib/catalog";
import MonitorsPageContent from "@/components/service/MonitorsPageContent";

export const metadata: Metadata = {
  title: "Monitors · downDATA",
};

export default async function MonitorsPage() {
  const [services, catalog] = await Promise.all([getAllServices(), getCatalog()]);
  const trackedHosts = services.map((service) => service.host);

  return (
    <main className="flex flex-1 justify-center p-6">
      <div className="w-full max-w-6xl">
        <MonitorsPageContent catalog={catalog} trackedHosts={trackedHosts} />
      </div>
    </main>
  );
}
