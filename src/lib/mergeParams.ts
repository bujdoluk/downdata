// Merges instead of replacing so one filter change keeps other params. Pagination is not reset implicitly.
export function mergeParams(current: URLSearchParams, patch: Record<string, string | null>): URLSearchParams {
  const next = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) next.delete(key);
    else next.set(key, value);
  }
  return next;
}
