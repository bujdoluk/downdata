import type { Metadata } from "next";
import { getAllBoards } from "@/lib/boards";
import BoardsPageContent from "@/components/boards/BoardsPageContent";

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
