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

// Newest first, capped at 200 — comfortably more than even a daily
// cadence produces in a year, and each row's payload is a small JSON blob
// (a handful of aggregate numbers per board/service), not worth paginating
// for v1.
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

// Used by /reports/[id] — RLS (reports_select) already scopes this to the
// caller's own rows, so a mismatched id (someone else's report, or one
// that never existed) just comes back null rather than erroring, same
// convention as deleteOwnReport below. The page itself turns that into a
// 404 via notFound().
export async function getOwnReportById(id: string): Promise<StoredReport | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id, report_interval, period_start, period_end, generated_at, payload")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toStoredReport(data as ReportRow) : null;
}

// RLS (0034_report_deletion.sql's reports_delete) already scopes this to
// the caller's own rows — a mismatched id (someone else's report, or one
// that never existed) just matches zero rows rather than erroring, same
// convention as features/boards/services/boards.ts's removeBoard.
export async function deleteOwnReport(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("reports").delete().eq("id", id).select();
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
