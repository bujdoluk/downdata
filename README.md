# downDATA

**Live**: https://www.downdata.online

A multi-tenant status-monitoring SaaS built on Next.js 16 (App Router) and Supabase. Users track third-party services (GitHub, Cloudflare, Supabase, and many more) on their own boards, get stored incident/maintenance history and uptime stats, and can wire up Slack, Email, SMS, or generic outgoing webhook notifications, all scoped per account. It also ships public per-board status pages, a keyword-based early-warnings watcher, and Stripe billing.

For architecture, conventions, and the reasoning behind non-obvious decisions in this codebase, see `AGENTS.md` (also loaded as `CLAUDE.md`).

## Getting started

Prerequisites: Node (see `.nvmrc`/`package.json`'s `engines`, currently `>=20.9.0`), npm, and Docker Desktop (only needed for the end-to-end tests, see below).

```bash
npm install
cp .env.example .env   # fill in real values, see the file for the full list
npm run dev             # http://localhost:3000
```

The app reads several env vars at module scope, so `.env` needs to exist with every key present even while you're only working on a feature that doesn't touch that particular integration.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Start the production build (run `build` first) |
| `npm run lint` | ESLint |
| `npm run type-check` | `next typegen` then `tsc --noEmit` |
| `npm run analyze` | Bundle size analysis |
| `npm run docs:components` | Regenerate `docs/COMPONENTS.md` (run after changing any component's props) |
| `npm run import:catalog` | Seed/update the `catalog` table from `scripts/import-catalog.mjs` |
| `npm run poll:incidents` | One-shot local trigger for the cron poll+notify endpoint |
| `npm run poll:keyword-sources` | One-shot local trigger for the early-warnings keyword poller |
| `npm run generate:reports` | One-shot local trigger for the account-report generation cron (see below — this one needs an hourly schedule, not a daily one) |
| `npm run test:unit` | Run the Vitest unit tests |
| `npm run test:e2e:setup` | Generate `.env.test.local` from a running local Supabase instance (see below) |
| `npm run test:e2e` | Run the Playwright end-to-end tests |

## Testing

### Unit tests (Vitest)

No setup needed:

```bash
npm run test:unit
```

### End-to-end tests (Playwright)

This is a real integration test, not a mock: a real Chromium browser, driving a real built-and-started Next.js server, backed by a real local Supabase instance (Postgres, Auth, PostgREST) running in Docker.

1. Install and start **Docker Desktop**.
2. Start the local Supabase stack (replays every migration in `supabase/migrations/` from scratch):
   ```bash
   npx supabase start
   ```
3. Generate the local test env file (reads your real `.env` first and only overrides the three Supabase vars, so `.env` needs to already exist):
   ```bash
   npm run test:e2e:setup
   ```
4. Run the tests (builds the app, starts it on port 3100, and drives it with a real browser):
   ```bash
   npm run test:e2e
   ```
5. When you're done, tear the local stack down:
   ```bash
   npx supabase stop
   ```
   Data persists in a Docker volume, so the next `npx supabase start` picks back up where you left off rather than reseeding. To wipe local data and start fresh instead, use `npx supabase stop --no-backup`, or run `npx supabase db reset` after starting again.

**Needs outbound internet access.** The webhook E2E test posts to the real public `webhook.site` API as its receiver, since a local receiver's address would fall into the private/loopback IP ranges the app's own SSRF guard is built to reject (see `e2e/webhook-connect.spec.ts`'s header comment). It can't run fully offline or behind a proxy that blocks that domain.

### Troubleshooting

- **`next dev` won't start while the E2E suite is running (or vice versa)**: `next dev` refuses a second instance in the same project directory, so E2E uses `npm run build && npm run start` on a separate port instead. This means the two normally don't conflict, but a leftover `next dev` process can still hold Windows file locks on `.next/` if something goes wrong.
- **`supabase start` stalls with no progress**: check `docker context ls` and make sure you're on the context Docker Desktop actually uses (`desktop-linux` on Windows/Mac, not `default`).
- **`supabase start` fails with a container name conflict**: a previously killed/interrupted `supabase start` can leave an orphaned container behind (e.g. `supabase_db_downdata`). Remove it with `docker rm -f <container-name>` and retry.
- **`supabase_vector_<project>` keeps crash-looping**: it's an analytics/log-shipping sidecar, not required for the app or the tests. Disable it in `supabase/config.toml`:
  ```toml
  [analytics]
  enabled = false
  ```
- **A migration doesn't seem to have applied**: `npx supabase db reset` replays every file under `supabase/migrations/` from scratch against the local instance. Run it after `supabase start`, not before.
