import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveBoardById } from "@/lib/boards";
import { getAllServices } from "@/lib/services";
import { SERVICE_CATALOG } from "@/lib/serviceCatalog";
import BoardDetailContent from "@/components/boards/BoardDetailContent";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const board = await resolveBoardById(id);
  return { title: `${board?.name ?? "Board"} · downDATA` };
}

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = await resolveBoardById(id);

  if (!board) {
    notFound();
  }

  const services = await getAllServices();
  const trackedHosts = services.map((service) => service.host);

  return (
    <main className="flex flex-1 justify-center p-6">
      <BoardDetailContent board={board} catalog={SERVICE_CATALOG} trackedHosts={trackedHosts} />
    </main>
  );
}
