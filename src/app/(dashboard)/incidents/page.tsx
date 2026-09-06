import type { Metadata } from "next";
import { getAllBoards } from "@/lib/boards";
import IncidentsPageContent from "@/components/service/IncidentsPageContent";

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
