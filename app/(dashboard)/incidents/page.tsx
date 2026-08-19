import type { Metadata } from "next";
import IncidentsPageContent from "@/components/service/IncidentsPageContent";

export const metadata: Metadata = {
  title: "Incidents · downDATA",
};

export default function IncidentsPage() {
  return (
    <main className="flex flex-1 justify-center p-6">
      <div className="w-full max-w-6xl">
        <IncidentsPageContent />
      </div>
    </main>
  );
}
