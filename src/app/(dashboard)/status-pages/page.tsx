import type { Metadata } from "next";
import { getAllBoards } from "@/features/boards/services/boards";
import StatusPagesPageContent from "@/features/status-pages/components/StatusPagesPageContent";

export const metadata: Metadata = {
  title: "Status Pages · downDATA",
};

export default async function StatusPagesPage() {
  const boards = await getAllBoards();

  return (
    <main className="flex flex-1 justify-center p-6">
      <StatusPagesPageContent boards={boards} />
    </main>
  );
}
