// TODO: replace with a real, monitored inbox before this ships — flagged for
// the user rather than invented, since a wrong address here is a broken
// contact point, not a cosmetic bug.
export const SUPPORT_EMAIL = "[Insert your support email here]";

// Shared between the client (RequestCard's maxLength/counter) and the
// server (POST /api/requests's own validation) — these two need to agree,
// unlike most per-file constants in this app (see AGENTS.md's Naming
// section on why e.g. POLL_INTERVAL_MS stays repeated per-file instead).
export const MAX_MESSAGE_LENGTH = 500;
