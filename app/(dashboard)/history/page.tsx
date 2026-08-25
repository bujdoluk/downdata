import type { Metadata } from "next";
import { getAllServices } from "@/lib/services";
import { getAllBoards } from "@/lib/boards";
import HistoryPageContent from "@/components/history/HistoryPageContent";

export const metadata: Metadata = {
  title: "History · downDATA",
};

export default async function HistoryPage() {
  const [trackedServices, boards] = await Promise.all([getAllServices(), getAllBoards()]);

  return (
    <main className="flex flex-1 justify-center p-6">
      <HistoryPageContent trackedServices={trackedServices} boards={boards} />
    </main>
  );
}
