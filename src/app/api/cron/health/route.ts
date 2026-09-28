import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { LOCK_STALE_MS } from "@/lib/pollIncidents";
import { msSince } from "@/lib/formatTime";

// A shard_key with no run attempt in 24h is retired config (e.g. after resharding), not a failure.
const IGNORE_INACTIVE_AFTER_MS = 24 * 60 * 60 * 1000;

// Unauthenticated for an external uptime monitor; exposes only shard keys and a status.
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data: rows, error } = await supabase.from("poll_run_lock").select("shard_key, started_at, last_success_at");
    if (error) throw error;

    const active = (rows ?? []).filter((row) => row.started_at && msSince(row.started_at) < IGNORE_INACTIVE_AFTER_MS);
    const stale = active.filter((row) => !row.last_success_at || msSince(row.last_success_at) > LOCK_STALE_MS);

    if (stale.length > 0) {
      return NextResponse.json({ status: "unhealthy", stale: stale.map((row) => row.shard_key) }, { status: 503 });
    }
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "unhealthy", error: "Unable to reach the database." }, { status: 503 });
  }
}
