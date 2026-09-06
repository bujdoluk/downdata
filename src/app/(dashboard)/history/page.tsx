import type { Metadata } from "next";
import { getAllTrackedSlugs, getAllBoards } from "@/features/boards/services/boards";
import { getCatalog } from "@/lib/catalog";
import HistoryPageContent from "@/features/history/components/HistoryPageContent";

export const metadata: Metadata = {
  title: "History · downDATA",
};

export default async function HistoryPage() {
  const [trackedSlugs, catalog, boards] = await Promise.all([getAllTrackedSlugs(), getCatalog(), getAllBoards()]);
  const trackedServices = catalog.filter((entry) => trackedSlugs.includes(entry.slug));

  return (
    <main className="relative flex flex-1 justify-center p-6">
      <HistoryPageContent trackedServices={trackedServices} boards={boards} />
    </main>
  );
}
