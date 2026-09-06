import type { Metadata } from "next";
import { getAllBoards } from "@/features/boards/services/boards";
import MaintenancePageContent from "@/features/maintenance/components/MaintenancePageContent";

export const metadata: Metadata = {
  title: "Maintenances · downDATA",
};

export default async function MaintenancePage() {
  const boards = await getAllBoards();

  return (
    <main className="flex flex-1 justify-center p-6">
      <div className="w-full">
        <MaintenancePageContent boards={boards} />
      </div>
    </main>
  );
}
