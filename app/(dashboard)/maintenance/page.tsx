import type { Metadata } from "next";
import { getAllBoards } from "@/lib/boards";
import MaintenancePageContent from "@/components/service/MaintenancePageContent";

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
