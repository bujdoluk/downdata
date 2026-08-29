import type { Metadata } from "next";
import { getAllTrackedSlugs, getAllBoards } from "@/lib/boards";
import { getCatalog } from "@/lib/catalog";
import HistoryPageContent from "@/components/history/HistoryPageContent";

export const metadata: Metadata = {
  title: "History · downDATA",
};

export default async function HistoryPage() {
  const [trackedSlugs, catalog, boards] = await Promise.all([getAllTrackedSlugs(), getCatalog(), getAllBoards()]);
  const trackedServices = catalog.filter((entry) => trackedSlugs.includes(entry.slug));

  return (
    <main className="flex flex-1 justify-center p-6">
      <HistoryPageContent trackedServices={trackedServices} boards={boards} />
    </main>
  );
}
