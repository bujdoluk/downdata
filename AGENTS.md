<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 🛠️ Development Environment

- **Language**: TypeScript (`^5`), full config in `tsconfig.json`. The flags that actually change how you write code here:
  - `strict` + `noImplicitReturns` + `noFallthroughCasesInSwitch` + `noImplicitOverride` — the usual strict set
  - `noUncheckedIndexedAccess` — any `array[i]` or `record[key]` access is typed `T | undefined`, even when the key looks exhaustive. Handle it at the call site (`INDICATOR_STYLES[key] ?? FALLBACK_STYLE`) or assert with a comment explaining why it's safe (`languages[0]!` — `languages` is a fixed non-empty literal array)
  - `verbatimModuleSyntax` — type-only imports must use `import type` (or `import { type X }`), or the build fails
  - `moduleResolution: "bundler"` + `resolveJsonModule` — locale JSON files import directly (`import en from "./locales/en.json"`)
  - `paths`: `@/*` → repo root — always import via `@/...`, never a relative `../../` chain
- **Framework**: Next.js 16 (App Router) — see the warning above; this is a modified/future version, not the Next.js in your training data
- **Runtime/UI**: React 19
- **Styling**: Tailwind CSS v4 + daisyUI 5 (config lives in `app/globals.css` via `@import "tailwindcss"` / `@plugin "daisyui"` — there is no `tailwind.config.ts`)
- **Component library**: none — hand-rolled components styled with daisyUI classes + Tailwind utilities
- **Data layer**: none — no database. Tracked services live in a flat JSON file (`data/services.json`, gitignored, seeded on first run) read/written synchronously by `lib/services.ts`. Live status itself is never stored — it's fetched from each tracked host's public Atlassian Statuspage JSON endpoints on every request/poll
- **Auth**: none — single-user app, no accounts, no login
- **External services**: none requiring credentials — no `.env` file exists or is needed. The only outbound calls are to the public, unauthenticated Statuspage API (`/api/v2/status.json`, `/api/v2/summary.json`, `/api/v2/incidents.json`) of whatever host a service tracks
- **i18n**: `i18next` + `react-i18next`, 13 locales
- **Testing**: none configured — no test runner, no `__tests__`/`e2e` folder, no test script in `package.json`. Verify changes with `npm run type-check` and `npm run lint`, plus the `run` skill (or a manual check) — don't assume a test suite exists
- **Linting**: ESLint 9 flat config (`eslint-config-next` core-web-vitals + typescript rules)
- **Git hooks**: Husky + lint-staged — `eslint --fix` runs on staged `.js/.jsx/.mjs/.ts/.tsx` on every commit (`.husky/pre-commit`)
- **Formatting**: none configured — no Prettier in this repo
- **Package manager**: `npm` (repo has `package-lock.json`; no pnpm/yarn lockfiles)

## 📂 Project Structure

```
.
├── app/
│   ├── (dashboard)/                 # Shared shell (Navbar + Sidebar via layout.tsx)
│   │   ├── page.tsx                  # / — tracked services grid + status summary
│   │   ├── add-service/page.tsx      # /add-service — catalog picker to start tracking a service
│   │   ├── monitors/page.tsx         # /monitors — placeholder route, not yet built
│   │   └── service/[slug]/page.tsx   # /service/:slug — one service's status + components + incidents
│   ├── api/
│   │   ├── services/route.ts             # GET list / POST add (validates the host is a real Statuspage first)
│   │   ├── services/[slug]/route.ts      # DELETE untrack
│   │   ├── status/catalog/route.ts       # GET — batch status for the whole catalog (add-service page, landing demo)
│   │   └── summary/[slug]/route.ts       # GET — one service's full summary (components + incidents)
│   ├── landing-page/page.tsx         # /landing-page — marketing page, outside the dashboard shell
│   ├── globals.css                   # Tailwind v4 + daisyUI theme config (no tailwind.config.ts)
│   ├── icon.svg
│   └── layout.tsx                    # root layout — fonts, inline pre-hydration theme-flash-prevention script
├── components/
│   ├── service/                      # the whole tracked-services feature
│   │   ├── logos/                     # one hand-drawn SVG per known service + FallbackLogo + index.tsx registry
│   │   └── *.tsx                      # cards/grids/detail/search/status-summary; statusStyles.ts (indicator → color/label)
│   ├── landing-page/                 # LandingPage.tsx, PricingSection.tsx
│   ├── navbar/                       # NavbarClient.tsx, LanguageSwitcher.tsx, ThemeToggle.tsx, Logo.tsx
│   ├── sidebar/                      # Sidebar.tsx (desktop nav), SidebarNavLink.tsx (shared with navbar's mobile menu)
│   └── icons/                        # small icon components shared across navbar/sidebar
├── lib/
│   ├── services.ts                   # data/services.json CRUD — getAllServices/addService/removeService/resolveServiceBySlug
│   ├── serviceCatalog.ts             # SERVICE_CATALOG — the fixed list of known services (slug/name/host)
│   ├── statusBatch.ts                # fetchStatusBatch() — parallel-fetches status+incidents for a set of services
│   ├── usePolledFetch.ts             # generic "poll this URL every 30s" hook
│   ├── useCatalogStatus.ts           # usePolledFetch wrapper for /api/status/catalog
│   ├── useCloseDetailsOnOutsideClick.ts  # shared <details>-outside-click-to-close hook
│   ├── formatTime.ts                 # Temporal-based date/time formatting
│   └── i18n/
│       ├── i18n.ts                    # the one i18next instance, used app-wide
│       └── locales/                   # 13 locale JSON files: en, sk, cs, de, pl, pt, ru, es, it, fr, sv, nb, nl
├── types/                            # service.ts, logo.ts, i18n.ts — re-exported from index.ts
├── data/services.json                # gitignored, runtime-created — the tracked-services registry
├── docs/COMPONENTS.md                # generated prop reference for every component (npm run docs:components)
├── scripts/generate-docs.mjs         # generates docs/COMPONENTS.md via react-docgen-typescript
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

## 🔄 Data Flow

- No database, no server-side cache layer. `lib/services.ts` is the only persistence — synchronous `fs` reads/writes against `data/services.json`, reseeded from a small `BUILTIN_SERVICES` subset of `SERVICE_CATALOG` the first time the file doesn't exist
- Live status is never stored — every page/poll calls the tracked service's own Atlassian Statuspage JSON endpoints directly (`lib/statusBatch.ts`, or inline in `app/api/summary/[slug]/route.ts`), relying on Next's `fetch` `{ next: { revalidate: 30 } }` for caching
- Client-side polling goes through `lib/usePolledFetch.ts` (30s interval) — reuse it for any new "keep this JSON fresh" need instead of hand-rolling another `useEffect`/`setInterval` pair

## 🧱 Component & Styling Guidelines

- No component library — build with daisyUI component classes (`btn`, `card`, `details`/`dropdown`, `stats`, etc.) + Tailwind utilities
- Prefer daisyUI semantic color tokens (`bg-primary`, `text-base-content`, etc.) over hardcoded hex so light/dark mode keeps working
- Indicator → color/label mapping is centralized in `components/service/statusStyles.ts` (`INDICATOR_STYLES` / `COMPONENT_STATUS_STYLES` / `FALLBACK_STYLE`) — reuse it rather than declaring a parallel color table
- A service's SVG logo goes in `components/service/logos/`, one file per service, registered in `components/service/logos/index.tsx`'s `SERVICE_LOGOS` map; anything not in the map falls back to `FallbackLogo`

## 🌍 Internationalization

- All user-facing strings go through `t()` from `react-i18next`; never hardcode UI copy
- Every new string needs real (not machine-copied) translations across all 13 files in `lib/i18n/locales/*.json`: `en`, `sk`, `cs`, `de`, `pl`, `pt`, `ru`, `es`, `it`, `fr`, `sv`, `nb`, `nl`

## 📝 Code Style Standards

- Functional React components with typed props (inline object types are the norm here, not separate `interface` declarations)
- Avoid `any`; prefer precise types or `unknown` with narrowing
- Co-locate small helpers near their usage; extract to `lib/` when shared across components or folders
- Group imports: framework (`react`/`next`) → third-party libraries → local (`@/...`)
- No inline code comments unless explaining a non-obvious *why* (a workaround, a subtle invariant) — not restating *what* the code does

## 🔐 Security

- `POST /api/services` fetches whatever hostname the client submits (`https://${host}/api/v2/status.json`) to confirm it's a real Statuspage before tracking it — that's a user-controlled server-side fetch (SSRF-shaped surface, though scoped to HTTPS and an expected JSON shape). Apply the same host-validation pattern to any new feature that accepts a user-supplied URL/hostname
- `next.config.ts` sets no CSP or security headers currently — don't assume any are in place
- No secrets, no `.env` file — nothing here needs one today. If a future integration adds one, it's already covered by the `.env*` gitignore pattern (`!.env.example` is carved out for a committed example file, should one ever be added)
