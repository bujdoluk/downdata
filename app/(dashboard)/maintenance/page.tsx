import type { Metadata } from "next";
import { getAllServices } from "@/lib/services";
import MaintenancePageContent from "@/components/service/MaintenancePageContent";

export const metadata: Metadata = {
  title: "Maintenances · downDATA",
};

export default async function MaintenancePage() {
  const trackedServices = await getAllServices();

  return (
    <main className="flex flex-1 justify-center p-6">
      <div className="w-full max-w-6xl">
        <MaintenancePageContent trackedServices={trackedServices} />
      </div>
    </main>
  );
}
