import type { Metadata } from "next";
import { getAllBoards } from "@/features/boards/services/boards";
import { getCatalog } from "@/lib/catalog";
import ServiceCatalogPicker from "@/features/monitors/components/ServiceCatalogPicker";

export const metadata: Metadata = {
  title: "Add Service · downDATA",
};

export default async function AddServicePage({ searchParams }: { searchParams: Promise<{ board?: string }> }) {
  const [{ board }, catalog, boards] = await Promise.all([searchParams, getCatalog(), getAllBoards()]);
  // Distinct from initialBoardId below: that one falls back to boards[0]
  // when ?board= is absent or stale, so by itself it can't tell "arrived
  // with an explicit board" apart from "defaulted to the first one
  // alphabetically" — the Back link needs that raw signal to know whether
  // to return to this specific board's page or the generic boards list.
  const matchedBoard = boards.find((entry) => entry.id === board);
  const initialBoardId = matchedBoard?.id ?? boards[0]?.id;
  const backHref = matchedBoard ? `/boards/${matchedBoard.id}` : "/boards";

  return (
    <main className="flex flex-1 justify-center p-6">
      <ServiceCatalogPicker catalog={catalog} boards={boards} initialBoardId={initialBoardId} backHref={backHref} />
    </main>
  );
}
