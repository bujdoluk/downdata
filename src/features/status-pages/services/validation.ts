import { z } from "zod";

// Shared by the API routes and the settings form. Messages are plain English like
// other API error strings, not i18n.

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

// zod's ipv4()/ipv6(), not node:net's isIP(), because this schema also runs client-side.
const CIDR_HINT = "Enter a single IPv4 or IPv6 address. IP ranges (CIDR, like 1.2.3.0/24) aren't supported yet.";
export const ipAddressSchema = z.union([z.ipv4(), z.ipv6()], { error: CIDR_HINT });

export const MAX_ALLOWED_IPS = 20;
export const allowedIpsSchema = z
  .array(ipAddressSchema)
  .max(MAX_ALLOWED_IPS, `You can add at most ${MAX_ALLOWED_IPS} IP addresses. Remove some before saving.`);

export function firstIssueMessage(result: z.ZodSafeParseResult<unknown>): string | null {
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "Invalid value.";
}

// Caps the echoed value so a huge single-line paste isn't repeated in full. 80 is well
// past the longest real address (45), so genuine typos still show whole.
const ECHO_MAX_LENGTH = 80;
function truncateForDisplay(value: string): string {
  return value.length > ECHO_MAX_LENGTH ? `${value.slice(0, ECHO_MAX_LENGTH)}…` : value;
}

// zod's union issue lacks the offending value, so this re-attaches it to say which line is wrong.
export function firstAllowedIpsIssueMessage(result: z.ZodSafeParseResult<unknown>, entries: string[]): string | null {
  if (result.success) return null;
  const issue = result.error.issues[0];
  const index = issue?.path[0];
  if (typeof index === "number" && index in entries) {
    // Safe: `index in entries` just confirmed this index is populated.
    return `"${truncateForDisplay(entries[index]!)}" isn't a valid IP address. ${CIDR_HINT}`;
  }
  return issue?.message ?? "Invalid value.";
}
