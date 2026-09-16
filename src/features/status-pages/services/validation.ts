import { z } from "zod";

// Shared by both the settings API routes (server-side, can't be skipped by
// a hand-edited request) and BoardStatusPageSettings.tsx (client-side, for
// feedback before the user ever clicks Save) — one set of rules instead of
// the two independently hand-rolled copies this used to be. Messages are
// plain English, not run through i18n, matching this app's existing
// convention for API error strings (see AGENTS.md's Error Handling section
// and e.g. the "That URL is already taken" message from the status-page
// route) — they're shown to the user as-is either way.

// Public URL slug (/status/:slug). board_status_pages.slug is a plain
// `text` column with no DB-level length cap — the old 3-63 range was just
// borrowing the classic single DNS-label limit (63 octets) even though
// this slug is a URL path segment, never an actual DNS label. Raised to
// 100 (same order of magnitude as company name's own 120) since nothing
// technical was actually capping it at 63.
export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 100;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(SLUG_MIN_LENGTH, `Your status page URL needs at least ${SLUG_MIN_LENGTH} characters.`)
  .max(SLUG_MAX_LENGTH, `Your status page URL can be at most ${SLUG_MAX_LENGTH} characters.`)
  .regex(SLUG_PATTERN, "Use only lowercase letters, numbers, and hyphens. It can't start, end, or repeat with a hyphen.");

export const COMPANY_NAME_MAX_LENGTH = 120;
export const companyNameSchema = z
  .string()
  .trim()
  .max(COMPANY_NAME_MAX_LENGTH, `Company name can be at most ${COMPANY_NAME_MAX_LENGTH} characters.`);

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`);

// node:net's isIP() only runs server-side, so it can't back a shared
// schema the client also uses — zod's own ipv4()/ipv6() are pure JS and
// work in both places. No .ip() combinator that accepts either version at
// once exists in this zod version, hence the union. No CIDR support here
// either, same as before.
const CIDR_HINT = "Enter a single IPv4 or IPv6 address. IP ranges (CIDR, like 1.2.3.0/24) aren't supported yet.";
export const ipAddressSchema = z.union([z.ipv4(), z.ipv6()], { error: CIDR_HINT });

export const MAX_ALLOWED_IPS = 20;
export const allowedIpsSchema = z
  .array(ipAddressSchema)
  .max(MAX_ALLOWED_IPS, `You can add at most ${MAX_ALLOWED_IPS} IP addresses. Remove some before saving.`);

// Every call site (3 API routes, 1 form) was about to repeat the same
// "pull the first issue's message back out" line — this is that line,
// written once.
export function firstIssueMessage(result: z.ZodSafeParseResult<unknown>): string | null {
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "Invalid value.";
}

// The textarea's own maxLength caps the *total* pasted length, not any one
// line — a single line with no newlines can still be hundreds of
// characters, and this message used to echo it back in full (break-all in
// BoardStatusPageSettings.tsx kept that from overflowing the layout, but a
// several-hundred-character wall of garbage in an error message is still
// unreadable even wrapped). Truncated well past the longest a real address
// ever gets (45, an IPv4-mapped IPv6 literal — see the maxLength comment in
// BoardStatusPageSettings.tsx) so every genuine typo still shows in full;
// only actual garbage pastes get cut off.
const ECHO_MAX_LENGTH = 80;
function truncateForDisplay(value: string): string {
  return value.length > ECHO_MAX_LENGTH ? `${value.slice(0, ECHO_MAX_LENGTH)}…` : value;
}

// allowedIpsSchema's own issues don't carry the offending value (zod's
// union error has no access to the original array), so this re-attaches
// it for a message a user can actually act on — "which line is wrong",
// not just "something in this list is wrong". Falls back to the array-
// level message (e.g. the max-count one) when the failing issue isn't
// about one specific entry.
export function firstAllowedIpsIssueMessage(result: z.ZodSafeParseResult<unknown>, entries: string[]): string | null {
  if (result.success) return null;
  const issue = result.error.issues[0];
  const index = issue?.path[0];
  if (typeof index === "number" && index in entries) {
    // Safe: the `index in entries` check above just confirmed this index
    // is populated (noUncheckedIndexedAccess can't see that from here).
    return `"${truncateForDisplay(entries[index]!)}" isn't a valid IP address. ${CIDR_HINT}`;
  }
  return issue?.message ?? "Invalid value.";
}
