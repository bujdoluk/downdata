import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveBoardById } from "@/lib/boards";
import { getCatalog } from "@/lib/catalog";
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

  const catalog = await getCatalog();

  return (
    <main className="flex flex-1 justify-center p-6">
      <BoardDetailContent board={board} catalog={catalog} />
    </main>
  );
}
