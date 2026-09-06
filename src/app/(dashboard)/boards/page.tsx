import type { Metadata } from "next";
import { getAllBoards } from "@/features/boards/services/boards";
import BoardsPageContent from "@/features/boards/components/BoardsPageContent";

export const metadata: Metadata = {
  title: "Boards · downDATA",
};

export default async function BoardsPage() {
  const boards = await getAllBoards();

  return (
    <main className="flex flex-1 justify-center p-6">
      <BoardsPageContent boards={boards} />
    </main>
  );
}
