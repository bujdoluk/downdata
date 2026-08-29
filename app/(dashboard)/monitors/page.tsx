import type { Metadata } from "next";
import { getAllTrackedSlugs } from "@/lib/boards";
import { getCatalog } from "@/lib/catalog";
import MonitorsPageContent from "@/components/service/MonitorsPageContent";

export const metadata: Metadata = {
  title: "Monitors · downDATA",
};

export default async function MonitorsPage() {
  const [trackedSlugs, catalog] = await Promise.all([getAllTrackedSlugs(), getCatalog()]);

  return (
    <main className="flex flex-1 justify-center p-6">
      <div className="w-full max-w-6xl">
        <MonitorsPageContent catalog={catalog} trackedSlugs={trackedSlugs} />
      </div>
    </main>
  );
}
