# HTTP request collection

Runnable API docs for the car rental backend - one `.http` file per module. Every request
shows the method, URL, required permission, a realistic body and the responses to expect.
Longer explanations (business rules, response shapes) live in `prompt-reference/*_module.txt`.

**This folder in the backend is the source of truth.** The frontend keeps a copy
(`npm run http:sync` in the frontend refreshes it) - edit files here, not there.

## Setup (VS Code)

1. Install the **REST Client** extension (`humao.rest-client`).
2. `cp http/.env.example http/.env` and put a real staff email/password in it
   (git-ignored - never commit credentials).
3. Start the backend (`npm run dev`), open any `.http` file and click **Send Request**
   above a request. Run the `login` request at the top of a file first - the others reuse
   its token.

## Files

| File | Covers |
| --- | --- |
| `auth.http` | login, profile, logout, change password, rate limiting |
| `users.http` | staff users: list/filter, show, create, update, reset password |
| `roles.http` | roles CRUD and role permissions |
| `permissions.http` | permission catalog |
| `lookups.http` | dropdown data for any signed-in staff: business, roles, branches |
| `business.http` | business profile |
| `branches.http` | branches, opening hours, closure dates |
| `settings.http` | business rules (booking, rental, payment, pricing policy) |
| `audit-logs.http` | audit log: list, filter, one record's history, show |

New module = new `<module>.http` file here, same layout, added to this table.
