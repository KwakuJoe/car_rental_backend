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
- `auth_module.txt`, `settings_module.txt`, `audit_module.txt`, `files_module.txt`,
  `fleet_module.txt`, `pricing_module.txt` — API references for what's built.
- `setup_command.txt` — install/run instructions.

Backend `http/` — one `.http` file per module (VS Code REST Client), runnable endpoint docs.

Frontend `CLAUDE.md` — architecture, auth model, module recipe, UI conventions. Follow it.
Frontend `AGENTS.md` — this Next.js version has breaking changes vs. older docs; read the
relevant guide in `node_modules/next/dist/docs/` before using a Next API you're unsure of.

## What's done
Phase 1 (except M1.7 numbering) and all of Phase 2 (fleet + pricing). PROGRESS in `modules.txt` is the source
of truth - check it first.
- Business + branch model (single main branch, every record will carry `branch_id`),
  opening hours, closure dates, `node ace business:create` bootstrap.
- Six system roles (owner = super admin, manager, front-desk, fleet, driver, accountant),
  DB-driven RBAC with per-user permission overrides, owner-account protection.
- Login rate limiting (5/min per IP+email, 15 min lockout), 7-day tokens.
- Lookups for any staff (`/admin/lookups/business|roles|branches|staff|categories`).
- Business rules (M1.3): `settings` table storing overrides only; defaults + validation in
  `app/services/settings/definitions.ts`; read with `SettingsService.get(key)` — never hardcode
  policy numbers.
- Audit log (M1.4): `AuditService.record(ctx, {action, subject, before, after, metadata}, trx)`
  — call it from controllers with intent-level actions (`<module>.<verb>`), pass the
  transaction, use `AuditService.pick()`; diffing/redaction automatic.
- File storage (M1.5) on **Cloudinary** (`FileService`, `files_module.txt`): upload, import
  from a pasted image link (Cloudinary fetches it - no SSRF), signed URLs for private files.
  Private purposes (ID scans, licences, vehicle documents) are always private, file records
  never carry a link to a private file, and only `GET /files/:id/url` hands one out
  (permission check + audit). Keep it that way (Act 843).
- Fleet (M2.1–M2.4): categories (deposit only - rates come in M2.5), cars (soft archive,
  status changes, odometer log with corrections), photos, car blocks on `car_allocations`
  (exclusion constraint), vehicle documents with daily expiry alerts (cron calls
  `node ace check:document-expiries`, see `setup_command.txt`), in-app notifications.
- Frontend: staff login (httpOnly cookie + `/api/backend/*` proxy), Staff, Roles &
  permissions, Settings, Audit log, Categories, Vehicles (table/grid toggle, add-vehicle
  page, vehicle detail page with tabs; photos by upload, link, paste or drag-and-drop;
  full-screen `ImageViewer`).
- Pricing (Phase 2): see `pricing_module.txt` - all eight parts plus the Get a quote page.
- Tests: backend 135 Japa tests; frontend Playwright smoke + workflows (31 passing) and
  the visual tour.

## Lessons from the last hand-off (read before writing UI)
A previous agent built Phase 2 slice 1 and several things had to be redone:
- **Follow the UI rules in the frontend `CLAUDE.md`.** Filters go in a Filter *dialog*
  (Reset / Cancel / Apply), list pages use the standard toolbar, big records (vehicles,
  later bookings and customers) get their own create page and detail page - not drawers.
  No native `confirm()`, no native date inputs.
- **Check the frontend against the real backend contract** (field names, PUT vs PATCH).
  The category form and odometer dialog sent fields the API doesn't have; only a real
  workflow test (`tests/e2e/fleet.spec.ts`) catches that - smoke tests don't.
- **Never weaken a test to make it pass** (e.g. `if (await x.isVisible())` guards in the tour).
- **ace commands must not import models/services at the top level** - it broke every
  `node ace` command. `tests/unit/commands_imports.spec.ts` guards this.
- Scheduled work must actually be scheduled (cron) and must not repeat itself daily -
  use `notifications.dedupe_key`.

## NEXT TASK: Phase 3 - customers and bookings (see modules.txt)
Phase 2 is DONE: rates, price rules, extras, protection plans, delivery zones, fees, taxes and
the quote engine `PricingService.quote()` (`pricing_module.txt`) with a staff "Get a quote"
page. Bookings MUST price through `PricingService.quote()` - never a second calculation -
and store a snapshot of the quote (lines, days, taxes) on the booking.

Decided with the owner: customers book a SPECIFIC car (staff can swap it, M3.8); taxes per
type of charge; VAT registration lives on the business profile only (no separate switch).

Start with M3.1 customers (Ghana Card / licence uploads are private files - see the files
module rules) and M3.4/M3.5 bookings on `car_allocations` (exclusion constraint already
there). Move POST /admin/quotes to bookings.create when that permission exists.

Small items waiting: Add rate form -> stepped dialog (to match the others); periodic cleanup
of uploaded files never attached; the owner still has to review the (inactive) example
extras / plans / zones / fees and add real taxes.

For each module: migration → model → validator (factories!) → controller (+ audit) → routes
→ permissions in `database/seed_data/role_permission_data.ts` (+ role matrix) → Japa tests →
`http/<module>.http` → `prompt-reference/<module>_module.txt` → frontend module (copy
`src/modules/users` pattern; fleet for record pages) → nav entry → smoke + workflow test +
tour entry → screenshots reviewed → commit + push.

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
Use **Playwright** (installed in the frontend).
Pattern used so far, always on a **throwaway** database:
1. `createdb -h 127.0.0.1 car_rental_e2e`, run migrations against it
   (`DB_DATABASE=car_rental_e2e node ace migration:run`), bootstrap with `business:create`
   (it's interactive — the previous agent drove it with an `expect` script), change the
   owner's temp password via `POST /api/backend/account/change-password`.
2. Backend on port 3334 (`HOST=127.0.0.1 PORT=3334 DB_DATABASE=car_rental_e2e node ace serve`),
   frontend production build on 3001 (`API_URL=http://127.0.0.1:3334 npx next start -p 3001`).
   Use 127.0.0.1, never localhost: "localhost" binds IPv6 only on macOS and the proxy's fetch
   then fails to connect now and then - random 500s in tests that look like app bugs.
3. `E2E_BASE_URL=http://localhost:3001 E2E_EMAIL=... E2E_PASSWORD=... npm run e2e` and
   `npm run e2e:tour`, then LOOK at `test-results/tour/*.png` (light + dark).
4. Stop both servers and `dropdb -h 127.0.0.1 car_rental_e2e` afterwards.
5. The e2e database still uses the real Cloudinary account from `.env`. Routine tests mock
   uploads/imports (see `fleet.spec.ts`); if you upload for real, delete the files afterwards
   through `DELETE /admin/files/:id` so nothing is left in the owner's Cloudinary.

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
Both repos on `main`, tracking `origin/main`, clean at handoff. The backend tracks the generated
`.adonisjs/` route registry - commit it when routes change. Commit with clear messages
(what + why); push when a piece is verified. Never commit `.env`, `http/.env`,
`.claude/settings.local.json`, `test-results/`.

## First steps
Read `prompt-reference/modules.txt` (PROGRESS + Phase 2) and the frontend `CLAUDE.md`, run
both test suites to confirm a green baseline, then propose your plan for Phase 3 to the owner
before writing code.
