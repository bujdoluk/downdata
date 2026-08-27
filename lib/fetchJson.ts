// Shared queryFn body for every useQuery/useMutation that talks to this
// app's own API routes — replaces the same res.ok/reject/json dance that
// used to be duplicated at each call site.
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Request to ${url} failed with ${res.status}`);
  return res.json() as Promise<T>;
}
