export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Request to ${url} failed with ${res.status}`);
  return res.json() as Promise<T>;
}

export async function requestJson<T>(url: string, fallbackError: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? "POST",
    ...(init?.body !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(init.body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : fallbackError);
  return data as T;
}

export function postJson<T>(url: string, body: unknown, fallbackError: string): Promise<T> {
  return requestJson<T>(url, fallbackError, { method: "POST", body });
}
