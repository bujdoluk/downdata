import type { Metadata } from "next";
import { getAllBoards } from "@/lib/boards";
import StatusPagesPageContent from "@/components/statusPages/StatusPagesPageContent";

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
