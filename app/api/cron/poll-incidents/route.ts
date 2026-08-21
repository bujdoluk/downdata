import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { pollAllIncidents } from "@/lib/pollIncidents";
import { notifyPendingEvents } from "@/lib/notifyIncidentEvents";

const LOCK_STALE_MS = 5 * 60 * 1000;

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

  // Row-based lock, not a Postgres advisory lock — supabase-js's .rpc()
  // goes through PostgREST, a stateless layer with no guarantee that a
  // later "unlock" call lands on the same session as the earlier "lock"
  // call, which is exactly what session-scoped advisory locks require.
  // A single atomic UPDATE...RETURNING is self-contained instead.
  const staleBefore = new Date(Date.now() - LOCK_STALE_MS).toISOString();
  const { data: claimed } = await supabase
    .from("poll_run_lock")
    .update({ running: true, started_at: new Date().toISOString() })
    .eq("id", true)
    .or(`running.eq.false,started_at.lt.${staleBefore}`)
    .select();

  if (!claimed?.length) {
    return NextResponse.json({ skipped: "already running" });
  }

  try {
    // Sequential, not Promise.all'd: the backfill markers written during
    // polling must exist before the notifier's query runs, or the
    // flood-prevention design silently breaks.
    const pollResult = await pollAllIncidents();
    await notifyPendingEvents();
    return NextResponse.json(pollResult);
  } catch {
    return NextResponse.json({ error: "Poll run failed" }, { status: 502 });
  } finally {
    await supabase.from("poll_run_lock").update({ running: false }).eq("id", true);
  }
}
