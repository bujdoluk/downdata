// Shared by lib/pollIncidents.ts (decides whether to store an incident/
// maintenance under a service's slug at all) and
// app/api/summary/[slug]/route.ts (filters/relabels the live component
// list) — one prefix check, used both places, so they can never drift out
// of sync.
//
// Exists for catalog entries whose host now redirects into a shared,
// multi-product status page — SendGrid's into Twilio's combined one
// (status.sendgrid.com -> status.twilio.com) being the first case. That
// page's /api/v2/incidents.json has no per-product filter: it returns
// every incident on the whole page, and the only way to tell which
// product one belongs to is checking which components it actually
// affects. Twilio's real SendGrid-branded components ("SendGrid Mail
// Sending", "SendGrid API", ...) all consistently start with "SendGrid" —
// a prefix check, not a hardcoded list of exact component names/ids, so a
// future 11th SendGrid component picks up support with zero code changes.

function normalizedStartsWith(name: string, prefix: string): boolean {
  return name.toLowerCase().startsWith(prefix.toLowerCase());
}

export function matchesComponentPrefix(name: string, prefix: string): boolean {
  return normalizedStartsWith(name, prefix);
}

// True if at least one component in the list starts with the prefix — an
// incident/maintenance that also touches an unrelated component on the
// same shared page still counts. Excluding it on a technicality would hide
// a real outage from someone tracking this service just because Twilio's
// incident also happened to list an unrelated component.
export function hasMatchingComponent(components: { name: string }[] | null | undefined, prefix: string): boolean {
  return (components ?? []).some((c) => matchesComponentPrefix(c.name, prefix));
}

// Strips the prefix (plus one following space) from a component's name for
// display — a user already looking at "SendGrid"'s page doesn't need every
// single component repeating "SendGrid " in front of it. Returns the name
// unchanged if it doesn't actually start with the prefix (defensive —
// callers are expected to have already filtered to matching components).
export function stripComponentPrefix(name: string, prefix: string): string {
  if (!matchesComponentPrefix(name, prefix)) return name;
  return name.slice(prefix.length).trimStart();
}
