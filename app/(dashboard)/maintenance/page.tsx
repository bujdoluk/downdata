import type { Metadata } from "next";
import MaintenancePageContent from "@/components/service/MaintenancePageContent";

export const metadata: Metadata = {
  title: "Maintenances · downDATA",
};

export default function MaintenancePage() {
  return (
    <main className="flex flex-1 justify-center p-6">
      <div className="w-full">
        <MaintenancePageContent />
      </div>
    </main>
  );
}
