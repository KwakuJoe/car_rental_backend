# Handoff: Wynk car rental system — continue the build

You are taking over an in-progress project from another AI agent. Work the way it did:
read before you change, follow the existing conventions exactly, verify everything you build
(tests, typecheck, lint, build, browser screenshots), keep the docs current, commit in small
logical steps, and ask the user before decisions that are genuinely theirs (pricing policy,
providers, anything outward-facing). Explain trade-offs honestly; recommend, don't just list.

> The same file lives in both repos (backend and frontend). Keep them in sync if you edit it.

## The product
A car rental management system for **Wynk Car Rentals**, a single-location business in Ghana
(GHS currency, Mobile Money, Ghana Card, GRA taxes). Staff dashboard now; public booking
website later (Phase 7). Owner/dev: the user (GitHub: KwakuJoe).

## Two repos
| | Backend (API) | Frontend (dashboard + public site) |
|---|---|---|
| Path | `/Users/josephampah/Documents/My_Projects/AdonisJS_Project/car_rental_backend` | `/Users/josephampah/Documents/My_Projects/next-essentials/car-rental-frontend` |
| GitHub | https://github.com/KwakuJoe/car_rental_backend | https://github.com/KwakuJoe/car_rental_frontend |
| Stack | AdonisJS 7, Lucid ORM, VineJS 4, PostgreSQL, Japa tests, opaque access tokens | Next.js 16 (App Router, Cache Components, React Compiler), Tailwind v4, shadcn **base-nova** (Base UI), TanStack Query, react-hook-form + zod, Iconify, sonner, Playwright |

## READ THESE FIRST (source of truth)
Backend `prompt-reference/`:
- `modules.txt` — the full roadmap (Phases 1–10), conventions, permission catalog, role
  matrix, and a **PROGRESS** checklist near the top. Update PROGRESS as you finish modules.
- `auth_module.txt`, `settings_module.txt`, `audit_module.txt` — API references for what's built.
- `setup_command.txt` — install/run instructions.

Backend `http/` — one `.http` file per module (VS Code REST Client), runnable endpoint docs.

Frontend `CLAUDE.md` — architecture, auth model, module recipe, UI conventions. Follow it.
Frontend `AGENTS.md` — this Next.js version has breaking changes vs. older docs; read the
relevant guide in `node_modules/next/dist/docs/` before using a Next API you're unsure of.

## What's done (Phase 1 complete except M1.5–M1.8)
- Business + branch model (single main branch, every record will carry `branch_id`),
  opening hours, closure dates, `node ace business:create` bootstrap.
- Six system roles (owner = super admin, manager, front-desk, fleet, driver, accountant),
  DB-driven RBAC with per-user permission overrides, owner-account protection.
- Login rate limiting (5/min per IP+email, 15 min lockout), 7-day tokens.
- Lookups for any staff (`/admin/lookups/business|roles|branches|staff`).
- Business rules (M1.3): `settings` table storing overrides only; defaults + validation in
  `app/services/settings/definitions.ts`; read with `SettingsService.get(key)` — never hardcode
  policy numbers.
- Audit log (M1.4): `AuditService.record(ctx, {action, subject, before, after, metadata}, trx)`
  — call it from controllers with intent-level actions (`<module>.<verb>`), pass the
  transaction, use `AuditService.pick()`; diffing/redaction automatic.
- Frontend: staff login via httpOnly cookie + `/api/backend/*` proxy, Staff, Roles &
  permissions, Settings (business profile, business rules, branches, hours & closures),
  Audit log; Wynk branding; date/time pickers; Playwright smoke tests + visual tour.
- Tests: backend 46 Japa tests passing; frontend 7 Playwright smoke tests passing.

## NEXT TASK: Phase 2, slice 1 (see modules.txt for full detail)
1. **M1.5 File storage** — `@adonisjs/drive`, local disk in dev; production planned on
   **Cloudflare R2** (confirm with the user at deploy time). Private files (ID scans,
   documents) only via short-lived signed URLs. A `files` table + one service for attaching.
2. **Car categories + cars** (M2.1, M2.2) — fields, status rules and endpoints are specified
   in modules.txt. Availability is NOT stored on the car (computed later from allocations).
3. **Car blocks** (M2.3) — date-range blocks; they'll live in the `car_allocations` table with
   the Postgres exclusion constraint described in M3.4 (btree_gist is already enabled).
4. **Vehicle documents + expiry alerts** (M2.4) — needs **M1.6 jobs/scheduler** and
   **M1.8 in-app notifications**; alerts at 30/14/7/1 days and on expiry.
5. Then slice 2: rates, seasonal pricing, extras, protection plans, delivery zones, fees,
   taxes, and the single `PricingService.quote()` (M2.5–M2.11).

For each module: migration → model → validator (factories!) → controller (+ audit) → routes
→ permissions in `database/seed_data/role_permission_data.ts` (+ role matrix) → Japa tests →
`http/<module>.http` → `prompt-reference/<module>_module.txt` → frontend module (copy
`src/modules/users` pattern) → nav entry → smoke test + tour entry → screenshots reviewed →
commit + push.

## Environment facts (important)
- **Node:** the default shell PATH has an old Node 16. Always prefix:
  `export PATH=~/.nvm/versions/node/v24.20.0/bin:$PATH`
- **Shell is zsh:** an unquoted `$VAR` holding several paths is NOT word-split — use arrays,
  `xargs`, or `${=VAR}`.
- **Postgres:** local Homebrew Postgres 18 on localhost:5432, role = macOS user `josephampah`
  (there is no `postgres` role). Dev DB `car_rental_db`, test DB `car_rental_db_test`.
  The user's real dev data lives in `car_rental_db` (business "Wynk Car Rentals", owner
  theboss@gmail.com) — **never** use it for experiments.
- After adding migrations run both: `node ace migration:run` and
  `NODE_ENV=test node ace migration:run`. After adding permissions: `node ace db:seed`
  (additive, safe).
- Backend checks: `npm run typecheck`, `npm run lint`,
  `npx prettier --check app start tests database`, `node ace test`.
- Frontend checks: `npx tsc --noEmit`, `npm run lint`, `npm run format:check`,
  `npm run build`, `npm run e2e`.
- Frontend formatting: use the **project's** Prettier (`npm run format`). Never run a bare
  `npx prettier` in a folder that has no Prettier installed — it applies defaults and rewrites
  everything (this happened once; it was reverted from git).

## Browser verification (do this for every UI change)
There is no Chrome extension connection; use **Playwright** (installed in the frontend).
Pattern used so far, always on a **throwaway** database:
1. `createdb -h 127.0.0.1 car_rental_e2e`, run migrations against it
   (`DB_DATABASE=car_rental_e2e node ace migration:run`), bootstrap with `business:create`
   (it's interactive — the previous agent drove it with an `expect` script), change the
   owner's temp password via `POST /api/backend/account/change-password`.
2. Backend on port 3334 (`PORT=3334 DB_DATABASE=car_rental_e2e node ace serve`), frontend
   production build on 3001 (`API_URL=http://localhost:3334 npx next start -p 3001`).
3. `E2E_BASE_URL=http://localhost:3001 E2E_EMAIL=... E2E_PASSWORD=... npm run e2e` and
   `npm run e2e:tour`, then LOOK at `test-results/tour/*.png` (light + dark).
4. Stop both servers and `dropdb -h 127.0.0.1 car_rental_e2e` afterwards.

Full-page screenshots show sticky elements mid-page — that's the capture method, not a bug.

## Gotchas already learned (don't rediscover them)
- **VineJS:** rule methods mutate the schema — build fields with factory functions, never
  share schema instances between validators. `vine.date()` returns Luxon `DateTime` here.
  Use `.unique({ table, column, filter })` for "unique except self".
- **Lucid jsonb:** encode explicitly with `@column({ prepare: (v) => JSON.stringify(v) })`
  (the pg driver sends bare strings as text and arrays as Postgres arrays).
- Postgres NUMERIC comes back as padded strings — convert in the transformer.
- Model query-builder `.update({...})` takes **column names** (`is_main`), not attribute names.
- New rows don't know DB defaults until reloaded — set booleans explicitly before returning.
- Tests: `tests/bootstrap.ts` clears the memory rate-limiter before each test. Cast typed
  client bodies: `response.body() as Record<string, any>`. ESLint forbids
  `(await x).y` — assign first.
- `database/schema.ts` is generated by migrations — excluded from lint/prettier; never edit.
- Base UI (shadcn base-nova) uses the `render` prop, not `asChild`. Popovers auto-focus their
  first element — pass `initialFocus={false}` when that would scroll/steal focus.
- Next 16: `middleware.ts` is `proxy.ts`; `cookies()` is async; anything reading the session
  must be inside `<Suspense>` (Cache Components). Server Components can't delete cookies —
  redirect to `/api/auth/logout?reason=...`.
- React Compiler lint: no `setState` inside effects, no ref reads during render, use
  `useWatch` instead of `form.watch()`.
- `.http` files: the backend `http/` folder is the source of truth; refresh the frontend copy
  with `npm run http:sync` (frontend).

## Conventions in one breath
Money = integer pesewas (display with `formatMoney`); timestamps UTC, business timezone
Africa/Accra; ULID ids; response envelope `{ message, data, meta? }`; list endpoints use
`BaseFilter` (page, limit, search, sortBy, sortOrder); never hard-delete business records;
every change audited; permissions as `module.action`; UI controls `h-10`, brand red
`--brand-primary: #fb242f`, soft focus ring, neutral tags (red only for actions/problems),
list pages = toolbar (search, Filter dialog, Refresh, Add) + table + pagination, forms in
right-hand drawers with a confirm step, `DatePicker`/`TimePicker`/`DateTimePicker` (never
native date/time inputs), `ComboSelect` options with short label + `sublabel` description.

## Git
Both repos on `main`, tracking `origin/main`, clean at handoff. Commit with clear messages
(what + why); push when a piece is verified. Never commit `.env`, `http/.env`,
`.claude/settings.local.json`, `test-results/`.

## First steps
Read `prompt-reference/modules.txt` (PROGRESS + Phase 2) and the frontend `CLAUDE.md`, run
both test suites to confirm a green baseline, then propose your plan for Phase 2 slice 1 to
the user before writing code.
