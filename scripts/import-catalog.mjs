// One-shot bulk loader for the catalog table — reads a JSON file of
// [{ name, host, category? }, ...], validates each host actually serves a
// Statuspage-shaped /api/v2/status.json (the same check
// POST /api/boards/[id]/services runs for a single manually-added host —
// see src/app/api/boards/[id]/services/route.ts), skips any entry whose
// host is already in the catalog (not just a matching slug — mirrors
// src/lib/catalog.ts's ensureCatalogEntry()), and upserts the rest.
// Run via `npm run import:catalog -- path/to/hosts.json`.
//
// ponytail: JSON only, no CSV — add a CSV parser (quoting/escaping is real
// work) when there's an actual CSV source to import, not speculatively.

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const path = process.argv[2];
if (!path) {
  console.error("Usage: npm run import:catalog -- path/to/hosts.json");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set — see .env.example.");
  process.exit(1);
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Matches types/service.ts's Category union — kept as a literal list here
// rather than imported, since this is a plain Node script outside the
// TypeScript/bundler graph.
const VALID_CATEGORIES = new Set([
  "infrastructure",
  "devtools",
  "database",
  "communication",
  "ai",
  "payments",
  "auth",
  "projectManagement",
  "accounting",
  "analytics",
  "automation",
  "cryptocurrencies",
  "cybersecurity",
  "design",
  "education",
  "healthcare",
  "hr",
  "legal",
  "logistics",
  "marketing",
  "realEstate",
  "sales",
  "socialMedia",
  "other",
]);

// Same check POST /api/boards/[id]/services runs before tracking a single
// manually-added host — confirms this actually looks like an Atlassian
// Statuspage-based status page before it ever lands in the catalog, so a
// typo'd or dead host doesn't sit there quietly failing every poll cycle
// instead of being caught once, here, up front.
async function checkStatuspageHost(host) {
  try {
    const res = await fetch(`https://${host}/api/v2/status.json`, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const data = await res.json();
    if (!data?.status?.indicator) return { ok: false, reason: "not a Statuspage-shaped response" };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "unreachable" };
  }
}

const entries = JSON.parse(await readFile(path, "utf8"));
const supabase = createClient(url, key);

const { data: existingRows, error: fetchError } = await supabase.from("catalog").select("slug, host");
if (fetchError) {
  console.error("Failed to load the existing catalog for duplicate checks:", fetchError.message);
  process.exit(1);
}
const existingHosts = new Set((existingRows ?? []).map((row) => row.host.toLowerCase()));
const existingSlugs = new Set((existingRows ?? []).map((row) => row.slug));

let imported = 0;
let skippedMalformed = 0;
const duplicates = [];
const invalidHosts = [];

for (const entry of entries) {
  const name = entry.name?.trim();
  const host = entry.host?.trim();
  const category = entry.category?.trim();

  if (!name || !host) {
    console.error(`Skipping malformed entry (missing name/host): ${JSON.stringify(entry)}`);
    skippedMalformed++;
    continue;
  }
  if (category && !VALID_CATEGORIES.has(category)) {
    console.error(`Skipping "${name}": unknown category "${category}" (expected one of ${[...VALID_CATEGORIES].join(", ")})`);
    skippedMalformed++;
    continue;
  }

  const hostKey = host.toLowerCase();
  if (existingHosts.has(hostKey)) {
    duplicates.push(`${name} (${host})`);
    continue;
  }

  const validation = await checkStatuspageHost(host);
  if (!validation.ok) {
    invalidHosts.push(`${name} (${host}): ${validation.reason}`);
    continue;
  }

  const baseSlug = slugify(name) || "service";
  let slug = baseSlug;
  let suffix = 2;
  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const { error } = await supabase.from("catalog").insert({ slug, name, host, category: category || "other" });
  if (error) {
    console.error(`Failed to import "${name}" (${host}):`, error.message);
    skippedMalformed++;
    continue;
  }

  // Track what this run just added so a later duplicate host *within the
  // same file* is caught too, not just ones already in the DB before this
  // run started.
  existingHosts.add(hostKey);
  existingSlugs.add(slug);
  imported++;
}

console.log(`\nImported ${imported} of ${entries.length}.`);
if (duplicates.length > 0) {
  console.log(`\nSkipped ${duplicates.length} duplicate host(s) (already in the catalog):`);
  duplicates.forEach((line) => console.log(`  - ${line}`));
}
if (invalidHosts.length > 0) {
  console.log(`\nSkipped ${invalidHosts.length} host(s) that failed the Statuspage check:`);
  invalidHosts.forEach((line) => console.log(`  - ${line}`));
}
if (skippedMalformed > 0) {
  console.log(`\n${skippedMalformed} entr${skippedMalformed === 1 ? "y" : "ies"} malformed or failed to insert — see errors above.`);
}

if (skippedMalformed > 0) process.exit(1);
