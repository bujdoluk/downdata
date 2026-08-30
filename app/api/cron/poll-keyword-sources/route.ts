import { timingSafeEqual } from "node:crypto";
import { Temporal } from "temporal-polyfill";
import { NextResponse, after } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { pollAllKeywordSources } from "@/lib/pollKeywordSources";
import { nowIso } from "@/lib/formatTime";

// A full cycle can run long given how deliberately paced the Reddit
// polling is (see lib/pollKeywordSources.ts) — same "keep going past a
// free cron pinger's own timeout" reasoning as poll-incidents.
export const maxDuration = 60;

// Own lock row, own shard_key, in the same poll_run_lock table
// poll-incidents already uses — a separate table would just duplicate the
// same "claim/release via one atomic UPDATE" machinery for no reason; the
// table's shard_key is already a free-form string, not incidents-specific.
const SHARD_KEY = "early-warnings";

// 10 minutes of margin over this route's own external cron interval
// (~5-10 min) — same reasoning as LOCK_STALE_MS in lib/pollIncidents.ts:
// wide enough that ordinary tick jitter never reads as "stuck".
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
