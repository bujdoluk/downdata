import type { Metadata } from "next";
import { getAllBoards } from "@/features/boards/services/boards";
import { getReportSettings, syncOwnTimeZone } from "@/features/reports/services/reportSettings";
import { getAllOwnReports } from "@/features/reports/services/reports";
import ReportsPageContent from "@/features/reports/components/ReportsPageContent";

export const metadata: Metadata = {
  title: "Reports · downDATA",
};

export default async function ReportsPage() {
  await syncOwnTimeZone();

  const [boards, settings, reports] = await Promise.all([getAllBoards(), getReportSettings(), getAllOwnReports()]);

  return (
    <main className="flex flex-1 justify-center p-6">
      <ReportsPageContent boards={boards} initialSettings={settings} initialReports={reports} />
    </main>
  );
}
