import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getCatalog } from "@/lib/catalog";
import { fetchStatusBatch } from "@/lib/statusBatch";
import { getServiceUptimeSummary } from "@/lib/uptime";
import type { BoardStatusPage, PublicStatusPage, PublicStatusPageService } from "@/features/status-pages/types";

type StatusPageRow = {
  board_id: string;
  slug: string;
  enabled: boolean;
  company_name: string | null;
  logo_url: string | null;
  hide_branding: boolean;
};

const SELECT_COLUMNS = "board_id, slug, enabled, company_name, logo_url, hide_branding";

function toBoardStatusPage(row: StatusPageRow): BoardStatusPage {
  return {
    boardId: row.board_id,
    slug: row.slug,
    enabled: row.enabled,
    companyName: row.company_name,
    logoUrl: row.logo_url,
    hideBranding: row.hide_branding,
  };
}

// This board's own status page settings, or null if it's never been
// created — RLS (board_status_pages_select) already limits this to the
// caller's own boards, same as lib/boards.ts.
export async function getStatusPage(boardId: string): Promise<BoardStatusPage | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("board_status_pages").select(SELECT_COLUMNS).eq("board_id", boardId).maybeSingle();
  if (error) throw error;
  return data ? toBoardStatusPage(data as StatusPageRow) : null;
}

// Create-or-update the branding/slug settings — never touches `enabled`,
// which has its own dedicated setEnabled() below so the quota check (done
// by the caller, app/api/boards/[id]/status-page/enable/route.ts) only
// ever runs at the moment a page actually goes live, not on every
// branding save.
export async function upsertStatusPage(
  boardId: string,
  input: { slug: string; companyName: string | null; logoUrl: string | null; hideBranding: boolean },
): Promise<BoardStatusPage> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("board_status_pages")
    .upsert(
      { board_id: boardId, slug: input.slug, company_name: input.companyName, logo_url: input.logoUrl, hide_branding: input.hideBranding },
      { onConflict: "board_id" },
    )
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return toBoardStatusPage(data as StatusPageRow);
}

export async function setEnabled(boardId: string, enabled: boolean): Promise<BoardStatusPage | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("board_status_pages")
    .update({ enabled })
    .eq("board_id", boardId)
    .select(SELECT_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data ? toBoardStatusPage(data as StatusPageRow) : undefined;
}

// How many of the caller's own status pages are currently live — the
// quota check's input (compared against PLAN_CATALOG[tier].features.
// statusPages in the enable route). RLS already scopes this to the
// caller's own boards.
export async function countEnabledStatusPages(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase.from("board_status_pages").select("*", { count: "exact", head: true }).eq("enabled", true);
  if (error) throw error;
  return count ?? 0;
}

// The caller's own enabled status pages, board name + slug only — the
// embed configurator's board picker (features/status-pages/components/
// EmbedConfigurator.tsx, surfaced on /integrations) needs exactly this:
// an embed only makes sense for a board that already has a live public
// page, and its badge URL is keyed by that page's own slug. RLS on
// board_status_pages already scopes this to the caller's own rows (see
// 0025_board_status_pages.sql — a flat user_id column, not a join), so no
// separate ownership check is needed here.
export async function getAllEnabledStatusPages(): Promise<{ boardId: string; boardName: string; slug: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("board_status_pages").select("board_id, slug, boards(name)").eq("enabled", true);
  if (error) throw error;

  // board_id is unique on this table (0025_board_status_pages.sql), so
  // this is really a one-to-one relationship — but Supabase's query
  // builder types an embedded resource as an array regardless, same
  // "as unknown as" cast getPublicStatusPageBySlug above already needs
  // for the identical boards(...) embed.
  return ((data ?? []) as { board_id: string; slug: string; boards: unknown }[])
    .map((row) => ({ boardId: row.board_id, slug: row.slug, boards: row.boards as unknown as { name: string } | null }))
    .filter((row): row is typeof row & { boards: { name: string } } => row.boards !== null)
    .map((row) => ({ boardId: row.boardId, boardName: row.boards.name, slug: row.slug }));
}

export type PublicStatusPageRow = {
  slug: string;
  companyName: string | null;
  logoUrl: string | null;
  hideBranding: boolean;
  boardName: string;
  serviceSlugs: string[];
};

// The public read path — service-role, not RLS: this is server-side
// Next.js code (GET /api/public/status/[slug] and app/status/[slug]/
// page.tsx), not a browser Supabase call, so it follows the same rule
// AGENTS.md documents for boards.ts's getAllTrackedSlugsAcrossUsers() —
// one narrowly-scoped service-role function for exactly this caller,
// which also needs boards.name/service_slugs for the same row (no
// ownership RLS could join across tables here anyway). The `enabled`
// filter is the entire authorization check; never call this without it.
export async function getPublicStatusPageBySlug(slug: string): Promise<PublicStatusPageRow | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("board_status_pages")
    .select("slug, company_name, logo_url, hide_branding, boards(name, service_slugs)")
    .eq("slug", slug)
    .eq("enabled", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const board = data.boards as unknown as { name: string; service_slugs: string[] | null } | null;
  if (!board) return null; // board_id's referenced row is gone — on delete cascade should prevent this, defensive only

  return {
    slug: data.slug,
    companyName: data.company_name,
    logoUrl: data.logo_url,
    hideBranding: data.hide_branding,
    boardName: board.name,
    serviceSlugs: board.service_slugs ?? [],
  };
}

// The full public-page payload — resolves the row, then live status +
// 30-day uptime for every one of the board's services. Shared by
// app/status/[slug]/page.tsx's initial server render and
// GET /api/public/status/[slug] (that same page's client-side 60s poll),
// so the assembly logic exists in exactly one place.
//
// Wrapped in React's cache() — app/status/[slug]/page.tsx calls this once
// in generateMetadata and once in the page component; without dedup, that
// doubled a DB read + a full catalog fetch + a live upstream status fetch
// per tracked service + a per-service uptime computation, all on every
// load of a public status page. cache() collapses the two into one.
export const getPublicStatusPage = cache(async (slug: string): Promise<PublicStatusPage | null> => {
  const statusPage = await getPublicStatusPageBySlug(slug);
  if (!statusPage) return null;

  // getCatalog() is already ordered by name — filtering it (rather than
  // iterating serviceSlugs directly) gives the public list the same
  // alphabetical order BoardDetailContent's onBoardEntries relies on.
  const catalog = await getCatalog();
  const trackedSlugs = new Set(statusPage.serviceSlugs);
  const entries = catalog.filter((entry) => trackedSlugs.has(entry.slug));

  const [statusBatch, uptimeSummaries] = await Promise.all([
    fetchStatusBatch(entries.map((entry) => ({ slug: entry.slug, host: entry.host }))),
    Promise.all(entries.map((entry) => getServiceUptimeSummary(entry.slug))),
  ]);

  const services: PublicStatusPageService[] = entries.map((entry, index) => {
    const status = statusBatch[entry.slug];
    // uptimeSummaries[index] is guaranteed present — built from the same
    // entries array via Promise.all, same order, same length.
    const uptime = uptimeSummaries[index]!;
    return {
      slug: entry.slug,
      name: entry.name,
      indicator: status && "status" in status ? status.status.indicator : null,
      last30DaysIncidents: uptime.last30DaysIncidents,
      trackedSince: uptime.trackedSince,
      official30daysUptime: uptime.official30daysUptime,
      uptimeWindowDays: uptime.uptimeWindowDays,
    };
  });

  return {
    slug: statusPage.slug,
    companyName: statusPage.companyName ?? statusPage.boardName,
    logoUrl: statusPage.logoUrl,
    hideBranding: statusPage.hideBranding,
    services,
  };
});
