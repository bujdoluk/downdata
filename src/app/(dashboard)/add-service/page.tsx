import type { Metadata } from "next";
import { getAllBoards } from "@/lib/boards";
import { getCatalog } from "@/lib/catalog";
import ServiceCatalogPicker from "@/components/service/ServiceCatalogPicker";

export const metadata: Metadata = {
  title: "Add Service · downDATA",
};

export default async function AddServicePage({ searchParams }: { searchParams: Promise<{ board?: string }> }) {
  const [{ board }, catalog, boards] = await Promise.all([searchParams, getCatalog(), getAllBoards()]);
  const initialBoardId = boards.find((entry) => entry.id === board)?.id ?? boards[0]?.id;

  return (
    <main className="flex flex-1 justify-center p-6">
      <ServiceCatalogPicker catalog={catalog} boards={boards} initialBoardId={initialBoardId} />
    </main>
  );
}
