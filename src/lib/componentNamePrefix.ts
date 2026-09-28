// For hosts that redirect into a shared multi-product page (e.g. SendGrid -> Twilio), whose
// incident feed has no product filter. Shared by the poller and summary route so they can't drift.

function normalizedStartsWith(name: string, prefix: string): boolean {
  return name.toLowerCase().startsWith(prefix.toLowerCase());
}

export function matchesComponentPrefix(name: string, prefix: string): boolean {
  return normalizedStartsWith(name, prefix);
}

// Any match counts, so an incident also listing unrelated components isn't hidden.
export function hasMatchingComponent(components: { name: string }[] | null | undefined, prefix: string): boolean {
  return (components ?? []).some((c) => matchesComponentPrefix(c.name, prefix));
}

export function stripComponentPrefix(name: string, prefix: string): string {
  if (!matchesComponentPrefix(name, prefix)) return name;
  return name.slice(prefix.length).trimStart();
}
