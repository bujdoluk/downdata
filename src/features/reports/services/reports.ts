import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ReportPayload, StoredReport } from "@/features/reports/types";

type ReportRow = {
  id: string;
  report_interval: StoredReport["interval"];
  period_start: string;
  period_end: string;
  generated_at: string;
  payload: ReportPayload;
};

function toStoredReport(row: ReportRow): StoredReport {
  return { id: row.id, interval: row.report_interval, periodStart: row.period_start, periodEnd: row.period_end, generatedAt: row.generated_at, payload: row.payload };
}

// Capped at 200: more than a daily cadence makes in a year, rows are small.
const LIST_LIMIT = 200;

export async function getAllOwnReports(): Promise<StoredReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id, report_interval, period_start, period_end, generated_at, payload")
    .order("period_start", { ascending: false })
    .limit(LIST_LIMIT);
  if (error) throw error;
  return ((data as ReportRow[] | null) ?? []).map(toStoredReport);
}

// RLS scopes to the caller, so another account's id returns null (404).
// cache() dedupes generateMetadata's and the page's calls.
export const getOwnReportById = cache(async (id: string): Promise<StoredReport | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id, report_interval, period_start, period_end, generated_at, payload")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toStoredReport(data as ReportRow) : null;
});

// RLS scopes to the caller, so another account's id matches zero rows.
export async function deleteOwnReport(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("reports").delete().eq("id", id).select();
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
