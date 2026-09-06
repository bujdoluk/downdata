import type { Metadata } from "next";
import { getAllTrackedSlugs, getAllBoards } from "@/features/boards/services/boards";
import { getCatalog } from "@/lib/catalog";
import MonitorsPageContent from "@/features/monitors/components/MonitorsPageContent";

export const metadata: Metadata = {
  title: "Monitors · downDATA",
};

export default async function MonitorsPage() {
  const [trackedSlugs, catalog, boards] = await Promise.all([getAllTrackedSlugs(), getCatalog(), getAllBoards()]);

  return (
    <main className="flex flex-1 justify-center p-6">
      <div className="w-full">
        <MonitorsPageContent catalog={catalog} trackedSlugs={trackedSlugs} boards={boards} />
      </div>
    </main>
  );
}
