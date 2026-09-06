import type { Metadata } from "next";
import { getAllBoards } from "@/features/boards/services/boards";
import IncidentsPageContent from "@/features/incidents/components/IncidentsPageContent";

export const metadata: Metadata = {
  title: "Incidents · downDATA",
};

export default async function IncidentsPage() {
  const boards = await getAllBoards();

  return (
    <main className="flex flex-1 justify-center p-6">
      <div className="w-full">
        <IncidentsPageContent boards={boards} />
      </div>
    </main>
  );
}
