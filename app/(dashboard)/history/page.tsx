import type { Metadata } from "next";
import { getAllServices } from "@/lib/services";
import HistoryPageContent from "@/components/history/HistoryPageContent";

export const metadata: Metadata = {
  title: "History · downDATA",
};

export default async function HistoryPage() {
  const trackedServices = await getAllServices();

  return (
    <main className="flex flex-1 justify-center p-6">
      <HistoryPageContent trackedServices={trackedServices} />
    </main>
  );
}
