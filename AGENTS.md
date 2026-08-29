<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Ask before you assume

- Ask before changing the shape of `types/service.ts` (`ServiceDefinition`/`CatalogEntry`) or an API route's response shape — components across `service/`, `landing-page/`, and both grid components read them structurally; a silent shape change breaks callers TypeScript won't catch if the new shape still happens to fit
- Ask before adding a new top-level folder — everything so far fits in `app/`, `components/`, `lib/`, `types/`
- If you spot something adjacent that looks wrong while working (dead code, a duplicate, a stale comment), say so and confirm before touching it rather than folding it into the current change unasked — this repo has real history of "found it, asked, then deleted" being the right call (see the Failure log)
- Don't invent copy or product decisions — new user-facing strings still need a real translation pass across all 13 locales, not just an English placeholder

## 🛠️ Development Environment

- **Language**: TypeScript (`^5`), full config in `tsconfig.json`. The flags that actually change how you write code here:
  - `strict` + `noImplicitReturns` + `noFallthroughCasesInSwitch` + `noImplicitOverride` — the usual strict set
  - `noUncheckedIndexedAccess` — any `array[i]` or `record[key]` access is typed `T | undefined`, even when the key looks exhaustive. Handle it at the call site (`INDICATOR_STYLES[key] ?? FALLBACK_STYLE`) or assert with a comment explaining why it's safe (`languages[0]!` — `languages` is a fixed non-empty literal array)
  - `verbatimModuleSyntax` — type-only imports must use `import type` (or `import { type X }`), or the build fails
  - `moduleResolution: "bundler"` + `resolveJsonModule` — locale JSON files import directly (`import en from "./locales/en.json"`)
  - `paths`: `@/*` → repo root — always import via `@/...`, never a relative `../../` chain
- **Framework**: Next.js 16 (App Router) — see the warning above; this is a modified/future version, not the Next.js in your training data
- **Runtime/UI**: React 19
- **Client data fetching/caching**: TanStack Query (`@tanstack/react-query`) — every client-side `fetch`/poll/mutation goes through `useQuery`/`useMutation`, provided by `components/providers/QueryProvider.tsx` (mounted once in `app/layout.tsx`, one `QueryClient` per mount via `useState`, not module scope). Query keys are centralized in `lib/queryKeys.ts`; `lib/fetchJson.ts` is the shared `queryFn` body. This does **not** replace Server Components' own data fetching (`page.tsx` files reading via `lib/services.ts`/`lib/boards.ts`/etc. still run server-side and are unrelated to the query cache) — a mutation that changes data a Server Component prop depends on still needs `router.refresh()` alongside (or instead of) `invalidateQueries`
- **Styling**: Tailwind CSS v4 + daisyUI 5 (config lives in `app/globals.css` via `@import "tailwindcss"` / `@plugin "daisyui"` — there is no `tailwind.config.ts`)
- **Component library**: none — hand-rolled components styled with daisyUI classes + Tailwind utilities
- **Data layer**: Supabase (Postgres). Tracked services/boards/integrations live in `services`/`boards`/`integrations` tables, read/written via `lib/services.ts`/`lib/boards.ts`/`lib/integrations.ts`; the fixed catalog of known services (previously an in-code `SERVICE_CATALOG` constant) is now itself a `catalog` table, read via `lib/catalog.ts`'s `getCatalog()` and reseeded with `npm run import:catalog` (`scripts/import-catalog.mjs`) — all async now (they used to be synchronous `fs` reads/writes against `data/*.json`, which broke entirely on Vercel's read-only deployed filesystem; see the Failure log). Incident history for the 1-minute poller lives in `incidents`/`incident_updates`/`incident_events`/`incident_event_deliveries` (see `supabase/migrations/`); maintenance history follows the same shape via `lib/getStoredMaintenance.ts`. Live status itself is still never stored server-side beyond that — it's fetched from each tracked host's public Atlassian Statuspage JSON endpoints on every request/poll (`revalidate: 60`)
  - Two different Supabase clients exist and picking the wrong one is a real trap: `lib/supabase.ts`'s `getSupabaseClient()` (service-role key, bypasses RLS) is what every table without row-level ownership uses — `services`, `catalog`, `integrations`, `incidents`/`maintenances`. `lib/supabase/server.ts`'s `createClient()` (publishable key, the caller's own session/cookies, respects RLS) is what `lib/boards.ts` alone uses, because `boards` has real per-user RLS policies keyed to `auth.uid()` (`supabase/migrations/0013_board_ownership.sql`) — a service-role client there would silently read/write every user's boards, not just the caller's. When adding a new `lib/*.ts` CRUD file, the choice depends on whether the table has RLS: if yes, use the session-scoped client like `boards.ts`; if the table has no ownership column yet (still the default across this app — see the RBAC note below), use the service-role client like everything else
- **Auth**: Supabase Auth via `@supabase/ssr` — email/password + Google OAuth, `/login` page (`components/auth/LoginForm.tsx`, server actions in `lib/supabase/auth.ts`). `proxy.ts` (not `middleware.ts` — see the note at the top of this file) refreshes the session cookie on every request and gates everything else behind login via an allowlist (`PUBLIC_EXACT`/`PUBLIC_PREFIXES`) — a page not on that list 404s into a `/login` redirect (an API route gets a 401) even though it's a public marketing/legal page, not because it needs a session. Add every new public route (e.g. `/privacy`, `/terms`) to that allowlist — see the Failure log. Still no RBAC, no per-role UI beyond that — that's a later phase; `boards` is the one table with any row ownership at all so far (see above), everything else is still one shared workspace across every logged-in user
- **External services**: Supabase (`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, browser-safe, used by both Supabase Auth and `lib/supabase.ts`'s service-role client; `SUPABASE_SERVICE_ROLE_KEY` stays server-only, never exposed to the client), Slack (OAuth "Add to Slack", `SLACK_CLIENT_ID`/`SLACK_CLIENT_SECRET`), Resend (`RESEND_API_KEY`/`RESEND_FROM_EMAIL`, server-only — `lib/resend.ts`, the email leg of `lib/notifyIncidentEvents.ts`'s notification fan-out), and Tawk.to (`NEXT_PUBLIC_TAWKTO_PROPERTY_ID`/`NEXT_PUBLIC_TAWKTO_WIDGET_ID` — both browser-safe by design, the embed script is public). A real `.env` now exists (gitignored; see `.env.example`) — this is no longer a zero-secrets app. Outbound calls: the public, unauthenticated Statuspage API (`/api/v2/status.json`, `/api/v2/summary.json`, `/api/v2/incidents.json`) of whatever host a service tracks, plus Supabase, Slack, Resend, and (opt-in only, see `components/cookies/`) Tawk.to's own APIs
- **i18n**: `i18next` + `react-i18next`, 13 locales
- **Testing**: none configured — no test runner, no `__tests__`/`e2e` folder, no test script in `package.json`. Verify changes with `npm run type-check` and `npm run lint`, plus the `run` skill (or a manual check) — don't assume a test suite exists
- **Linting**: ESLint 9 flat config (`eslint-config-next` core-web-vitals + typescript rules)
- **Git hooks**: Husky — `pre-commit` runs lint-staged (`eslint --fix` on staged `.js/.jsx/.mjs/.ts/.tsx`), `commit-msg` runs commitlint (`commitlint.config.js`, extends `@commitlint/config-conventional`) to enforce Conventional Commits, `pre-push` runs `npm run type-check`
- **Formatting**: none configured — no Prettier in this repo
- **Package manager**: `npm` (repo has `package-lock.json`; no pnpm/yarn lockfiles)

## 📂 Project Structure

```
.
├── app/
│   ├── (dashboard)/                 # Shared shell (Navbar + Sidebar via layout.tsx), behind login
│   │   ├── page.tsx                  # / — tracked services grid + status summary
│   │   ├── add-service/page.tsx      # /add-service — catalog picker to start tracking a service
│   │   ├── monitors/page.tsx         # /monitors — tracked-services grid with per-service remove, polls /api/status/catalog
│   │   ├── boards/page.tsx           # /boards — list/create boards (user-owned, RLS — see Data layer)
│   │   ├── boards/[id]/page.tsx      # /boards/:id — one board's services + activity
│   │   ├── history/page.tsx          # /history — incident calendar + counts, filterable by board
│   │   ├── incidents/page.tsx        # /incidents — live incident list across tracked services, filterable by board
│   │   ├── maintenance/page.tsx      # /maintenance — scheduled/in-progress maintenance list, filterable by board
│   │   ├── integrations/page.tsx     # /integrations — connect/manage integrations (Slack, Email)
│   │   └── service/[slug]/page.tsx   # /service/:slug — one service's status + components + incidents
│   ├── api/
│   │   ├── services/route.ts             # GET list / POST add (validates the host is a real Statuspage first)
│   │   ├── services/[slug]/route.ts      # DELETE untrack
│   │   ├── status/catalog/route.ts       # GET — batch status for the whole catalog (add-service page, landing demo)
│   │   ├── summary/[slug]/route.ts       # GET — one service's full summary (components + incidents)
│   │   ├── boards/route.ts, boards/[id]/route.ts, boards/[id]/services/route.ts, boards/[id]/services/[slug]/route.ts  # board CRUD + add/remove service
│   │   ├── history/[slug]/route.ts, history/counts/route.ts  # stored incident history reads, from the poller's tables
│   │   ├── incidents/route.ts, incidents/[slug]/[id]/route.ts, incidents/count/route.ts  # live incident list/detail/badge-count
│   │   ├── maintenance/route.ts, maintenance/[slug]/[id]/route.ts, maintenance/count/route.ts  # same shape, for maintenances
│   │   ├── integrations/route.ts, integrations/[slug]/route.ts  # connect/list/remove
│   │   ├── integrations/slack/start/route.ts, integrations/slack/callback/route.ts  # Slack "Add to Slack" OAuth
│   │   ├── integrations/email/route.ts  # POST — connect the email integration (no OAuth, just recipient addresses)
│   │   └── cron/poll-incidents/route.ts, cron/health/route.ts   # CRON_SECRET-gated, see Data Flow + Security
│   ├── landing-page/page.tsx, about/page.tsx, faq/page.tsx, privacy/page.tsx, terms/page.tsx  # public marketing/legal, outside the dashboard shell — each must be in proxy.ts's PUBLIC_EXACT, see Failure log
│   ├── login/page.tsx, reset-password/page.tsx, auth/callback/route.ts, auth/confirm/route.ts  # Supabase Auth entry points
│   ├── features/[slug]/page.tsx      # /features/:slug — one feature's marketing page (FEATURE_CATALOG-driven), PUBLIC_PREFIXES-allowlisted
│   ├── globals.css                   # Tailwind v4 + daisyUI theme config (no tailwind.config.ts)
│   ├── icon.svg
│   └── layout.tsx                    # root layout — fonts, inline pre-hydration theme-flash-prevention script
├── components/
│   ├── service/                      # the whole tracked-services feature
│   │   ├── logos/                     # one hand-drawn SVG per known service + FallbackLogo + index.tsx registry
│   │   └── *.tsx                      # cards/grids/detail/search/status-summary/incidents/maintenance; statusStyles.ts (indicator → color/label)
│   ├── boards/                       # BoardsPageContent, BoardDetailContent, BoardCard, BoardActivityPanel, BoardLastIncidentTable, CreateBoardForm
│   ├── history/                      # HistoryPageContent, IncidentCalendar, IncidentCountsChart
│   ├── integrations/                 # IntegrationsPageContent, IntegrationCard, SlackLogo, EmailLogo
│   ├── landing-page/                 # LandingPage.tsx, PricingSection.tsx, AboutContent/FaqContent/PrivacyContent/TermsContent, FeaturesMegaMenu, Footer
│   ├── navbar/                       # NavbarClient.tsx, LanguageSwitcher.tsx, ThemeToggle.tsx, Logo.tsx
│   ├── sidebar/                      # Sidebar.tsx (desktop nav), SidebarNavLink.tsx (shared with navbar's mobile menu)
│   ├── auth/                         # LoginForm.tsx, ResetPasswordForm.tsx
│   ├── cookies/                      # CookieConsent — gates Tawk.to's opt-in load
│   ├── support/                      # TawkChat.tsx
│   ├── providers/                    # QueryProvider.tsx — mounts the app's one TanStack Query QueryClient
│   └── icons/                        # small icon components shared across navbar/sidebar
├── lib/
│   ├── services.ts                   # Supabase `services` table CRUD (async) — getAllServices/addService/removeService/resolveServiceBySlug
│   ├── catalog.ts                    # getCatalog() — Supabase `catalog` table read (the fixed list of known services; no longer an in-code constant)
│   ├── boards.ts                     # Supabase `boards` table CRUD (async, session-scoped client — see Data layer) — getAllBoards/addBoard/renameBoard/removeBoard/addServiceToBoard/removeServiceFromBoard
│   ├── integrations.ts               # Supabase `integrations` table CRUD (async) — getAllIntegrations/addIntegration/removeIntegration
│   ├── supabase.ts                   # getSupabaseClient() — lazy, server-only, service-role key
│   ├── supabase/server.ts            # createClient() — session-scoped (RLS-respecting) client; used where a table has row-level ownership, currently only `boards`
│   ├── supabase/auth.ts              # sign-in/sign-up/OAuth server actions backing LoginForm/ResetPasswordForm
│   ├── resend.ts                     # getResendClient() — lazy, server-only, Resend API key
│   ├── pollIncidents.ts              # pollAllIncidents() — the 1-minute incident/maintenance poller, diff-only writes (see supabase/migrations/)
│   ├── notifyIncidentEvents.ts       # notifyPendingEvents() — Slack + email notification fan-out over incident_events
│   ├── getStoredIncident.ts, getStoredMaintenance.ts  # read incidents/maintenances back out of the poller's tables, for the /incidents, /maintenance, /history routes
│   ├── buildIncidentCalendar.ts      # shapes stored incidents into the /history calendar's data
│   ├── statusBatch.ts                # fetchStatusBatch() — parallel-fetches status+incidents for a set of services
│   ├── fetchJson.ts                   # shared queryFn body for useQuery/useMutation calls
│   ├── queryKeys.ts                   # central TanStack Query key factory
│   ├── useCloseDetailsOnOutsideClick.ts, useBoardRename.ts, useAutoSelectFirstId.ts, useDebouncedUrlFilters.ts, usePagination.ts, usePinned.ts, ...  # one file per hook, see Naming
│   ├── formatTime.ts                 # Temporal-based date/time formatting
│   └── i18n/
│       ├── i18n.ts                    # the one i18next instance, used app-wide
│       └── locales/                   # 13 locale JSON files: en, sk, cs, de, pl, pt, ru, es, it, fr, sv, nb, nl
├── types/                            # service.ts, board.ts, integration.ts, logo.ts, i18n.ts — each imported directly (`@/types/service`, etc.), there is no barrel `index.ts`
├── supabase/migrations/               # numbered .sql files, applied to prod by `.github/workflows/prod.yml`'s migrate job (`supabase db push`) on every push to master
├── docs/COMPONENTS.md                # generated prop reference for every component (npm run docs:components)
├── scripts/generate-docs.mjs         # generates docs/COMPONENTS.md via react-docgen-typescript
├── scripts/poll-incidents.mjs        # npm run poll:incidents — one-shot trigger for the cron poll+notify endpoint
├── scripts/import-catalog.mjs        # npm run import:catalog — seeds/updates the `catalog` table
├── .husky/pre-commit                 # runs lint-staged
└── package.json
```

## ⚙️ Dev Commands

- **Dev server**: `npm run dev`
- **Build**: `npm run build`
- **Start**: `npm run start`
- **Lint**: `npm run lint`
- **Type check**: `npm run type-check` (runs `next typegen`, then `tsc --noEmit -p .`)
- **Regenerate component docs**: `npm run docs:components` — run after changing any component's props, then commit the resulting `docs/COMPONENTS.md`
- **Bundle analysis**: `npm run analyze`
- **Reseed the catalog**: `npm run import:catalog` — re-runs `scripts/import-catalog.mjs` against the `catalog` table

## The loop

- After every meaningful edit, not just once at the end: `npm run type-check && npm run lint`. Both are fast (no build step) — there's no reason to batch them up
- Don't start `npm run dev` in the background to "check if it works" — it never exits and you can't see the result anyway. Use the `run` skill if you need to actually see a change (screenshot, click through it); otherwise the type-check/lint loop is the fast feedback path
- There's no test suite to run green — that means the type-check/lint loop is the only automated signal you get. Don't skip it and call something done on vibes

## 🔄 Data Flow

- Supabase (Postgres) is the persistence layer for tracked services/boards/integrations (`lib/services.ts`/`lib/boards.ts`/`lib/integrations.ts`, all async — see the Failure log for why they used to be synchronous `fs` calls and no longer are) and for incident/maintenance history (`lib/pollIncidents.ts`, populated by its own cron cycle, not by page views — see `app/api/cron/poll-incidents/route.ts` and `supabase/migrations/`). The `/incidents`, `/maintenance`, and `/history` pages all read that stored history back out (`lib/getStoredIncident.ts`/`lib/getStoredMaintenance.ts`/`lib/buildIncidentCalendar.ts`), not the live Statuspage endpoints directly — only the tracked-services grid (`/`, `/monitors`, `/add-service`) and one service's own detail page hit live status on every request. Sharded across 5 staggered 1-minute cron ticks (`?shard=0..4&shards=5`), so any one service's history is refreshed roughly every 5 minutes, not every 1 — see the Failure log for why. The scheduler that actually fires these ticks (an external cron service, e.g. cron-job.org) lives outside this repo entirely; nothing here schedules itself
- Boards are a cross-cutting filter, not a separate data source — `/history`, `/incidents`, and `/maintenance` all accept a selected board (via `lib/boards.ts`'s `getAllBoards()`) purely to narrow which tracked services' stored history is shown; the underlying incident/maintenance rows aren't board-scoped in the database
- Live status is never *cached in the database* — every page/poll still calls the tracked service's own Atlassian Statuspage JSON endpoints directly (`lib/statusBatch.ts`, or inline in `app/api/summary/[slug]/route.ts`), relying on Next's `fetch` `{ next: { revalidate: 60 } }` for caching. Incident *history* specifically also gets durably stored by the separate poller above, independent of this on-demand path
- Client-side polling goes through TanStack Query's `useQuery` with `refetchInterval: 60_000` (`POLL_INTERVAL_MS` defined per-file, matching the old hook's cadence) — reuse the same `queryKey` from `lib/queryKeys.ts` for any component that needs the same data instead of inventing a new key; identical keys share one cache entry and one in-flight request automatically, so there's no need to hand-roll dedup logic

## 🧱 Component & Styling Guidelines

- No component library — build with daisyUI component classes (`btn`, `card`, `details`/`dropdown`, `stats`, etc.) + Tailwind utilities
- Prefer daisyUI semantic color tokens (`bg-primary`, `text-base-content`, etc.) over hardcoded hex so light/dark mode keeps working
- Indicator → color/label mapping is centralized in `components/service/statusStyles.ts` (`INDICATOR_STYLES` / `COMPONENT_STATUS_STYLES` / `FALLBACK_STYLE`) — reuse it rather than declaring a parallel color table
- A service's SVG logo goes in `components/service/logos/`, one file per service, registered in `components/service/logos/index.tsx`'s `SERVICE_LOGOS` map; anything not in the map falls back to `FallbackLogo`

## 🌍 Internationalization

- All user-facing strings go through `t()` from `react-i18next`; never hardcode UI copy
- Every new string needs real (not machine-copied) translations across all 13 files in `lib/i18n/locales/*.json`: `en`, `sk`, `cs`, `de`, `pl`, `pt`, `ru`, `es`, `it`, `fr`, `sv`, `nb`, `nl`

## Naming

One word per concept — reuse the existing one, don't coin a new one.

| Concept | Use | Never |
| --- | --- | --- |
| The fixed list of all known services | `catalog` (`getCatalog()`, backed by the Supabase `catalog` table — not an in-code constant) | directory, registry, list |
| The user's actual saved subset | `tracked` / `monitored` (`trackedHosts`, `isMonitored`) | subscribed, watched, active |
| A service's short internal id (`"github"`) | `slug` | id, key, code |
| The domain actually queried (`"www.githubstatus.com"`) | `host` | domain, url, endpoint |
| The status enum (`none`/`minor`/`major`/`critical`) | `indicator` | severity, level, state |
| The `{ indicator, description }` pair | `status` | — (don't flatten it into `indicator`, they're read as `status.indicator` throughout) |

- Functions: `getAllServices`, `resolveServiceBySlug`, `addService`, `removeService`, `fetchStatusBatch` — verb + noun, not `fetch`/`handle`/`process` alone
- Booleans read as assertions: `isLoading`, `isMonitored`, `isPending`, `isAdded` — match this even where an existing prop doesn't (`removable.removing` should really be `isRemoving`, but don't silently rename an existing prop as a drive-by; ask first, see above)
- Hooks: `useXxx` in `lib/`, one file per hook (`lib/useCloseDetailsOnOutsideClick.ts`, `lib/useBoardRename.ts`) — not bundled into a components file. Data-fetching hooks are just direct `useQuery`/`useMutation` calls at the call site, not wrapped in a bespoke `useXxx` — see `lib/queryKeys.ts`/`lib/fetchJson.ts`
- `types/service.ts`'s `ServiceDefinition` and `CatalogEntry` are structurally identical and used interchangeably already — known, not yet consolidated; don't add a third near-duplicate type for the same `{slug, name, host}` shape

## 📦 Dependencies

- `package.json` pins exact versions — no `^`/`~` ranges. Match that if you add or bump one
- Ask before adding a dependency. Check the ladder first: does this need to exist → is there already a pattern for it in this repo → does a native platform/CSS feature cover it → does an already-installed dependency cover it → *then* consider a new one
- This repo has a running preference for zero third-party UI/icon libraries — logos and icons are hand-written inline SVG components (`components/service/logos/`, `components/icons/`) even though that means one file per icon. Don't introduce an icon package to replace them

## 📝 Code Style Standards

- Functional React components with typed props (inline object types are the norm here, not separate `interface` declarations)
- Avoid `any`; prefer precise types or `unknown` with narrowing
- `as` and non-null `!` aren't banned outright (`languages[0]!` in `lib/i18n/languages.ts` is a real, deliberate example — `noUncheckedIndexedAccess` forces the assertion), but every one needs a comment justifying why it's actually safe. An uncommented `!`/`as` to silence an error is not the same thing — fix the type instead
- Same standard for a swallowed `catch {}` — the four that exist (`localStorage` access in `Sidebar.tsx`/`LanguageSwitcher.tsx`) all carry a `// ignore` comment because Safari private mode can throw there. A `catch` with no comment and no recovery action is a bug, not a style choice
- Co-locate small helpers near their usage; extract to `lib/` when shared across components or folders
- Never use native `Date`/`Date.now()` — this repo standardizes on `temporal-polyfill` (`lib/formatTime.ts` is the one home for Temporal helpers: `nowIso()`/`nowMs()`/`epochMs(iso)` for the current-time/epoch-ms/parse-to-ms shapes, plus the existing `msSince`/`minutesBetween`/`formatDateTime`/`formatDate`/`formatDuration`). Add a new helper there instead of inlining `Temporal.Now.instant()...` or reaching for `new Date()` at a fresh call site. The one exception is `components/support/TawkChat.tsx`'s `new Date()` — that's inside Tawk.to's own required embed-loader snippet, raw JS injected via `<Script>` with no bundler/Temporal in scope, not app code
- Group imports: framework (`react`/`next`) → third-party libraries → local (`@/...`)
- No inline code comments unless explaining a non-obvious *why* (a workaround, a subtle invariant) — not restating *what* the code does

## Error Handling

- Every API route's error response is the same flat shape: `NextResponse.json({ error: "message" }, { status })` — a plain string, not an error object with a code. Keep any new route consistent with this rather than introducing a different envelope
- Error messages are user-facing where the caller surfaces them (`ServiceCatalogPicker`'s add-service flow shows `data.error` directly) — write them as something a user can act on ("That host didn't return a valid status page"), not a stack trace or "Something went wrong" as the default

## 🔎 Verifying UI Changes

- No visual regression tests and no browser tool guaranteed to be available every session — when a change is visual, use the `run` skill to actually look at it rather than reasoning about Tailwind classes in the abstract
- Check both themes — `data-theme="light"`/`"dark"` swap real color tokens (`app/globals.css`), not just a class toggle — and check the mobile hamburger-menu breakpoint (`md:hidden` in `NavbarClient.tsx`), since both have been the subject of dedicated layout fixes before
- Real data is available for free — the catalog fetches live Statuspage APIs, so checking a component against actual GitHub/Supabase/Cloudflare status is as easy as running the app; no fixture or seed data to maintain

## 🔐 Security

- `POST /api/services` fetches whatever hostname the client submits (`https://${host}/api/v2/status.json`) to confirm it's a real Statuspage before tracking it — that's a user-controlled server-side fetch (SSRF-shaped surface, though scoped to HTTPS and an expected JSON shape). Apply the same host-validation pattern to any new feature that accepts a user-supplied URL/hostname
- `next.config.ts` sets no CSP or security headers currently — don't assume any are in place
- Real secrets now exist in a gitignored `.env` (`SUPABASE_SERVICE_ROLE_KEY`, `SLACK_CLIENT_SECRET`, `RESEND_API_KEY`, `CRON_SECRET`) — see `.env.example` for the full list. `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security entirely; it must only ever be read server-side (`lib/supabase.ts`) and never prefixed `NEXT_PUBLIC_` or otherwise exposed to the client
- `/api/cron/poll-incidents` is guarded by a constant-time comparison against `CRON_SECRET`, not a plain `!==` — apply the same care to any other endpoint that should only be triggered by a trusted caller, not a logged-in user (this app still has no auth/accounts)

## Keeping this file current

This file records what actually went wrong or turned out non-obvious, not aspirations. When you get corrected, hit something surprising, or find something worth knowing that wasn't written down:

1. Add one line to the failure log below, in the imperative, describing the correct behavior — specific to this repo, not general advice.
2. Include the update in the same change and mention it in your summary.

## Failure log

- This repo has shipped dead code from a refactor before, more than once — `Navbar.tsx` kept fetching and forwarding a `services` prop nothing read after `<ServiceSearch>` was cut from its JSX; `MyServicesSection`/`ServiceGrid`/`ServiceCard` (plus `app/api/status/route.ts`) survived being fully superseded by `ServicesPageContent`/`CatalogServiceGrid`/`CatalogServiceCard`; `lib/i18n/i18nCore.ts` duplicated `i18n.ts` with zero importers. When a component stops rendering something, grep every remaining reference to what it imported and delete what's now unreachable — don't leave the import/prop/route behind
- `GearIcon`/`ActivityIcon` were independently redefined, byte-for-byte, in both `navbar/NavbarClient.tsx` and `sidebar/Sidebar.tsx` before being pulled into `components/icons/NavIcons.tsx`. Check that folder (and the sibling feature folder) before writing a new inline SVG icon
- The original `lib/services.ts`/`lib/boards.ts`/`lib/integrations.ts` wrote to `data/*.json` via synchronous `fs` calls, seeded on first run via `mkdirSync`/`writeFileSync` if the file didn't exist. That works under `next dev`/`next start` on a normal machine but broke every page on the first Vercel deployment — Vercel's deployed functions run against a read-only filesystem (`ENOENT`/`EROFS` trying to `mkdir '/var/task/data'`), and `data/` is gitignored so it never even exists there to begin with. Local-filesystem writes at request time are fundamentally incompatible with serverless deployment; that persistence moved to Supabase for exactly this reason. If a future feature is tempted to write to a local file at runtime, it won't survive a real deployment either
- Don't paste a config file's contents (tsconfig, eslint, etc.) verbatim into this doc — the file itself is the source of truth and a pasted copy just drifts. Describe the practical consequence of the non-default settings instead
- Migrations are not applied manually via the Supabase SQL editor — `.github/workflows/prod.yml`'s `migrate` job runs `supabase db push --db-url "$SUPABASE_DB_URL" --yes` against production on every push to `master`, after `checks` passes and before `deploy`. Don't assume a Supabase-adjacent process in this repo is manual without checking `.github/workflows/` first
- Running the incident poller unsharded on a 1-minute cron re-sends the *entire* incidents/maintenances feed for every tracked service every single cycle (diff-guarded in Postgres so a no-op write costs no row rewrite, but every row still costs a real function call + index lookup — ~3,165+ of them a minute across the catalog as of the `0007_bulk_upsert_functions.sql` comment, and only growing). Sustained at that volume, it saturated the project's Postgres compute continuously (~90% CPU on a small/free-tier instance) and that same saturation is what caused Supabase Auth (GoTrue, sharing the instance) to start timing out on login (`context deadline exceeded` / `dial tcp [::1]:5432` in Auth logs) — not a bug in this app's OAuth code. Moved to 5 staggered shards (`?shard=N&shards=5`, one shard's worth of the catalog per cron tick) so per-service refresh cadence widens to ~5min while peak concurrent DB load drops ~5x with no single tick touching the whole catalog. `LOCK_STALE_MS` (`lib/pollIncidents.ts`, shared with `app/api/cron/health/route.ts`) had to widen from 5min to 10min alongside this — it's compared against `last_success_at`, and a shard that now only succeeds once per ~5min cycle needs real margin over that or ordinary tick jitter reads as "stale"/unhealthy
- `proxy.ts` gates every route not on its `PUBLIC_EXACT`/`PUBLIC_PREFIXES` allowlist behind login, unconditionally — it has no concept of "this route just doesn't need auth because it's static/public content." Adding `app/privacy/page.tsx` and `app/terms/page.tsx` without adding `/privacy`/`/terms` to `PUBLIC_EXACT` silently redirected logged-out visitors to `/login` before they could ever read either page. Any new route meant to be reachable without a session — marketing pages, legal pages, public API endpoints — must be added to that allowlist in the same change that adds the route, not assumed to work because "it doesn't touch user data"
- `lib/boards.ts` uses `lib/supabase/server.ts`'s session-scoped `createClient()` while every other `lib/*.ts` data file (`services.ts`, `catalog.ts`, `integrations.ts`, `getStoredIncident.ts`, `getStoredMaintenance.ts`) uses `lib/supabase.ts`'s service-role `getSupabaseClient()`. This isn't drift — `boards` is the one table with RLS policies keyed to `auth.uid()` (`supabase/migrations/0013_board_ownership.sql`), so it needs the caller's real session for those policies to scope rows correctly; the service-role client bypasses RLS entirely and would return/mutate every user's boards, not just the caller's. A new `lib/*.ts` file for a table that gains RLS later needs the same session-scoped client `boards.ts` uses, not the service-role default everything else follows
- Editing a `lib/i18n/locales/*.json` file while `next dev` is already running does NOT reliably reach server-side rendering, even though the dev server logs "Fast Refresh had to perform a full reload" for the changed file and the *client* bundle picks up the new keys fine. `lib/i18n/i18n.ts`'s `if (!i18n.isInitialized)` guard means the i18next singleton only calls `.init()` once per server process; a Turbopack full-reload doesn't force that module to re-run, so newly-added keys render as their raw dotted key (e.g. `landing.faq.heading`) in the server-rendered HTML indefinitely — not just for one request — while the client-rendered version is already correct, which also shows up as a spurious React hydration-mismatch warning. This happened 3 times in one session (once per i18n-touching change) against a `next dev` process that had been running since before the edit. The only fix that actually works is killing the dev server process and starting a fresh one — `taskkill`/`Stop-Process` by PID (found via `netstat -ano | grep LISTENING` or `Get-NetTCPConnection`), not `pkill -f`/`lsof`, which don't reliably find or kill Next's Windows `node.exe` process from Git Bash. Always verify with a plain `curl` of the page after restarting (look for the translated text, not the dotted key) before trusting any i18n-related dev-server check.
