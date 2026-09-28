import { timingSafeEqual } from "node:crypto";
import { Temporal } from "temporal-polyfill";
import { NextResponse, after } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { pollAllIncidents, LOCK_STALE_MS } from "@/lib/pollIncidents";
import { notifyPendingEvents } from "@/lib/notifyIncidentEvents";
import { checkMaintenanceReminders } from "@/lib/pollMaintenanceReminders";
import { nowIso } from "@/lib/formatTime";

// A full cycle can outlast the external cron's 30s request timeout; after() below keeps it running.
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const provided = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Throws only on malformed params so the route can 400 with a clear reason.
function parseShard(url: URL): { index: number; count: number } | null {
  const rawIndex = url.searchParams.get("shard");
  const rawCount = url.searchParams.get("shards");
  if (rawIndex === null && rawCount === null) return null;

  const index = Number(rawIndex);
  const count = Number(rawCount);
  if (!Number.isInteger(index) || !Number.isInteger(count) || index < 0 || index >= count) {
    throw new Error("shard/shards must be integers with 0 <= shard < shards");
  }
  return { index, count };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let shard: { index: number; count: number } | null;
  try {
    shard = parseShard(new URL(request.url));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
  const shardKey = shard ? `${shard.index}/${shard.count}` : "all";

  const supabase = getSupabaseClient();

  await supabase.from("poll_run_lock").upsert({ shard_key: shardKey }, { onConflict: "shard_key", ignoreDuplicates: true });

  // Row lock, not an advisory lock: PostgREST is stateless, so lock and unlock may hit different
  // sessions. Scoped per shard_key so different shards never block each other.
  const staleBefore = Temporal.Now.instant()
    .subtract({ milliseconds: LOCK_STALE_MS })
    .toString({ smallestUnit: "millisecond" });
  const { data: claimed } = await supabase
    .from("poll_run_lock")
    .update({ running: true, started_at: nowIso() })
    .eq("shard_key", shardKey)
    .or(`running.eq.false,started_at.lt.${staleBefore}`)
    .select();

  if (!claimed?.length) {
    return NextResponse.json({ skipped: "already running" });
  }

  // Respond immediately so a slow cycle can't be killed by the cron caller's request timeout.
  after(async () => {
    try {
      // Sequential: backfill markers written while polling must exist before notify runs, or old events flood out.
      const result = await pollAllIncidents(shard ?? undefined);

      // Independent of notify's outcome, since delivery self-heals. Gated on failure rate because
      // pollAllIncidents swallows per-service errors, so a near-total outage would otherwise look clean.
      const totalFailed = result.failed + result.maintenancesFailed;
      const totalAttempted = result.incidentsUpserted + result.failed + result.maintenancesUpserted + result.maintenancesFailed;
      const acceptable = totalFailed === 0 || totalFailed / totalAttempted < 0.5;
      if (acceptable) {
        await supabase.from("poll_run_lock").update({ last_success_at: nowIso() }).eq("shard_key", shardKey);
      }

      // Reminders run on every tick, NOT behind the shard-0 gate: shard 0 only fires every ~5 min
      // (shards are round-robined), which would break the "checked every minute" promise.
      // Own try/catch so a reminder failure can't skip incident notifications below.
      try {
        await checkMaintenanceReminders();
      } catch (error) {
        console.error("checkMaintenanceReminders failed:", error);
      }

      // Only one shard notifies: all shards share incident_events, so notifying from each is redundant and racy.
      if (!shard || shard.index === 0) {
        await notifyPendingEvents();
      }
    } finally {
      await supabase.from("poll_run_lock").update({ running: false }).eq("shard_key", shardKey);
    }
  });

  return NextResponse.json({ started: true });
}
