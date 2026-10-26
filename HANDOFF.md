# Handoff: Wynk car rental system - continue the build

You are taking over an in-progress project from another AI agent (last hand-off: 2026-10-26).
Work the way it did:
- Read before you change, and follow the existing conventions exactly.
- Verify everything you build: tests, typecheck, lint, build, and browser screenshots that
  you actually look at.
- Keep the docs current.
- Commit in small logical steps, and push once a piece is verified.
- Ask the owner before decisions that are genuinely theirs (pricing policy, providers,
  anything outward-facing).
- Explain trade-offs honestly; recommend, don't just list. The owner usually answers
  "go ahead with what you recommend", so make the recommendation concrete.

> The same file lives in both repos (backend and frontend). Keep them in sync if you edit it.

## The product
A car rental management system for **Wynk Car Rentals**, a single-location business in Ghana.
It uses GHS currency, Mobile Money, the Ghana Card and GRA taxes. The staff dashboard comes
first; a public booking website comes later (Phase 7). Owner/dev: the user (GitHub: KwakuJoe).

## Two repos
| | Backend (API) | Frontend (dashboard + public site) |
|---|---|---|
| Path | `/Users/josephampah/Documents/My_Projects/AdonisJS_Project/car_rental_backend` | `/Users/josephampah/Documents/My_Projects/next-essentials/car-rental-frontend` |
| GitHub | https://github.com/KwakuJoe/car_rental_backend | https://github.com/KwakuJoe/car_rental_frontend |
| Stack | AdonisJS 7, Lucid ORM, VineJS 4, PostgreSQL, Japa tests, opaque access tokens | Next.js 16 (App Router, Cache Components, React Compiler, Turbopack), Tailwind v4, shadcn **base-nova** (Base UI), TanStack Query, react-hook-form + zod, Iconify, sonner, Playwright |

## READ THESE FIRST (source of truth)
Backend `prompt-reference/`:
- `modules.txt` holds the full roadmap (Phases 1-10), conventions, the permission catalog and
  the role matrix. It has a **PROGRESS** checklist near the top and owner **DECIDED** notes
  inside each module. Update PROGRESS as you finish modules.
- API references for what's built: `auth_module.txt`, `settings_module.txt`,
  `audit_module.txt`, `files_module.txt`, `fleet_module.txt`, `pricing_module.txt`,
  `customers_module.txt`.
- `setup_command.txt` has install/run instructions and the cron jobs.

Backend `http/` has one `.http` file per module (VS Code REST Client) as runnable endpoint docs.

Frontend `CLAUDE.md` covers architecture, the auth model, the module recipe and the UI
conventions. Follow it.
Frontend `AGENTS.md`: this Next.js version has breaking changes compared with older docs.
Read the relevant guide in `node_modules/next/dist/docs/` before using a Next API you're
unsure of.

## What's done
Phase 1 is done except M1.7 (document numbering). All of Phase 2 (fleet and pricing) is done.
**Phase 3 slice 1** (customers and blacklist) is done. PROGRESS in `modules.txt` is the source
of truth; check it first.

### Phase 1
- Business and branch model: a single main branch, and every record will carry `branch_id`.
  Includes opening hours, closure dates and the `node ace business:create` bootstrap.
- Six system roles (owner = super admin, manager, front-desk, fleet, driver, accountant).
  RBAC is DB-driven, with per-user permission overrides and owner-account protection.
- Login rate limiting (5/min per IP+email, 15 min lockout) and 7-day tokens.
- Lookups for any staff (`/admin/lookups/business|roles|branches|staff|categories`).
- Settings (M1.3): the `settings` table stores overrides only. Defaults and validation live in
  `app/services/settings/definitions.ts`. Read values with `SettingsService.get(key)`; never
  hardcode policy numbers.
- Audit log (M1.4): call `AuditService.record(ctx, {action, subject, before, after, metadata}, trx)`
  from controllers.
  - Use intent-level actions (`<module>.<verb>`).
  - Pass the transaction, and use `AuditService.pick()`.
  - Diffing and redaction are automatic.
- File storage (M1.5) on **Cloudinary** (`FileService`, `files_module.txt`): upload, and import
  from a pasted image link (Cloudinary fetches it, so no SSRF). Private files get signed URLs.
  - Private purposes (ID scans, licences, vehicle documents) are always private.
  - File records never carry a link to a private file.
  - Only `GET /files/:id/url` hands one out, with a permission check and an audit entry.
  - Keep it that way (Act 843).
- In-app notifications (M1.8). The unread-count endpoint returns the standard envelope;
  `tests/functional/api_envelope.spec.ts` checks every route for the envelope.

### Phase 2
- Fleet (M2.1-M2.4):
  - Categories hold the deposit only; rates are separate.
  - Cars: soft archive, status changes, and an odometer log with corrections.
  - Photos.
  - Car blocks on `car_allocations`, protected by an exclusion constraint.
  - Vehicle documents with daily expiry alerts: cron calls
    `node ace check:document-expiries` (see `setup_command.txt`).
- Pricing (M2.5-M2.11), see `pricing_module.txt`:
  - Rates (rate plans).
  - Price rules: up or down, can be switched on and off.
  - Extras, protection plans, delivery zones and fees. These are seeded as **inactive
    examples**, and the owner still has to review them.
  - Taxes per charge type. VAT is charged only while the **business profile** says
    `vat_registered`; there is no separate switch.
  - The quote engine `PricingService.quote()` and `POST /admin/quotes`.

### Phase 3 slice 1: customers and blacklist (M3.1 + M3.3)
See `customers_module.txt`.
- Tables `customers`, `customer_identities` and `blacklist_entries`.
- Phones are normalised to E.164 by `#helpers/phone` `normalizePhone`. The customer phone is
  unique among active (non-archived) customers.
- `normalizeDocumentNumber` turns Ghana Card numbers into the form `GHA-XXXXXXXXX-X`.
- ID numbers are masked unless the user has `customers.view_documents`; document images are
  private files.
- `CustomerStatusService` keeps `verification_status` and `blacklist_severity` correct; call it
  after any identity or blacklist change.
- Includes a duplicate check, archiving, and blacklist matching on phone, Ghana Card, licence
  or passport. A blacklist entry is either warn or block, and it is lifted with a reason.
- Permissions are `customers.view|manage|verify|blacklist|view_documents`, with grants for
  manager, front-desk and accountant. The `userCan` helper is in `#helpers/permissions`.

### Frontend
- Staff login: an httpOnly cookie plus the `/api/backend/*` proxy. The proxy returns a 502
  JSON response when the backend is unreachable.
- Pages for Staff, Roles & permissions, Settings and the Audit log.
- Fleet: Categories; Vehicles with a table/grid toggle (4 columns), an add-vehicle page, and a
  vehicle detail page with tabs; photos by upload, link, paste or drag-and-drop; a full-screen
  `ImageViewer`.
- Pricing pages: rates, price rules, extras, protection plans, delivery zones, fees, taxes, and
  **Get a quote** (`/dashboard/quote`).
- Customers: list, an add/edit stepped dialog with duplicate and blacklist hints, a detail page
  with Profile and Documents tabs (the Bookings tab is still to come), and the Blacklist page.
- UI patterns, all described in `CLAUDE.md`:
  - **Stepped dialogs** (`FormStepper`) for any form with more than a handful of fields. These
    are rates, price rules, categories, taxes and customers. Continue validates the current
    step; server errors jump back to their step; the final summary step replaces the confirm
    dialog.
  - `ComboSelect`: lists that grow search on the server; short lists search locally. Use
    `CarSelect` and `CustomerSelect`.
  - **`PhoneInput`** (`@/components/ui/phone-input`, built on react-phone-number-input) for
    **every** phone field. It has a searchable country picker, defaults to GH, and gives E.164
    values. Validate with `isValidPhoneNumber`, load stored values with `toPhoneValue`, and
    show them with `displayPhone`.
  - TanStack Query: a QueryCache `onError` logs failures. Queries where a 4xx is expected set
    `meta.expected4xx`.

### Tests (last green run)
- Backend: **151** Japa tests (incl. the bookings concurrency test).
- Frontend: **37** Playwright tests (setup, smoke and workflows: fleet, pricing,
  pricing-catalog, quote, customers, bookings), plus the visual tour. The last full run was
  before bookings; bookings, quote and smoke were run after it.
- The last full e2e run had 3 tests time out because the machine was overloaded (load average
  ~200, from VS Code extension hosts and Rider). Re-run serially with `--workers=1`, all 9
  tests in those files passed.

## NEXT TASK: Phase 3 slice 3 - cancel flow polish, calendar, Today board
**Slice 2 (bookings) is DONE** - see `prompt-reference/bookings_module.txt`:
- Backend: M1.7 numbering (`WYK-2026-00001`), `GET /admin/availability`, bookings (pending
  hold / confirmed, quote snapshot, discounts with a 10% staff limit, blacklist / age checks
  with `bookings.override`, confirm / cancel / no-show, history), cancellation settings and
  `CancellationService`, the `bookings:expire-holds` cron, and the concurrency test.
- Frontend: Bookings list (Filter dialog), New booking page (4 steps: customer & dates →
  car from availability → extras & delivery → price & confirm), booking detail page
  (Overview / Price / History, Confirm / Cancel with the policy fee / No-show), and the
  customer's Bookings tab. "Get a quote" now needs `bookings.create`.

**Slice 3** (next):
- **Booking calendar (M3.7):** `GET /admin/calendar` with per-car rows of allocations; a
  timeline view.
- **Today board (M3.10):** pickups and returns today, overdue rentals, holds about to expire,
  unverified customers picking up today, cars with expired documents.
- **The "current / next booking" card** at the top of the customer Profile tab (like the
  hostel's "Current stay").
- **Editable business `document_prefix`** (the `WYK` part of references) on the business
  profile.

**Slice 4:** modifications (M3.8: extend at today's rates, swap, change dates, early return
with no refund by default) and drivers (M3.9, driver_allocations with the same constraint).

### Owner decisions already made (don't re-ask)
- Customers book a **specific car**; staff can swap it (M3.8).
- Taxes attach per type of charge. VAT registration lives on the business profile only.
- Cancellation tiers are settings, with the defaults above.
- The staff discount limit is 10%.
- References look like `WYK-2026-00123`.
- Extensions use today's rates.
- A blacklist "block" can be overridden only by a manager, with a reason.

### Small items waiting
- The owner asked for lean testing while building: lightly tested areas are listed in the
  **TESTING BACKLOG** in `modules.txt` (under PROGRESS). Add to it, and cover it before go-live.
- Cron on the server: `files:cleanup` nightly and `bookings:expire-holds` every 5 minutes
  (see `setup_command.txt`).
- The owner has to review the inactive example extras, plans, zones and fees, and add real
  taxes.
- Optional, offered to the owner: the backend could also normalise user, branch and business
  phones to E.164 (only customer phones are normalised server-side today; the frontend already
  sends E.164).
- The odometer usage chart per vehicle is on the roadmap (M8.6).

### Module recipe
For each module, in order:
1. Migration, then model, then validator (use factories).
2. Controller (with audit), then routes.
3. Permissions in `database/seed_data/role_permission_data.ts`, plus the role matrix in
   modules.txt.
4. Japa tests, then `http/<module>.http`, then `prompt-reference/<module>_module.txt`.
5. Frontend module: copy the `src/modules/customers` pattern (list + stepped dialog + detail
   page), add the nav entry, and a smoke test, a workflow test and a tour entry.
6. Review the screenshots, then commit and push.

## Rules the owner cares about
- **Stop before committing if any test fails.** Fix it, or tell the owner; never commit red.
- **Never weaken a test** to make it pass.
- **Never edit the owner's `.env` / `.env.local` files.** Tell them the exact lines to change.
  Recommended there: backend `HOST=127.0.0.1`; frontend `API_URL=http://127.0.0.1:3333`.
- Never use the real dev DB `car_rental_db` for experiments.
- Keep the brand red `#FB242F`.
- Explain errors the owner pastes. Typical Turbopack/dev-cache errors ("X is not a function",
  "Could not validate instant") are fixed by stopping the dev server, running
  `rm -rf .next/dev`, and restarting.

## Lessons from earlier hand-offs (read before writing UI)
- **Follow the UI rules in the frontend `CLAUDE.md`.**
  - Filters go in a Filter *dialog* (Reset / Cancel / Apply).
  - List pages use the standard toolbar.
  - Big records (vehicles, customers, bookings) get their own create/detail pages; forms with
    many fields are stepped dialogs, not cramped drawers.
  - No native `confirm()`, and no native date inputs.
- **Check the frontend against the real backend contract** (field names, PUT vs PATCH). Only a
  real workflow test catches a mismatch; smoke tests don't.
- e2e tests must not assume a new row appears on page 1: search or filter for it first. Wait
  for `getByRole('dialog')` to have count 0 instead of waiting for toasts.
- **ace commands must not import models or services at the top level**
  (`tests/unit/commands_imports.spec.ts` guards this).
- Scheduled work must actually be scheduled (cron) and must not repeat daily; use
  `notifications.dedupe_key`.

## Environment facts (important)
- **Node:** the default shell PATH has an old Node 16. Always prefix commands with
  `export PATH=~/.nvm/versions/node/v24.20.0/bin:$PATH`.
- **Shell is zsh:**
  - An unquoted `$VAR` holding several paths is NOT word-split; use arrays, `xargs`, or
    `${=VAR}`.
  - Never name a loop variable `path`, because it clobbers `PATH`.
  - Quote globs such as `--include='*.tsx'`.
- **Postgres:** local Homebrew Postgres 18 on 127.0.0.1:5432. The role is the macOS user
  `josephampah`; there is no `postgres` role. The dev DB is `car_rental_db` and the test DB is
  `car_rental_db_test`. The owner's real dev data (owner theboss@gmail.com) lives in
  `car_rental_db`; **never** use it for experiments.
- After adding migrations, run both `node ace migration:run` and
  `NODE_ENV=test node ace migration:run`. After adding permissions, run `node ace db:seed`
  (additive, safe).
- Backend checks: `npm run typecheck`, `npm run lint`,
  `npx prettier --check app start tests database`, `node ace test`.
- Frontend checks: `npx tsc --noEmit`, `npm run lint`, `npm run format:check`,
  `npm run build`, `npm run e2e`.
  - If `tsc` complains about `.next/dev/types` (the owner's dev server writes there), typecheck
    with a temporary tsconfig that extends the project's and excludes `.next/dev`.
- Frontend formatting: use the **project's** Prettier (`npm run format`, or `npx prettier`
  inside the frontend folder). Never run Prettier in a folder that has none installed; it
  applies defaults and rewrites everything.
- The machine is often under heavy load (VS Code extension hosts, Rider), which causes
  Playwright timeouts. The config allows a 15s expect timeout and a 90s test timeout. Rerun the
  failed specs with `--workers=1` before suspecting the code, and tell the owner if it's load.

## Browser verification (do this for every UI change)
Use **Playwright** (installed in the frontend), always on a **throwaway** database:
1. Create the database: `createdb car_rental_e2e`, then
   `DB_DATABASE=car_rental_e2e node ace migration:run --force`, then
   `DB_DATABASE=car_rental_e2e node ace db:seed`. The database may already be gone; recreate
   it.
2. Bootstrap with `node ace business:create`. It is interactive, so drive it with an `expect`
   script:
   - business "Wynk Car Rentals", email `e2e@rentals.test`
   - press Enter for phone, city and region
   - owner "Ama Mensah", owner email `owner@e2e.test`

   It prints a temporary password.
3. Start the backend on 3334:
   `HOST=127.0.0.1 PORT=3334 DB_DATABASE=car_rental_e2e node ace serve`.
4. Set the owner's password to the test password `OwnerPass123`:
   - `POST http://127.0.0.1:3334/api/v1/auth/login` with `{email, password}` returns the token.
   - `POST /api/v1/account/change-password` takes
     `{currentPassword, password, passwordConfirmation}`.
5. Build the frontend with `API_URL=http://127.0.0.1:3334 npx next build`, then run it with
   `API_URL=http://127.0.0.1:3334 npx next start -p 3001`. Use 127.0.0.1, never localhost:
   localhost resolves to IPv6 on macOS and causes random 500s.
6. Run the tests:
   `E2E_BASE_URL=http://127.0.0.1:3001 E2E_EMAIL=owner@e2e.test E2E_PASSWORD=OwnerPass123 npx playwright test`.
   Run `npm run e2e:tour` too, then LOOK at the screenshots in light and dark mode.
7. Stop both servers afterwards (and `dropdb car_rental_e2e` if you're done with it).
8. The e2e setup uses the real Cloudinary account from `.env`. Routine tests mock uploads (see
   `fleet.spec.ts`). If you upload for real, delete the files afterwards through
   `DELETE /admin/files/:id`.

Full-page screenshots show sticky elements mid-page; that's the capture method, not a bug.

## Gotchas already learned (don't rediscover them)
- **VineJS:** rule methods mutate the schema, so build fields with factory functions and use
  `vine.create`. `vine.date()` returns a Luxon `DateTime`. For "unique except self", use
  `.unique({ table, column, filter })`.
- **Lucid jsonb:** encode explicitly with `@column({ prepare: (v) => JSON.stringify(v) })`.
- Postgres NUMERIC comes back as padded strings; convert them in the transformer.
- The model query builder's `.update({...})` takes **column names**.
- New rows don't know DB defaults until reloaded; set booleans explicitly before returning.
- Partial unique indexes and exclusion constraints are created with `this.schema.raw(...)` in
  migrations. Examples: `customers_phone_active`, `protection_plans_one_default`,
  `rate_plans_no_overlap`.
- The import alias `#helpers/*` exists (package.json `imports`).
- Tests:
  - `tests/bootstrap.ts` clears the rate limiter before each test.
  - Cast typed client bodies: `response.body() as Record<string, any>`.
  - ESLint forbids `(await x).y`; assign to a variable first.
- `database/schema.ts` is generated by migrations; never edit it.
- Base UI uses the `render` prop, not `asChild`. Popovers auto-focus their first element; pass
  `initialFocus={false}` when that would scroll or steal focus. The shared `CommandItem` shows a
  tick through `data-checked`.
- Next 16:
  - `middleware.ts` is now `proxy.ts`, and `cookies()` is async.
  - Session reads go inside `<Suspense>`.
  - Server Components can't delete cookies.
- React Compiler lint:
  - No `setState` inside effects, and no ref reads during render.
  - Use `useWatch`, not `form.watch()`.
  - Debounce JSON strings, not objects (an object caused a re-render loop).
- `.http` files: the backend `http/` folder is the source of truth; refresh the frontend copy
  with `npm run http:sync`.

## Conventions in one breath
- Money is integer pesewas; display it with `formatMoney`.
- Timestamps are UTC; the business timezone is Africa/Accra.
- IDs are ULIDs.
- The response envelope is `{ message, data, meta? }`.
- List endpoints use `BaseFilter` (page, limit, search, sortBy, sortOrder).
- Never hard-delete business records, and audit every change.
- Permissions are named `module.action`.
- UI:
  - Controls are `h-10`; brand red is `--brand-primary: #fb242f`, with a soft focus ring.
  - Tags are neutral; red only for actions and problems.
  - List pages have a toolbar (search, Filter dialog, Refresh, Add), a table and pagination.
  - Use stepped dialogs or pages for forms, and small drawers only for short forms.
  - For dates and times use `DatePicker`, `TimePicker` and `DateTimePicker`.
  - `ComboSelect` options have a short label plus a `sublabel`.
  - Phones use `PhoneInput`.

## Git
Both repos are on `main`, tracking `origin/main`, and were clean at hand-off:
- backend and frontend: Phase 3 slice 2 (bookings)

The backend tracks the generated `.adonisjs/` route registry; commit it when routes change.
Write commit messages that say what and why. Never commit `.env`, `http/.env`,
`.claude/settings.local.json` or `test-results/`.

## First steps
1. Read `prompt-reference/modules.txt` (PROGRESS, plus Phase 3 M3.4-M3.10 and M1.7),
   `customers_module.txt`, `pricing_module.txt` and the frontend `CLAUDE.md`.
2. Run both test suites to confirm a green baseline.
3. Tell the owner the slice 2 plan (above) in a few lines, then build it backend first
   (numbering → availability → bookings + tests, including the concurrency test), then the
   frontend.
