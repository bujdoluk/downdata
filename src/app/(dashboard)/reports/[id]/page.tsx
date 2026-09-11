import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOwnReportById } from "@/features/reports/services/reports";
import ReportDetail from "@/features/reports/components/ReportDetail";

const INTERVAL_LABEL: Record<string, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const report = await getOwnReportById(id);
  return { title: `${report ? INTERVAL_LABEL[report.interval] : "Report"} report · downDATA` };
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getOwnReportById(id);

  if (!report) {
    notFound();
  }

  return (
    <main className="flex flex-1 justify-center p-6">
      <ReportDetail report={report} />
    </main>
  );
}
