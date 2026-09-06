export function parseImpacts(searchParams: URLSearchParams, allImpacts: string[]): Set<string> {
  const raw = searchParams.get("impacts");
  if (raw === null) return new Set(allImpacts);
  return new Set(raw.split(",").filter(Boolean));
}

export function serializeImpacts(impacts: Set<string>, allImpacts: string[]): string | null {
  return impacts.size === allImpacts.length ? null : [...impacts].sort().join(",");
}
