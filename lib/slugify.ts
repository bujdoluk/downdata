// Shared by lib/catalog.ts's ensureCatalogEntry (new host slugs) and the
// status page settings panel (public URL slug suggestion) — same
// lowercase/hyphenate rule either way, extracted here once it had a
// second caller.
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
