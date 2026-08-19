import type { Metadata } from "next";
import IncidentDetail from "@/components/service/IncidentDetail";

export const metadata: Metadata = {
  title: "Incident · downDATA",
};

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="flex flex-1 items-center-safe justify-center p-6">
      <IncidentDetail id={id} />
    </main>
  );
}
