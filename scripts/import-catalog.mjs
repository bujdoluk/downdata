// One-shot bulk loader for the catalog table — reads a JSON file of
// [{ name, host, category? }, ...] and upserts each into `catalog` via the
// service-role key. Run via `npm run import:catalog -- path/to/hosts.json`.
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

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set — see .env.example.");
  process.exit(1);
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const entries = JSON.parse(await readFile(path, "utf8"));
const supabase = createClient(url, key);

let imported = 0;
let failed = 0;

for (const entry of entries) {
  const name = entry.name?.trim();
  const host = entry.host?.trim();
  if (!name || !host) {
    console.error(`Skipping invalid entry: ${JSON.stringify(entry)}`);
    failed++;
    continue;
  }

  // No collision-suffixing (unlike addService) — a slug or host that
  // already exists is silently left alone (ignoreDuplicates), not retried
  // under a different slug. Fine for a bulk one-shot import; re-run after
  // renaming a conflicting source entry if you need it in under a
  // different slug.
  const slug = slugify(name) || "service";
  const { error } = await supabase
    .from("catalog")
    .upsert({ slug, name, host, category: entry.category ?? "other" }, { onConflict: "slug", ignoreDuplicates: true });

  if (error) {
    console.error(`Failed to import "${name}" (${host}):`, error.message);
    failed++;
  } else {
    imported++;
  }
}

console.log(`Imported ${imported} entries, ${failed} failed, out of ${entries.length} total.`);
if (failed > 0) process.exit(1);
