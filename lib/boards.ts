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

export async function addServiceToBoard(id: string, slug: string): Promise<Board | undefined> {
  const board = await resolveBoardById(id);
  if (!board) return undefined;
  if (board.Slugs.includes(slug)) return board;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boards")
    .update({ service_slugs: [...board.Slugs, slug] })
    .eq("id", id)
    .select("id, name, service_slugs")
    .single();
  if (error) throw error;
  return toBoard(data as BoardRow);
}

export async function removeServiceFromBoard(id: string, slug: string): Promise<Board | undefined> {
  const board = await resolveBoardById(id);
  if (!board) return undefined;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boards")
    .update({ service_slugs: board.Slugs.filter((s) => s !== slug) })
    .eq("id", id)
    .select("id, name, service_slugs")
    .single();
  if (error) throw error;
  return toBoard(data as BoardRow);
}

// Untracks a service everywhere at once — the /monitors aggregate view's
// remove action, where "which board did you mean" doesn't apply since a
// service can be on several of the caller's own boards simultaneously.
// One server round trip owning the whole operation, rather than the
// client fetching the board list itself and firing one DELETE per board.
export async function removeServiceFromAllBoards(slug: string): Promise<void> {
  const boards = (await getAllBoards()).filter((board) => board.Slugs.includes(slug));
  await Promise.all(boards.map((board) => removeServiceFromBoard(board.id, slug)));
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
