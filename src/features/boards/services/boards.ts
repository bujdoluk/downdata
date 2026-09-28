import { cache } from "react";
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

// cache() dedupes the generateMetadata and page calls on /boards/[id].
export const resolveBoardById = cache(async (id: string): Promise<Board | undefined> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("boards").select("id, name, service_slugs").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toBoard(data as BoardRow) : undefined;
});

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

// One insert so a failure never leaves a half-cloned board. The clone deliberately
// gets no board_status_pages row, so it doesn't inherit the source's public URL.
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

// service_slugs is read-modify-written with no lock, so concurrent writes would
// clobber each other. Compare-and-swap on the old array and retry on a lost race.
const MAX_SERVICE_SLUGS_CAS_ATTEMPTS = 5;

// Postgres array literal, for an exact-equality filter (.in() means "one of").
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
  }
  throw new Error(`updateServiceSlugs: too many concurrent writers for board ${id}`);
}

export async function addServiceToBoard(id: string, slug: string): Promise<Board | undefined> {
  return updateServiceSlugs(id, (current) => (current.includes(slug) ? current : [...current, slug]));
}

export async function removeServiceFromBoard(id: string, slug: string): Promise<Board | undefined> {
  return updateServiceSlugs(id, (current) => (current.includes(slug) ? current.filter((s) => s !== slug) : current));
}

export async function getAllTrackedSlugs(): Promise<string[]> {
  const boards = await getAllBoards();
  return [...new Set(boards.flatMap((board) => board.Slugs))];
}

// Service-role, cross-account. Cron notifier only: it bypasses RLS, so never
// call it from a user-facing path.
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

// Service-role, cross-account, per board. Report-generation cron only: it
// bypasses RLS, so never call it from a user-facing path.
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
