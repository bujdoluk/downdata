import { getSupabaseClient } from "@/lib/supabase";
import type { Board } from "@/types/board";

type BoardRow = { id: string; name: string; service_slugs: string[] | null };

function toBoard(row: BoardRow): Board {
  return { id: row.id, name: row.name, serviceSlugs: row.service_slugs ?? [] };
}

export async function getAllBoards(): Promise<Board[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("boards").select("id, name, service_slugs").order("name");
  if (error) throw error;
  return (data as BoardRow[] | null)?.map(toBoard) ?? [];
}

export async function resolveBoardById(id: string): Promise<Board | undefined> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("boards").select("id, name, service_slugs").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toBoard(data as BoardRow) : undefined;
}

export async function addBoard(name: string): Promise<Board> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("boards").insert({ name: name.trim() }).select("id, name, service_slugs").single();
  if (error) throw error;
  return toBoard(data as BoardRow);
}

export async function renameBoard(id: string, name: string): Promise<Board | undefined> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("boards")
    .update({ name: name.trim() })
    .eq("id", id)
    .select("id, name, service_slugs")
    .maybeSingle();
  if (error) throw error;
  return data ? toBoard(data as BoardRow) : undefined;
}

export async function removeBoard(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("boards").delete().eq("id", id).select();
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function addServiceToBoard(id: string, slug: string): Promise<Board | undefined> {
  const board = await resolveBoardById(id);
  if (!board) return undefined;
  if (board.serviceSlugs.includes(slug)) return board;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("boards")
    .update({ service_slugs: [...board.serviceSlugs, slug] })
    .eq("id", id)
    .select("id, name, service_slugs")
    .single();
  if (error) throw error;
  return toBoard(data as BoardRow);
}

export async function removeServiceFromBoard(id: string, slug: string): Promise<Board | undefined> {
  const board = await resolveBoardById(id);
  if (!board) return undefined;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("boards")
    .update({ service_slugs: board.serviceSlugs.filter((s) => s !== slug) })
    .eq("id", id)
    .select("id, name, service_slugs")
    .single();
  if (error) throw error;
  return toBoard(data as BoardRow);
}
