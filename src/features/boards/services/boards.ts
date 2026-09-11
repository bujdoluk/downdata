import { createClient } from "@/lib/supabase/server";
import { getSupabaseClient } from "@/lib/supabase";
import type { Board } from "@/types/board";

type BoardRow = { id: string; name: string; service_slugs: string[] | null };

function toBoard(row: BoardRow): Board {
  return { id: row.id, name: row.name, Slugs: row.service_slugs ?? [] };
}

export async function getAllBoards(): Promise<Board[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("boards").select("id, name, service_slugs").order("name");
  if (error) throw error;
  return (data as BoardRow[] | null)?.map(toBoard) ?? [];
}

export async function resolveBoardById(id: string): Promise<Board | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("boards").select("id, name, service_slugs").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toBoard(data as BoardRow) : undefined;
}

export async function addBoard(name: string): Promise<Board> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("boards").insert({ name: name.trim() }).select("id, name, service_slugs").single();
  if (error) throw error;
  return toBoard(data as BoardRow);
}

export async function renameBoard(id: string, name: string): Promise<Board | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boards")
    .update({ name: name.trim() })
    .eq("id", id)
    .select("id, name, service_slugs")
    .maybeSingle();
  if (error) throw error;
  return data ? toBoard(data as BoardRow) : undefined;
}

// One insert copying the source board's service_slugs directly, rather than
// looping addServiceToBoard once per slug — a single round trip, and no
// half-cloned board if something fails partway through. Deliberately
// doesn't touch board_status_pages (0025_board_status_pages.sql) — that
// table is keyed off boards.id separately, so a clone correctly starts with
// no public status page of its own instead of inheriting the source
// board's public URL.
export async function cloneBoard(id: string, name: string): Promise<Board | undefined> {
  const board = await resolveBoardById(id);
  if (!board) return undefined;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boards")
    .insert({ name: name.trim(), service_slugs: board.Slugs })
    .select("id, name, service_slugs")
    .single();
  if (error) throw error;
  return toBoard(data as BoardRow);
}

export async function removeBoard(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("boards").delete().eq("id", id).select();
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

// service_slugs is a plain array column (0002_create_services_boards_
// integrations.sql), not a join table, so "add"/"remove" here means
// read the whole array, compute a new one in JS, and write it back — with
// no row lock held in between. Two concurrent calls for the same board
// (a double-click, two open tabs) can both read the same array and each
// write their own next version; whichever UPDATE commits last would
// otherwise silently discard the other's change entirely.
//
// Guarded with compare-and-swap instead: the update's own .eq("service_
// slugs", ...) filter only lets it land if the column still holds exactly
// the array just read here — if another writer changed it first, this
// update matches zero rows (data comes back null, not an error) and the
// loop rereads the now-current row and retries against it. Losing that
// race is expected under real concurrency, not a failure.
const MAX_SERVICE_SLUGS_CAS_ATTEMPTS = 5;

// Postgres's own array literal syntax (each element double-quoted, `"`/`\`
// escaped) — needed here because this filters for the column *equaling*
// this exact array (the compare in compare-and-swap), which is a different
// query shape from .in()'s "column is one of these values".
function slugsArrayLiteral(slugs: string[]): string {
  return `{${slugs.map((slug) => `"${slug.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`;
}

async function updateServiceSlugs(id: string, computeNext: (current: string[]) => string[]): Promise<Board | undefined> {
  for (let attempt = 0; attempt < MAX_SERVICE_SLUGS_CAS_ATTEMPTS; attempt++) {
    const board = await resolveBoardById(id);
    if (!board) return undefined;

    const next = computeNext(board.Slugs);
    if (next === board.Slugs) return board;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("boards")
      .update({ service_slugs: next })
      .eq("id", id)
      .eq("service_slugs", slugsArrayLiteral(board.Slugs))
      .select("id, name, service_slugs")
      .maybeSingle();
    if (error) throw error;
    if (data) return toBoard(data as BoardRow);
    // Lost the race — another write landed between the read above and
    // this update. Reread the current row and try again.
  }
  throw new Error(`updateServiceSlugs: too many concurrent writers for board ${id}`);
}

export async function addServiceToBoard(id: string, slug: string): Promise<Board | undefined> {
  return updateServiceSlugs(id, (current) => (current.includes(slug) ? current : [...current, slug]));
}

export async function removeServiceFromBoard(id: string, slug: string): Promise<Board | undefined> {
  return updateServiceSlugs(id, (current) => (current.includes(slug) ? current.filter((s) => s !== slug) : current));
}

// Every service on any of the current user's own boards, deduped — the
// "am I tracking this" signal for /monitors, /api/incidents,
// /api/maintenance, /api/history/*. Session-scoped client: getAllBoards()
// is already limited to the caller's own boards by RLS, so this needs no
// filtering of its own.
export async function getAllTrackedSlugs(): Promise<string[]> {
  const boards = await getAllBoards();
  return [...new Set(boards.flatMap((board) => board.Slugs))];
}

// Every account's tracked slugs, grouped by owner — service-role client,
// for exactly one caller: the cron notifier (lib/notifyIncidentEvents.ts),
// which runs with no user session and needs to know, per account, what
// that account tracks. Never call this from a user-facing code path — it
// bypasses RLS entirely and would leak every account's boards.
export async function getAllTrackedSlugsAcrossUsers(): Promise<Map<string, Set<string>>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("boards").select("user_id, service_slugs");
  if (error) throw error;

  const byUser = new Map<string, Set<string>>();
  for (const row of (data as { user_id: string; service_slugs: string[] | null }[] | null) ?? []) {
    if (!row.service_slugs?.length) continue;
    const slugs = byUser.get(row.user_id) ?? new Set<string>();
    for (const slug of row.service_slugs) slugs.add(slug);
    byUser.set(row.user_id, slugs);
  }
  return byUser;
}

// Same cross-account, service-role read as getAllTrackedSlugsAcrossUsers,
// but keeping each board's own identity (id/name/slugs) rather than
// flattening to one set per account — the one extra caller that actually
// needs per-board grouping: the report-generation cron
// (features/reports/services/reportGeneration.ts), whose per-account
// report has a per-board breakdown section. Never call this from a
// user-facing code path — it bypasses RLS entirely and would leak every
// account's boards.
export async function getAllBoardsAcrossUsers(): Promise<Map<string, Board[]>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("boards").select("id, user_id, name, service_slugs").order("name");
  if (error) throw error;

  const byUser = new Map<string, Board[]>();
  for (const row of (data as (BoardRow & { user_id: string })[] | null) ?? []) {
    const boards = byUser.get(row.user_id) ?? [];
    boards.push(toBoard(row));
    byUser.set(row.user_id, boards);
  }
  return byUser;
}
