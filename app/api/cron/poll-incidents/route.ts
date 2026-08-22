import { timingSafeEqual } from "node:crypto";
import { NextResponse, after } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { pollAllIncidents } from "@/lib/pollIncidents";
import { notifyPendingEvents } from "@/lib/notifyIncidentEvents";

const LOCK_STALE_MS = 5 * 60 * 1000;

// A full poll+notify cycle can take longer than free external cron
// services' request timeout (e.g. cron-job.org's free plan cuts off at
// 30s). This lets the run keep going past that via after() below.
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const provided = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Both present = sharded, both absent = poll everything in one run (today's
// behavior for a small catalog). Returns null for absent params and throws
// only on a malformed present one, so the route can 400 with a clear reason.
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

  // Lazily ensure this shard's lock row exists — any shard/count combo
  // works with no pre-seeding, since a new combination just gets a fresh row.
  await supabase.from("poll_run_lock").upsert({ shard_key: shardKey }, { onConflict: "shard_key", ignoreDuplicates: true });

  // Row-based lock, not a Postgres advisory lock — supabase-js's .rpc()
  // goes through PostgREST, a stateless layer with no guarantee that a
  // later "unlock" call lands on the same session as the earlier "lock"
  // call, which is exactly what session-scoped advisory locks require.
  // A single atomic UPDATE...RETURNING is self-contained instead. Scoped
  // per shard_key so concurrent shards (?shard=0&shards=4, ?shard=1&...)
  // don't block each other — only two requests for the *same* shard do.
  const staleBefore = new Date(Date.now() - LOCK_STALE_MS).toISOString();
  const { data: claimed } = await supabase
    .from("poll_run_lock")
    .update({ running: true, started_at: new Date().toISOString() })
    .eq("shard_key", shardKey)
    .or(`running.eq.false,started_at.lt.${staleBefore}`)
    .select();

  if (!claimed?.length) {
    return NextResponse.json({ skipped: "already running" });
  }

  // Respond immediately instead of waiting for the run to finish — the
  // caller (an external cron pinger) only needs to know the run started,
  // and after() keeps this function alive past the response to actually
  // do the work, so a slow cycle can't get killed by the caller's own
  // request timeout.
  after(async () => {
    try {
      // Sequential, not Promise.all'd: the backfill markers written during
      // polling must exist before the notifier's query runs, or the
      // flood-prevention design silently breaks.
      await pollAllIncidents(shard ?? undefined);
      // Only the first shard of whatever split is configured triggers
      // notifications — every shard writes to the same incident_events
      // table, so notifying from all of them would be both redundant and
      // racy (concurrent runs could both see the same event as
      // undelivered). Each shard's own backfill markers are still written
      // synchronously within its own pollAllIncidents() call above, so
      // this stays correct regardless of which shard runs notify.
      if (!shard || shard.index === 0) await notifyPendingEvents();
    } finally {
      await supabase.from("poll_run_lock").update({ running: false }).eq("shard_key", shardKey);
    }
  });

  return NextResponse.json({ started: true });
}
