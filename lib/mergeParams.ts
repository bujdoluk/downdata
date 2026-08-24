// Merges a patch into the *existing* query string instead of replacing it —
// every URL write on the Incidents/Maintenance pages goes through this, so
// selecting a row or flipping one filter never wipes out every other param.
// Deleting a key happens by passing null; nothing resets pagination as a
// side effect — callers that are genuinely a filter change include
// `page: null` in their own patch explicitly.
export function mergeParams(current: URLSearchParams, patch: Record<string, string | null>): URLSearchParams {
  const next = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) next.delete(key);
    else next.set(key, value);
  }
  return next;
}
