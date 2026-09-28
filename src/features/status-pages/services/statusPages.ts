import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getCatalog } from "@/lib/catalog";
import { fetchStatusBatch } from "@/lib/statusBatch";
import { getServiceUptimeSummary } from "@/lib/uptime";
import { getClientIp, getCookieFromHeader, hashPassword, isStatusPageUnlocked, unlockCookieName } from "@/features/status-pages/services/passwordProtection";
import type { BoardStatusPage, PublicStatusPage, PublicStatusPageService } from "@/features/status-pages/types";

type StatusPageRow = {
  board_id: string;
  slug: string;
  enabled: boolean;
  company_name: string | null;
  logo_url: string | null;
  hide_branding: boolean;
  password_hash: string | null;
  allowed_ips: string[] | null;
};

const SELECT_COLUMNS = "board_id, slug, enabled, company_name, logo_url, hide_branding, password_hash, allowed_ips";

function toBoardStatusPage(row: StatusPageRow): BoardStatusPage {
  return {
    boardId: row.board_id,
    slug: row.slug,
    enabled: row.enabled,
    companyName: row.company_name,
    logoUrl: row.logo_url,
    hideBranding: row.hide_branding,
    passwordProtected: row.password_hash !== null,
    allowedIps: row.allowed_ips ?? [],
  };
}

export async function getStatusPage(boardId: string): Promise<BoardStatusPage | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("board_status_pages").select(SELECT_COLUMNS).eq("board_id", boardId).maybeSingle();
  if (error) throw error;
  return data ? toBoardStatusPage(data as StatusPageRow) : null;
}

// Never touches `enabled`, so the plan quota check only runs in the enable route.
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

async function updateStatusPageRow(
  boardId: string,
  patch: Partial<Pick<StatusPageRow, "enabled" | "password_hash" | "allowed_ips">>,
): Promise<BoardStatusPage | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("board_status_pages").update(patch).eq("board_id", boardId).select(SELECT_COLUMNS).maybeSingle();
  if (error) throw error;
  return data ? toBoardStatusPage(data as StatusPageRow) : undefined;
}

export function setEnabled(boardId: string, enabled: boolean): Promise<BoardStatusPage | undefined> {
  return updateStatusPageRow(boardId, { enabled });
}

// No "old password" check: RLS plus the owner's session already gate this, like branding.
export async function setPassword(boardId: string, password: string): Promise<BoardStatusPage | undefined> {
  const passwordHash = await hashPassword(password);
  return updateStatusPageRow(boardId, { password_hash: passwordHash });
}

// Clearing password_hash also invalidates every issued unlock cookie (see deriveUnlockKey).
export function removePassword(boardId: string): Promise<BoardStatusPage | undefined> {
  return updateStatusPageRow(boardId, { password_hash: null });
}

// Trusts its input: IP format is validated in the allowed-ips route.
export function setAllowedIps(boardId: string, allowedIps: string[]): Promise<BoardStatusPage | undefined> {
  return updateStatusPageRow(boardId, { allowed_ips: allowedIps });
}

export async function countEnabledStatusPages(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase.from("board_status_pages").select("*", { count: "exact", head: true }).eq("enabled", true);
  if (error) throw error;
  return count ?? 0;
}

// Only live pages: an embed badge is keyed by a published page's slug.
export async function getAllEnabledStatusPages(): Promise<{ boardId: string; boardName: string; slug: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("board_status_pages").select("board_id, slug, boards(name)").eq("enabled", true);
  if (error) throw error;

  // board_id is unique, so boards(...) is one-to-one, but Supabase types embeds as arrays.
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

// Service-role public read for anonymous visitors. The `enabled` filter is the
// entire authorization check; never drop it.
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

  // One-to-one embed (board_id is unique), typed as an array by Supabase.
  const board = data.boards as unknown as { name: string; service_slugs: string[] | null } | null;
  if (!board) return null; // defensive: on delete cascade should prevent this

  return {
    slug: data.slug,
    companyName: data.company_name,
    logoUrl: data.logo_url,
    hideBranding: data.hide_branding,
    boardName: board.name,
    serviceSlugs: board.service_slugs ?? [],
  };
}

export type StatusPageProtection = {
  id: string;
  passwordHash: string | null;
  allowedIps: string[];
};

// Kept separate from getPublicStatusPageBySlug so password_hash can never reach a
// serialized public payload. cache() dedupes generateMetadata + page reads.
export const getStatusPageProtectionBySlug = cache(async (slug: string): Promise<StatusPageProtection | null> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("board_status_pages")
    .select("id, password_hash, allowed_ips")
    .eq("slug", slug)
    .eq("enabled", true)
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, passwordHash: data.password_hash, allowedIps: data.allowed_ips ?? [] } : null;
});

// For route handlers only; the Server Component page reads the cookie via next/headers instead.
export async function resolveStatusPageAccess(
  slug: string,
  headers: Headers,
): Promise<{ protection: StatusPageProtection | null; unlocked: boolean }> {
  const protection = await getStatusPageProtectionBySlug(slug);
  if (!protection) return { protection: null, unlocked: false };

  const clientIp = getClientIp(headers);
  const cookieValue = getCookieFromHeader(headers.get("cookie"), unlockCookieName(slug));
  return { protection, unlocked: isStatusPageUnlocked(protection, { clientIp, cookieValue }) };
}

// cache() dedupes the generateMetadata + page calls, each of which would refetch
// catalog, live status and uptime for every service.
export const getPublicStatusPage = cache(async (slug: string): Promise<PublicStatusPage | null> => {
  const statusPage = await getPublicStatusPageBySlug(slug);
  if (!statusPage) return null;

  // Filtering the name-ordered catalog (not serviceSlugs) keeps the list alphabetical.
  const catalog = await getCatalog();
  const trackedSlugs = new Set(statusPage.serviceSlugs);
  const entries = catalog.filter((entry) => trackedSlugs.has(entry.slug));

  const [statusBatch, uptimeSummaries] = await Promise.all([
    fetchStatusBatch(entries.map((entry) => ({ slug: entry.slug, host: entry.host }))),
    Promise.all(entries.map((entry) => getServiceUptimeSummary(entry.slug))),
  ]);

  const services: PublicStatusPageService[] = entries.map((entry, index) => {
    const status = statusBatch[entry.slug];
    // Safe: uptimeSummaries is mapped from the same entries array, same length.
    const uptime = uptimeSummaries[index]!;
    return {
      slug: entry.slug,
      name: entry.name,
      indicator: status && "status" in status ? status.status.indicator : null,
      openIncidentImpact: status && "status" in status ? status.openIncidentImpact : undefined,
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
