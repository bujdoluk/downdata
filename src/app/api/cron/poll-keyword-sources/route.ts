import { timingSafeEqual } from "node:crypto";
import { Temporal } from "temporal-polyfill";
import { NextResponse, after } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { pollAllKeywordSources } from "@/features/early-warnings/services/pollKeywordSources";
import { nowIso } from "@/lib/formatTime";

// Reddit polling is deliberately paced, so a cycle can outlast the cron caller's timeout.
export const maxDuration = 60;

const SHARD_KEY = "early-warnings";

// Wide enough over the ~5-10 min cron interval that tick jitter never reads as stuck.
const LOCK_STALE_MS = 10 * 60 * 1000;

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
      const result = await pollAllKeywordSources();
      await supabase.from("poll_run_lock").update({ last_success_at: nowIso() }).eq("shard_key", SHARD_KEY);
      console.log("poll-keyword-sources:", result);
    } catch (error) {
      console.error("poll-keyword-sources failed:", error);
    } finally {
      await supabase.from("poll_run_lock").update({ running: false }).eq("shard_key", SHARD_KEY);
    }
  });

  return NextResponse.json({ started: true });
}
