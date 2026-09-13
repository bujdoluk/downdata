# Spec: Free Tools footer section + Chrome Extension page

## Objective

downDATA is building a small set of free, standalone tools (SSL checker, downtime/SLA
calculator, Chrome extension) as lead-magnet marketing pages — each one gives something
useful away for free and carries a call-to-action back into the real product, the same
tactic Statusgator/IsDown already use.

This spec covers the **first slice**: the reusable "Free tools" catalog/footer plumbing,
plus the first entry in it — a marketing page for the (not-yet-built) Chrome extension.

**User**: an anonymous visitor who lands on downDATA's marketing site (via search,
a shared link, or the footer) — not a signed-in account holder.

**Success looks like**: a public, indexable `/free-tools/chrome-extension` page exists,
is reachable from a new "Free tools" footer column, correctly tells the visitor the
extension isn't available yet, and the whole thing is built on a catalog structure that
the next two tools (SSL checker, downtime calculator) can drop into without any of this
slice's code changing shape.

**Explicitly out of scope for this slice** (confirmed in the spec interview):
- The actual Chrome extension (separate project/codebase, later work)
- Any waitlist/email-capture form (no data capture in v1 — pure "coming soon" copy)
- SSL checker and downtime calculator pages (future slices of the same catalog)
- Footer entries for those two future tools (only Chrome Extension is linked today)

## Tech Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind v4 + daisyUI 5, i18next —
no new dependency. Matches the rest of this repo (see `AGENTS.md`).

## Commands

```
Dev:         npm run dev
Type check:  npm run type-check
Lint:        npm run lint
Docs:        npm run docs:components   (run after adding the new component's props)
```

## Project Structure

New files:

```
src/lib/freeToolsCatalog.ts                       # FREE_TOOLS_CATALOG + resolveFreeTool(), mirrors
                                                     lib/featureCatalog.ts / lib/integrationCatalog.ts
src/components/icons/NavIcons.tsx                  # + PuzzlePieceIcon (add to existing file, no new file —
                                                     no icon in this file currently represents "extension")
src/app/free-tools/[slug]/page.tsx                 # generateStaticParams/generateMetadata, mirrors
                                                     src/app/integrations/[slug]/page.tsx exactly
src/components/landing-page/FreeToolPageContent.tsx # thin wrapper around CatalogDetailPage, mirrors
                                                     IntegrationPageContent.tsx
```

Modified files:

```
src/components/landing-page/CatalogDetailPage.tsx  # + one optional `comingSoon?: boolean` prop
                                                     (renders a badge; existing Features/Integrations
                                                     callers pass nothing, so their pages don't change)
src/components/landing-page/Footer.tsx             # + one new <nav> column, "Free tools"
src/proxy.ts                                        # PUBLIC_PREFIXES += "/free-tools/"
src/app/robots.ts                                   # allow += "/free-tools/"
src/lib/i18n/locales/*.json (all 13)                # new keys — see Code Style below
```

## Code Style

New catalog file, matching `lib/featureCatalog.ts`'s exact shape:

```ts
import type { ComponentType } from "react";
import { PuzzlePieceIcon } from "@/components/icons/NavIcons";

export type FreeToolSlug = "chrome-extension";

export type FreeToolCatalogEntry = {
  slug: FreeToolSlug;
  icon: ComponentType<{ className?: string }>;
  comingSoon: boolean;
};

export const FREE_TOOLS_CATALOG: FreeToolCatalogEntry[] = [
  { slug: "chrome-extension", icon: PuzzlePieceIcon, comingSoon: true },
];

export function resolveFreeTool(slug: string): FreeToolCatalogEntry | undefined {
  return FREE_TOOLS_CATALOG.find((entry) => entry.slug === slug);
}
```

`FreeToolPageContent.tsx`, matching `IntegrationPageContent.tsx`:

```tsx
"use client";

import type { FreeToolSlug } from "@/lib/freeToolsCatalog";
import { resolveFreeTool } from "@/lib/freeToolsCatalog";
import CatalogDetailPage from "@/components/landing-page/CatalogDetailPage";

export default function FreeToolPageContent({ slug }: { slug: FreeToolSlug }) {
  const tool = resolveFreeTool(slug);
  if (!tool) return null;
  const Icon = tool.icon;

  return <CatalogDetailPage slug={slug} icon={<Icon className="h-7 w-7" />} comingSoon={tool.comingSoon} />;
}
```

i18n keys reuse the existing `nav.<slug>` / `features.<slug>` convention `CatalogDetailPage`
already hardcodes (the same bucket `/integrations/[slug]` already borrows for non-nav
content) — no new i18n namespace:

```json
// en.json — illustrative copy, not final; real copy + all 13 locales done at implement time
"nav": { "chromeExtension": "Chrome Extension" },
"features": { "chromeExtension": "Check any tracked service's status right from your browser toolbar — coming soon." },
"footer": { "freeToolsTitle": "Free tools" },
"landing": { "comingSoon": "Coming soon" }
```

## Testing Strategy

No unit/E2E test suite covers marketing pages today (this repo's Vitest/Playwright
suites cover app logic and the one webhook E2E flow — see `AGENTS.md`'s Testing
section). Verification is `npm run type-check && npm run lint` plus a manual look via
the `run` skill in both themes and at mobile width (footer column count changes wrapping).

## Boundaries

- **Always**: run `npm run type-check && npm run lint` after every file; add real
  (non-machine-translated) copy to all 13 locale files, not English-only; add both new
  public routes to `proxy.ts` and `robots.ts` in this same change.
- **Ask first**: the actual wording of the "coming soon" copy (drafted below, not final
  — flag before shipping if it reads wrong); whether to add an email waitlist later
  (explicitly deferred, not decided against forever).
- **Never**: give the page a working "Add to Chrome" link before the extension exists;
  add SSL-checker/downtime-calculator entries to the footer before those pages exist
  (confirmed out of scope this slice).

## Success Criteria

- [ ] `/free-tools/chrome-extension` renders, is in `proxy.ts`'s `PUBLIC_PREFIXES` and
      `robots.ts`'s `allow` list, and is reachable logged-out
- [ ] The page clearly reads as "coming soon" (a visible badge/label), with no
      non-functional CTA button and no data-capture form
- [ ] Footer has a new "Free tools" column with exactly one link, to that page
- [ ] Adding a second `FREE_TOOLS_CATALOG` entry later requires no change to
      `page.tsx`, `FreeToolPageContent.tsx`, or the footer's rendering logic — only a
      new catalog entry + its own translation keys
- [ ] `npm run type-check` and `npm run lint` both pass clean
- [ ] All 13 locale files carry real translations for every new key

## Open Questions

None outstanding — Q1 (pure "coming soon", no data capture), Q2 (`/free-tools/[slug]`
catalog pattern), and Q3 (footer links only the one live entry) were settled in the
spec interview above.
