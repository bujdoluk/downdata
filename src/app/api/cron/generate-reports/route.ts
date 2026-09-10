import { timingSafeEqual } from "node:crypto";
import { Temporal } from "temporal-polyfill";
import { NextResponse, after } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { generateDueReports } from "@/features/reports/services/reportGeneration";
import { nowIso } from "@/lib/formatTime";

// Report generation itself is bounded (one pass over accounts with
// boards), but well within poll-incidents's own timeout margin reasoning.
export const maxDuration = 60;

// Must actually be invoked roughly hourly by the external scheduler — see
// reportGeneration.ts's REPORT_SEND_HOUR comment. A daily invocation would
// only ever catch whichever accounts' local send hour happens to line up
// with that one daily tick.
const SHARD_KEY = "reports";
const LOCK_STALE_MS = 70 * 60 * 1000;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const provided = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseClient();

  await supabase.from("poll_run_lock").upsert({ shard_key: SHARD_KEY }, { onConflict: "shard_key", ignoreDuplicates: true });

  const staleBefore = Temporal.Now.instant().subtract({ milliseconds: LOCK_STALE_MS }).toString({ smallestUnit: "millisecond" });
  const { data: claimed } = await supabase
    .from("poll_run_lock")
    .update({ running: true, started_at: nowIso() })
    .eq("shard_key", SHARD_KEY)
    .or(`running.eq.false,started_at.lt.${staleBefore}`)
    .select();

  if (!claimed?.length) {
    return NextResponse.json({ skipped: "already running" });
  }

  after(async () => {
    try {
      const result = await generateDueReports();
      await supabase.from("poll_run_lock").update({ last_success_at: nowIso() }).eq("shard_key", SHARD_KEY);
      console.log("generate-reports:", result);
    } catch (error) {
      console.error("generate-reports failed:", error);
    } finally {
      await supabase.from("poll_run_lock").update({ running: false }).eq("shard_key", SHARD_KEY);
    }
  });

  return NextResponse.json({ started: true });
}
