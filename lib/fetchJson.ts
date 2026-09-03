// Shared queryFn body for every useQuery/useMutation that talks to this
// app's own API routes — replaces the same res.ok/reject/json dance that
// used to be duplicated at each call site.
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Request to ${url} failed with ${res.status}`);
  return res.json() as Promise<T>;
}

// The mutation-with-a-JSON-error-body sibling of fetchJson — every API
// route in this app returns the same flat { error } shape on failure (see
// AGENTS.md's Error Handling section), so this is the one place that gets
// parsed into a user-facing Error instead of at each mutationFn. `body`
// omitted covers a bodyless POST/DELETE (e.g. the status-page enable/
// disable toggle) without sending an empty JSON payload.
export async function requestJson<T>(url: string, fallbackError: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? "POST",
    ...(init?.body !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(init.body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : fallbackError);
  return data as T;
}

// The common case — POST with a JSON body — kept as its own short call
// shape rather than making every caller spell out { method: "POST", body }.
export function postJson<T>(url: string, body: unknown, fallbackError: string): Promise<T> {
  return requestJson<T>(url, fallbackError, { method: "POST", body });
}
