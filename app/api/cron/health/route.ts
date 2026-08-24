import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { LOCK_STALE_MS } from "@/lib/pollIncidents";

// A shard_key that hasn't even attempted a run in 24h is retired config
// (e.g. from a resharding change), not an active shard that's failing —
// stop requiring it to be healthy.
const IGNORE_INACTIVE_AFTER_MS = 24 * 60 * 60 * 1000;

// Unauthenticated on purpose — meant to be pinged by an external uptime
// monitor, and reveals nothing beyond shard keys and a status string.
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data: rows, error } = await supabase.from("poll_run_lock").select("shard_key, started_at, last_success_at");
    if (error) throw error;

    const now = Date.now();
    const active = (rows ?? []).filter((row) => row.started_at && now - new Date(row.started_at).getTime() < IGNORE_INACTIVE_AFTER_MS);
    const stale = active.filter((row) => !row.last_success_at || now - new Date(row.last_success_at).getTime() > LOCK_STALE_MS);

    if (stale.length > 0) {
      return NextResponse.json({ status: "unhealthy", stale: stale.map((row) => row.shard_key) }, { status: 503 });
    }
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "unhealthy", error: "Unable to reach the database." }, { status: 503 });
  }
}
