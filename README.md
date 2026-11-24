# Reduium Shipment Company

Logistics, package tracking and shipment management platform.

> **Status:** Stage 8 of 9 (security testing and bug fixing). See [Build progress](#build-progress). See [Build progress](#build-progress).

## Project layout

```
apps/
  web/        React 19 + Vite + Tailwind CSS 4: public website and admin dashboard
  api/        Node.js + Express 5: backend API (talks to the database)
packages/
  shared/     Statuses and tracking-number rules used by both apps
```

The website never connects to the database directly. Only `apps/api` does.

## Requirements

- Node.js 24 LTS or newer
- A Neon account, with a project named `reduium-shipment` and a `dev` branch

## First-time setup

```bash
npm install
```

### Connect the database (Neon)

1. In the Neon console, open the **reduium-shipment** project → **Connect** → select the **dev** branch.
2. Open `apps/api/.env` in your editor. It was created from `.env.example`.
3. Paste the **pooled** string (host contains `-pooler`) into `DATABASE_URL`.
4. Turn off "Connection pooling" in Neon's Connect dialog and paste that **direct** string into `DIRECT_URL`.
5. Keep the double quotes around each value and make sure both end with `sslmode=verify-full` (encrypted, with the server certificate verified).
6. Verify:

   ```bash
   npm run db:check
   ```

   The check never prints your credentials. It reports pass/fail checks, the database name, the PostgreSQL version, the Neon project/branch/endpoint IDs (identifiers, not secrets) and which migrations are applied.

7. Create the tables, then (optionally) add sample data and your first admin account:

   ```bash
   npm run db:migrate:deploy -w @reduium/api
   npm run db:seed -w @reduium/api          # optional: 3 sample shipments, all labelled TEST DATA
   npm run admin:create -w @reduium/api     # asks for name, email and a password (visible as you type)
   ```

**Never** paste connection strings into chat, issues, frontend code or any committed file. `.env` is git-ignored. If a string leaks, reset the role password in Neon (**Roles → Reset password**).

## Database

PostgreSQL on Neon, managed with [Prisma](https://www.prisma.io) 7.10.1. The schema lives in [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma) and every change to it goes through a migration in [`apps/api/prisma/migrations/`](apps/api/prisma/migrations/).

| Table                        | Holds                                                                                                                                                     |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admins`                     | Staff accounts: name, unique email, Argon2id password hash, role (`ADMIN` or `OPERATOR`), status (`ACTIVE`/`DISABLED`), login-throttling fields           |
| `sessions`                   | Server-side login sessions. Stores a SHA-256 hash of the cookie token, never the token itself. Expires after 12 h, or 2 h idle                            |
| `shipments`                  | One row per shipment: unique tracking number, status, method, sender and recipient (private), city-level origin/destination (public), current location    |
| `tracking_events`            | A shipment's history: status, location, description and when it happened. Many per shipment, always read in chronological order                           |
| `support_requests`           | Messages from the contact form: customer reference (`SUP-XXXX-XXXX`), topic, status, priority, assignee, and when it was resolved, closed and last active |
| `support_request_activities` | A support request's timeline: internal notes, recorded replies, and status/priority/assignee changes. Append-only                                         |
| `audit_logs`                 | Append-only record of staff actions: who, what, which record, when, and the changed fields (personal data redacted)                                       |

**Rules the database enforces itself**, so a bug in the app can't store bad data:

- Tracking numbers must be unique and match `RDM-XXXX-XXXX-C`.
- Country codes must be 2 upper-case letters.
- A delivered shipment must have a delivery time.
- Admin emails must be lower-case, so `A@x.com` and `a@x.com` can't both exist.
- Password hashes must be Argon2id.
- The audit log rejects edits and deletions.
- Support references must be unique and match `SUP-XXXX-XXXX`. A Resolved request must have a resolved time, and a Closed one a closed time.
- Each support timeline entry carries exactly the fields of its kind (a note is never a reply or a status change), with real status and priority values only. The timeline rejects edits, and deletions except when an administrator deletes the whole request.
- Admins who have done anything can't be deleted, only disabled. That keeps the audit trail intact.

**Public vs private.** Public tracking reads only an explicit allow-list of columns (see [`apps/api/src/services/tracking.ts`](apps/api/src/services/tracking.ts)): status, method, origin and destination cities, current location, dates, and the event history. Names, companies, emails, phone numbers, street addresses, package contents, notes and staff details are never fetched for it.

**Connections and TLS.**

- **The running app** uses the pooled `DATABASE_URL` through node-postgres, with `sslmode=verify-full`.
- **Migrations** use the direct `DIRECT_URL`. Prisma's migration engine silently ignores `verify-full`. Tested with 7.10.1: it connected to a server whose certificate didn't match. So [`prisma.config.ts`](apps/api/prisma.config.ts) translates the URL to the engine's own strict mode (`sslmode=require&sslaccept=strict`), and it refuses any URL that doesn't ask for verification.
- **Tests:** a live test proves that both clients reject a mismatched certificate.

**Migrations are all-or-nothing (tested, not assumed).** Prisma 7.10.1 sends each migration file to PostgreSQL as one request, which PostgreSQL runs as a single transaction. In a throwaway schema, a deliberate failure at the very end of the Stage 7 migration left nothing behind, and Prisma recorded the real error. Migration files therefore do **not** add their own `BEGIN`/`COMMIT`: tested the same way, that changed nothing about safety but hid the real error behind "current transaction is aborted". After a failed migration, Prisma refuses further deploys until you fix the cause and run `npx prisma migrate resolve --rolled-back <migration name>` in `apps/api`.

### Database commands (run from the project root)

| Command                                     | What it does                                                                                        |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run db:check`                          | Connection check (never prints secrets)                                                             |
| `npm run db:migrate:status -w @reduium/api` | Which migrations are applied                                                                        |
| `npm run db:migrate:deploy -w @reduium/api` | Apply pending migrations                                                                            |
| `npm run db:migrate:dev -w @reduium/api`    | Create a new migration after editing the schema (development only)                                  |
| `npm run db:seed -w @reduium/api`           | Add sample data, flagged as test data. Does nothing if it's already there. Never runs in production |
| `npm run admin:create -w @reduium/api`      | Create an admin account. There is no default admin or built-in password                             |

### How the database tests stay away from real data

`npm test` runs the database tests inside a separate schema, `reduium_test`, in the same dev database:

1. Before each run, that schema is dropped and rebuilt from the migrations.
2. Tables are emptied between tests.
3. The real tables in `public` are never read or written by tests.

If `apps/api/.env` is missing, the database tests are skipped with a warning.

## Everyday commands

| Command                            | What it does                                                 |
| ---------------------------------- | ------------------------------------------------------------ |
| `npm run dev`                      | Starts the API (port 4000) and website (port 5173) together  |
| `npm run typecheck`                | TypeScript checks for all packages                           |
| `npm run lint`                     | Code-quality checks                                          |
| `npm test`                         | API, database and shared-logic tests (needs `apps/api/.env`) |
| `npm run test:e2e -w @reduium/web` | Browser tests (desktop and mobile)                           |
| `npm run build`                    | Production builds of the API and website                     |
| `npm run check`                    | Type-check, lint, test and build in one go                   |

Open http://localhost:5173 while `npm run dev` is running.

## Tracking numbers

Format: `RDM-XXXX-XXXX-C`, for example `RDM-7K4P-9X2Q-R`.

- 8 random characters from an alphabet that excludes look-alikes (0/O, 1/I/L, U)
- A final check character (Luhn mod N) that catches every single-character typo

## Package tracking

### For customers

Enter a tracking number on the homepage or at `/track`. The results page `/track/RDM-XXXX-XXXX-C` shows:

- **Current status:** a badge and heading, plus plain-language advice when a shipment is delayed, on hold, or a delivery was attempted.
- **Journey bar:** Registered → At origin → In transit → Out for delivery → Delivered. Each stage is marked complete, current or upcoming. Exceptions are flagged at the stage the shipment has actually reached.
- **Route:** origin and destination city and country, plus the current location.
- **Delivery date:** the estimated delivery date (marked "may change" if delayed), or the delivery time once delivered.
- **Service and last update:** the shipping method and when the shipment was last updated.
- **History:** the full tracking history, oldest first, with the latest update highlighted. Times are shown in the visitor's own time zone, with the zone named.

Anything a shipment doesn't have yet is shown as **Not available yet**, never invented. Development sample shipments carry a visible **Test data** notice.

Every outcome has its own screen: loading, found, no shipment found, invalid number, too many lookups, and a "couldn't load" error with a working **Try again** button. **Track another shipment** returns to the search box.

**Try it locally** with the sample shipments from `npm run db:seed -w @reduium/api`. The seed prints their tracking numbers; in the current dev database they are:

- `RDM-46EH-YBRW-8` (delivered)
- `RDM-VGYD-H7Q5-V` (at customs)
- `RDM-PFBP-R2CQ-B` (delayed)

### Tracking API

`GET /api/tracking/:trackingNumber`. Loose input such as `rdm 7k4p 9x2q r` is accepted and normalised.

| Status | Body                                                                                             | When                                                      |
| ------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| 200    | `{ "shipment": PublicTrackingResult }`                                                           | Found                                                     |
| 400    | `{ "error": { "code": "INVALID_TRACKING_NUMBER", "message": … } }`                               | Wrong format or check character (no database lookup)      |
| 404    | `{ "error": { "code": "SHIPMENT_NOT_FOUND", "message": … } }`                                    | Valid number, no such shipment                            |
| 429    | `{ "error": { "code": "RATE_LIMITED", "details": { "retryAfterSeconds": n } } }` + `Retry-After` | Too many lookups                                          |
| 500    | `{ "error": { "code": "INTERNAL_ERROR", … } }`                                                   | Unexpected failure (generic message, no internal details) |

`PublicTrackingResult` is defined in [`packages/shared/src/public-tracking.ts`](packages/shared/src/public-tracking.ts). It contains the tracking number, status, method, origin and destination city and country, current location, estimated delivery date, delivery time, last update, test-data flag, and the event history (status, location, description, time).

Sender and recipient names, companies, emails, phone numbers, street addresses, package contents, weight, notes, staff names and database IDs are **never** included. They aren't even read from the database for this endpoint.

Responses are sent with `Cache-Control: no-store` and `X-Robots-Tag: noindex`.

**Rate limits, per visitor IP:**

- **60 lookups per minute.** This stops floods and scraping.
- **20 failed lookups per 15 minutes.** Only invalid or unknown numbers count. This stops anyone guessing tracking numbers, without affecting customers who look up real shipments. Server errors never count against a visitor.

Limits are kept in the API's memory, which is right for a single server. If the API is ever run on several servers, they need a shared store (e.g. Redis). This is noted for Stage 9.

## Staff sign-in and admin security

### Create the first administrator

There is no default account and no built-in password. Create one in a terminal:

```bash
npm run admin:create -w @reduium/api
```

It asks for your name, email and a password. The password is **visible as you type it** and asked twice. It must be at least 6 characters. Because it stays on screen, clear the terminal afterwards (`cls` on Windows, `clear` on Mac/Linux) if anyone else can see it. Only an Argon2id hash is stored. While there is no active Administrator, the new account is always made an **Administrator** (disabled accounts and Operators, like the browser-test account, do not count); after that you choose Administrator or Operator. Then sign in at http://localhost:5173/admin/login.

### Roles

| Permission                                     | Administrator | Operator |
| ---------------------------------------------- | :-----------: | :------: |
| View, create and update shipments and tracking |       ✓       |    ✓     |
| Archive and restore shipments                  |       ✓       |    ✓     |
| Permanently delete archived shipments          |       ✓       |          |
| Read and handle support requests               |       ✓       |    ✓     |
| Permanently delete closed support requests     |       ✓       |          |
| View and manage staff accounts, read audit log |       ✓       |          |

The map lives in [`packages/shared/src/permissions.ts`](packages/shared/src/permissions.ts). **The API enforces it on every request.** The website uses the same map only to decide what to show.

### Endpoints

| Endpoint                | What it does                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `POST /api/auth/login`  | `{ email, password }` → sets the session cookie, returns the admin, permissions and CSRF token |
| `GET /api/auth/session` | Who is signed in (401 if nobody). Also refreshes the idle timer                                |
| `POST /api/auth/logout` | Ends the session on the server and clears the cookie (needs the CSRF token)                    |
| `GET /api/admin/admins` | Staff accounts. Administrators only (Operators get 403)                                        |

Everything under `/api/admin` automatically requires:

- a valid session (otherwise 401);
- the CSRF token on every POST, PUT, PATCH or DELETE (otherwise 403);
- the endpoint's own permission (otherwise 403).

### How it's protected

- **Passwords:**
  - Verified with Argon2id and never stored, returned or logged.
  - Hashes made with older, weaker settings are upgraded automatically at the next sign-in.
- **Sessions:**
  - A random 256-bit token in a cookie. The database stores only its SHA-256 hash.
  - Sessions end after 12 hours, or after 2 hours without activity.
  - Disabling an account or changing its password ends its sessions immediately.
  - Every sign-in creates a brand-new session and destroys any previous one (prevents session fixation).
- **Cookie:**
  - `HttpOnly` (scripts can't read it) and `SameSite=Strict`.
  - In production it is also `Secure` and named `__Host-reduium_session`, so it's HTTPS-only and locked to this exact site.
- **CSRF:** three layers.
  1. The SameSite cookie.
  2. An **Origin check**: state-changing requests must come from `WEB_ORIGIN`.
  3. A **CSRF token**, derived from the session token, sent in the `X-CSRF-Token` header.
- **Brute force:**
  - At most 10 failed sign-ins per 15 minutes per IP address, and 30 attempts of any kind.
  - Each account pauses for 15 minutes after every 5 wrong passwords in a row.
- **No account enumeration:**
  - Wrong password, unknown email, paused account and disabled account all get the **same** message.
  - Unknown emails still run a full Argon2 check against a dummy hash, so response time gives nothing away.
- **Audit log:**
  - Every sign-in, failed attempt (with its reason) and sign-out is recorded, with IP address and browser.
  - Emails typed for unknown accounts are **not** recorded, since they're often someone's mistyped real address.
- **Open redirects blocked:** after sign-in, the site returns only to pages inside `/admin`.

**Two-factor sign-in (authenticator app): deferred.** Staff sign in with email and password only. Adding a second step with an authenticator app was considered and is **deferred: not currently approved for implementation**. No two-factor code, dependency or database field exists, and the sign-in system is unchanged. All the protections above stay in force. If it's approved later, it would be added as an extra step after the password check, without weakening any of them.

### Browser-test account

The browser tests sign in for real with one dedicated account, `e2e-browser-tests@example.invalid`. It's an Operator, the least-privileged role.

- Each test run gives it a new random password that exists only in that run's memory.
- After the run, it's **disabled** and its sessions are deleted.
- Each switch on or off is audit-logged.
- Support requests sent by the browser tests use `e2e.support.<anything>@example.invalid`. They are deleted (and audit-logged by reference only) when the account is switched on and off. Nothing else is touched.
- `E2E_NO_DB=1` runs the browser tests without the test account, so nothing is written to the database: the real sign-in tests are skipped (public tracking tests still read the sample shipments).

See [`apps/api/scripts/e2e-account.ts`](apps/api/scripts/e2e-account.ts).

## Shipment management (admin)

Sign in at `/admin/login`.

### Screens

- **Overview (`/admin`):**
  - Live figures: shipments in progress, needing attention (delayed, on hold, delivery attempted), overdue (past the estimated date) and delivered in the last 7 days. Each figure links to the matching list.
  - A "needs attention" list (most urgent first) and recently updated shipments.
  - In-progress shipments counted by status.
- **Shipments (`/admin/shipments`):**
  - Search by tracking number (any part, in any format), sender or recipient name, company or email, city, or current location.
  - Views: In progress, Needs attention, Delivered, Archived and All. Filter by status or method; sort by last update, newest, or delivery date.
  - 25 per page. Filters are kept in the address, so a view can be bookmarked or shared.
- **New shipment:** sender, recipient, route, package and delivery details. The tracking number is generated on save.
- **Shipment page:**
  - Add a tracking update: status, location, description and time. If you leave the time alone, it uses the moment you save.
  - Edit or delete entries in the history, shown newest first.
  - Edit details, archive or restore, and open the public tracking page.
  - Administrators also see the shipment's activity log and can delete permanently.

### Rules that keep the data trustworthy

- **Status and location only change through tracking updates.** The current status is always the newest update by event time, so the history and the public page can never disagree. Editing or deleting an update recalculates it, and a shipment always keeps at least one update.
- **No lost edits:** if someone else changed a shipment after you opened its edit form, your save is refused with a "load the latest version" button instead of overwriting their work.
- **Archived shipments** are hidden from the active lists and read-only, but customers can still track them, and they can be restored.
- **Permanent deletion** needs the Administrator role, an archived shipment, and the tracking number typed as confirmation.
- **Audit log:** every change is recorded (who, what, when, which fields). Customers' personal details are recorded as `[redacted]`.

### Admin shipment API (all under `/api/admin/shipments`; session + CSRF token required)

| Method and path                   | Permission         | What it does                                                                  |
| --------------------------------- | ------------------ | ----------------------------------------------------------------------------- |
| `GET /`                           | `shipments:read`   | List and search (`q`, `view`, `status`, `method`, `sort`, `page`, `pageSize`) |
| `GET /stats`                      | `shipments:read`   | Dashboard figures                                                             |
| `POST /`                          | `shipments:write`  | Create a shipment                                                             |
| `GET /:id`                        | `shipments:read`   | Full details and history                                                      |
| `PUT /:id`                        | `shipments:write`  | Save edits (needs `expectedUpdatedAt`; 409 if stale)                          |
| `POST /:id/events`                | `shipments:write`  | Add a tracking update                                                         |
| `PUT /:id/events/:eventId`        | `shipments:write`  | Correct a tracking update                                                     |
| `DELETE /:id/events/:eventId`     | `shipments:write`  | Remove a tracking update                                                      |
| `POST /:id/archive`, `/unarchive` | `shipments:write`  | Archive or restore                                                            |
| `DELETE /:id`                     | `shipments:delete` | Permanently delete (archived only, `{ confirmTrackingNumber }`)               |
| `GET /:id/activity`               | `audit:read`       | The shipment's audit trail                                                    |

Shipments created by the browser tests are deleted automatically after each test run. Only shipments created by the test account are touched.

## Customer support

### For customers (`/support`)

A contact form: name, email, optional phone, optional tracking number, topic, subject and message.

- Missing or invalid fields are explained next to the field, and focus moves to the first problem.
- After sending, the customer sees a reference such as `SUP-7K3M-QX9P` to quote later. **No confirmation email is sent**, and the page says so.
- The tracking number is checked for format only. The answer is the same whether or not the shipment exists, so the form can't be used to discover real tracking numbers.
- Spam protection: a hidden "spam trap" field (a filled-in one is refused with an honest error, never a fake success), and per-IP limits: 30 attempts per 15 minutes, and 5 accepted messages per hour and 20 per day (typing mistakes don't count).

### For staff

- **Overview (`/admin`):** open, new, unassigned, assigned-to-me and waiting-on-customer counts, and the oldest open requests.
- **Inbox (`/admin/support`):**
  - Views: Open, Unassigned, Assigned to me, Waiting on customer, Resolved, Closed and All.
  - Search by reference, name, email, subject, message or tracking number. Filter by status, topic or priority. Sort by newest, oldest or recent activity.
  - Filters are kept in the address bar.
- **Request page:** the customer's message (shown as plain text), contact details, a link to the shipment when the tracking number matches one, and the timeline. Staff can:
  - change status, priority and assignee (assigning a New request starts it);
  - add an **internal note** (staff only, never sent to the customer);
  - **record a reply**, then send it with **Open in my email** or **Copy reply text**. Reduium does not send email: recorded replies are labelled "not sent by Reduium" everywhere;
  - as administrators, see the audit log and permanently delete a **Closed** request after typing its reference.

### Statuses

| Status              | Meaning                                                           |
| ------------------- | ----------------------------------------------------------------- |
| New                 | Nobody has picked it up yet                                       |
| In progress         | Someone is working on it                                          |
| Waiting on customer | We replied and need more from the customer                        |
| Resolved            | Answered or fixed; can be reopened                                |
| Closed              | Finished; read-only (no notes, replies or changes) until reopened |

Priority is Normal or Urgent. Requests can be assigned to any active staff member who handles support. A request whose assignee is later disabled shows "assignee disabled" and appears under Unassigned.

### Rules

- **Notes and replies never mix:** they are different entry types, enforced by the database.
- **The timeline is append-only:** mistakes are corrected with a new entry.
- **No lost changes:** a change is refused (with "Load the latest version") if someone else changed the request after you opened it.
- **Audit log:** every staff action is recorded. Customer details and note or reply text are not copied into it.
- Customer submissions themselves are not audit-logged; the request is the record.

### Public support API

| Method and path     | What it does                                                                |
| ------------------- | --------------------------------------------------------------------------- |
| `POST /api/support` | Save a contact-form message. Returns only `{ reference, receivedAt }` (201) |

### Admin support API (all under `/api/admin/support`; session + CSRF token required)

| Method and path     | Permission       | What it does                                                                    |
| ------------------- | ---------------- | ------------------------------------------------------------------------------- |
| `GET /`             | `support:read`   | Inbox (`q`, `view`, `status`, `topic`, `priority`, `sort`, `page`, `pageSize`)  |
| `GET /stats`        | `support:read`   | Dashboard figures                                                               |
| `GET /assignees`    | `support:read`   | Staff who can be assigned                                                       |
| `GET /:id`          | `support:read`   | Full request and timeline                                                       |
| `PATCH /:id`        | `support:write`  | Status, priority and/or assignee (needs `expectedUpdatedAt`; 409 if stale)      |
| `POST /:id/notes`   | `support:write`  | Add an internal note                                                            |
| `POST /:id/replies` | `support:write`  | Record a reply sent from your own email (`markWaiting` optional). Sends nothing |
| `DELETE /:id`       | `support:delete` | Permanently delete (Closed only, `{ confirmReference }`)                        |
| `GET /:id/activity` | `audit:read`     | The request's audit trail                                                       |

### Not included yet

- **Email:** Reduium sends no email (no confirmation to customers, no replies, no staff alerts). That needs an email provider, a verified sending domain and an API key.
- **CAPTCHA:** not added. The spam trap and rate limits stop casual spam only.
- **Attachments**, and **automatic deletion after a retention period**, are not built.

## Languages (localization)

The customer website is built to be shown in several languages. The admin dashboard stays in English for now (the same system can translate it later).

### Addresses

Every public page has its language at the start of the address: `/en/`, `/es/track/RDM-…`, `/pt-BR/support`, `/zh-CN/`, `/ar/`, `/ja/`.

- **Old links keep working.** An address without a language (`/track/RDM-…`, `/support`, the bare domain) is redirected to the visitor's language, keeping the page, tracking number, query and `#anchor`.
- **Changing language** with the selector in the header changes only the `/xx/` part: same page, same tracking number, same scroll position. The choice is remembered on that device (only the language code is stored).
- Letter case doesn't matter (`/PT-br/` → `/pt-BR/`). Admin addresses (`/admin/…`) never carry a language.

### Which language a visitor gets

1. The language they chose before on this device, otherwise
2. their browser's preferred language, **only if that translation is English or reviewed**, otherwise
3. English.

Regional variants map sensibly (es-MX → Spanish, pt-PT → Portuguese (Brazil), de-AT → German). Simplified and Traditional Chinese are kept apart: a Traditional-Chinese browser is never sent to Simplified Chinese.

### Translation status (internal)

Each language in [`packages/shared/src/locales.ts`](packages/shared/src/locales.ts) has a status:

| Status     | Meaning                                          | Offered to visitors?  | Chosen automatically? |
| ---------- | ------------------------------------------------ | --------------------- | --------------------- |
| `source`   | English, the original text                       | Yes                   | Yes                   |
| `reviewed` | Translated and checked by a native speaker       | Yes                   | Yes                   |
| `draft`    | Translated, **not** reviewed by a native speaker | Yes (selector, links) | **No**                |
| `planned`  | No dictionary yet                                | No                    | No                    |

A language is marked `reviewed` only after a real native-speaker review.

| Language                      | Address           | Status                                  |
| ----------------------------- | ----------------- | --------------------------------------- |
| English                       | `/en/`            | source                                  |
| Spanish (Latin America)       | `/es/`            | draft (formal "usted")                  |
| French                        | `/fr/`            | draft (formal "vous")                   |
| German                        | `/de/`            | draft (formal "Sie")                    |
| Portuguese (Brazil)           | `/pt-BR/`         | draft ("você")                          |
| Chinese (Simplified)          | `/zh-CN/`         | draft (polite "您")                     |
| Arabic (right-to-left)        | `/ar/`            | draft (Modern Standard Arabic)          |
| Japanese                      | `/ja/`            | draft (polite です/ます)                |
| Chinese (Traditional), Hebrew | `/zh-TW/`, `/he/` | planned (prepared, no dictionaries yet) |

**The seven draft translations were written without a native-speaker review.** Visitors only see them by choosing the language (or following a `/xx/` link); a browser set to Spanish, for example, still starts in English. Before marking a language `reviewed`, have a fluent speaker read every file in `apps/web/src/locales/<code>/` against English, ideally on the live pages. Things worth their attention: shipping terminology (e.g. "line haul", customs terms), tone, and the Arabic plural forms.

### What is translated, and what isn't

**Translated** (dictionaries in `apps/web/src/locales/<language>/`): every piece of customer-facing interface text: navigation, homepage, tracking form, results, history and every tracking state, shipment status names and descriptions, shipping methods, journey stages, the support page and form, its validation and error messages, the "page not found" page, page titles, and screen-reader labels.

- **Statuses, methods and topics are translated by their CODE.** The database values (`IN_TRANSIT`, `AIR`…) and all business logic are unchanged; the admin dashboard and API keep the English names.
- **Event descriptions:** when staff kept the standard description for a status (the admin form fills it in), visitors see it in their language. A note staff typed themselves is shown exactly as written.
- **Messages from the API** are translated on the website by error code and field name; the API itself is unchanged.
- **Dates, times, numbers and country names** are formatted for the page's language (e.g. "1 déc. 2026", "2026年12月1日", "Frankreich"). Event times stay in the visitor's own time zone; delivery dates are never shifted.

**Not translated, on purpose:** tracking numbers, support references and service codes; the brand name; company contact details (business data, replaced with real ones before launch); city and place names and notes written by staff. These are marked `translate="no"` (so browser auto-translate tools leave them alone too) or `data-shipment-data`.

### Right-to-left languages (Arabic, later Hebrew)

Pages in a right-to-left language set `<html dir="rtl">` and the whole layout mirrors: the logo and navigation start on the right, the journey bar runs right to left, timeline markers and accent borders sit on the right, and arrows point the reading direction.

- **Layout uses "logical" Tailwind classes** (`ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`, `border-s`, `text-start`…), which follow the reading direction. A unit test fails if a left/right-only class (`ml-`, `pl-`, `left-`, `border-l`…) appears in customer-facing code; a deliberate exception needs an `rtl-ok` comment explaining why.
- **Tracking numbers and support references always read left-to-right**, including inside Arabic sentences and in the tracking-number field.
- **Places and notes written by staff, and company details,** are isolated (`dir="auto"`) so mixed Arabic/Latin text shows in the right order.
- **Arabic text has no letter-spacing** (it would break the joined script).

### Fonts for other writing systems

The brand font (Archivo, self-hosted) covers Latin letters only. For Arabic, Hebrew, Chinese and Japanese the page language selects fonts **already installed on the visitor's device** (Segoe UI / Geeza Pro / Noto Sans Arabic; Microsoft YaHei / PingFang SC / Noto Sans SC; Yu Gothic / Hiragino / Noto Sans JP…), so nothing extra is downloaded and no font service is used. Chinese and Japanese have separate lists because the same character is drawn differently in each. Latin letters and digits inside those pages keep Archivo.

### How it's built

- [i18next](https://www.i18next.com) + react-i18next (MIT-licensed, free). Text lives in dictionaries, `apps/web/src/locales/<language>/<area>.json`; components never contain translated text.
- English is built in (it's the fallback: anything not yet translated shows in English, never as a raw key). Every other language is a separate small download, fetched only when a visitor opens it. No translation service is called at runtime.
- `npm run typecheck` fails on a misspelled or missing text key. `npm test` fails if a translation is missing a key or has an extra one, lacks a plural form its grammar needs (Arabic has six), or breaks a `{{placeholder}}` or `<tag>`; and if the English status, method or topic text ever drifts from the shared definitions the admin and API use. A browser test opens every customer page and state in the pseudo-language and fails on any interface text that is still plain English. Another test fails if a translation is left identical to English (a short list of genuinely identical words, like French "Services", is allowed). Browser tests open every launch language on desktop, tablet and mobile and check the page language and direction, sideways scrolling, translated text, localized dates and the font used.

**Adding a language:** add its entry to `packages/shared/src/locales.ts`, copy `apps/web/src/locales/en/` to `apps/web/src/locales/<code>/`, translate the text, and change its status from `planned` to `draft` (then `reviewed` after a native-speaker review).

**Testing before translations exist (development only):** two pseudo-languages, `/en-XA/` (accented, ~35% longer text, to spot untranslated or clipped text) and `/ar-XB/` (the same, right-to-left). They never appear in the production build.

### Progress

- [x] **Milestone 1:** foundation: language addresses, redirects, detection, selector, memory, page language and direction
- [x] **Milestone 2:** all customer-facing text in dictionaries; dates, numbers and country names per language
- [x] **Milestone 3:** right-to-left layout for Arabic
- [x] **Milestone 4:** draft translations for the seven other launch languages, fonts for Arabic/Chinese/Japanese, layout checked in every language

## Security review (Stage 8)

An audit of the whole application (code, every admin route, dependencies, secrets, the built website, and the running app probed from outside) found **no critical or high-severity vulnerabilities**. Four medium/low issues were fixed, each with regression tests:

| Issue                                                                                                                                                   | Severity | Fix                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Website pages sent no security headers: admin pages could be shown inside another site's frame (clickjacking), and there was no Content-Security-Policy | Medium   | [`apps/web/security-headers.ts`](apps/web/security-headers.ts): frame blocking, `nosniff`, referrer and permissions policies everywhere; a strict CSP (only the site's own scripts, styles, fonts and images) for the production build |
| The development API listened on every network interface, so other devices on the same Wi-Fi could reach it                                              | Medium   | Listens on `127.0.0.1` outside production (`HOST` setting)                                                                                                                                                                             |
| A forgotten `NODE_ENV=production` at deployment would silently drop the Secure/`__Host-` cookie                                                         | Medium   | The API refuses to start with a non-localhost `WEB_ORIGIN` outside production, or without `https://` in production                                                                                                                     |
| Sign-in timing could reveal which staff emails exist (a wrong password made one more database round trip than an unknown email)                         | Low      | Every failed sign-in now makes the same database calls                                                                                                                                                                                 |

**Checked and found sound:** no known vulnerable dependencies (`npm audit`); no secrets in the code or the built website; no raw SQL; no HTML injection points; every admin endpoint refuses visitors without a session (401) and Operators where it's administrator-only (403); cross-site requests, form-style login posts, malformed, oversized and wrongly typed input, path traversal and injection-style values are all rejected without revealing internals; spoofed IP headers don't bypass rate limits.

**Accepted risks (documented, not fixed):**

- Anyone who knows a staff email can trigger that account's 15-minute sign-in pause by entering wrong passwords. This is the standard trade-off of account lockout; the per-IP limits slow it down. Revisit if it's ever abused.
- Rate-limit counters live in the server's memory (fine for one server; Stage 9 if there are several).
- `trust proxy` is set to one proxy hop in production: correct behind a single load balancer, which Stage 9 must confirm for the chosen host.
- **No two-factor sign-in for staff (deferred by decision).** A stolen or guessed staff password is enough to sign in. This is limited by Argon2id password hashing, sign-in rate limits and account pauses, short sessions, administrator/operator permissions and the audit log. Authenticator-app two-factor sign-in is not currently approved for implementation; revisit before granting more people admin access, or if any staff password is suspected compromised.

**Production build test.** `npm run test:e2e:preview -w @reduium/web` builds the site, serves it with the production headers, and fails if the browser blocks anything under the strict policy (desktop and mobile). The production host (Stage 9) must send the same headers as `productionSecurityHeaders()`.

## Before launch: placeholder checklist

All business details live in `apps/web/src/config/company.ts`. Each one shows a visible **PLACEHOLDER** marker on the site until it's replaced:

- [x] Support email: `info@reduiumshipment.com`
- [x] Support phone number: +44 113 320 7332
- [x] Headquarters address: 115 Crown Street, London, United Kingdom
- [ ] Support hours
- [ ] Registered legal entity name
- [ ] Company registration number

Also confirm before launch:

- [ ] The four services listed in `packages/shared/src/shipping-methods.ts` match what Reduium actually offers
- [ ] Privacy policy and terms pages (needed before collecting support requests from the public)
- [ ] How long support messages are kept (retention), and who deletes them
- [ ] **Licences for the three hero photographs** (see below). Not yet verified.
- [ ] Use a strong, unique password for every staff account (there is no two-factor sign-in: deferred, not approved for implementation; see "Staff sign-in and admin security")

## Hero photographs

The homepage hero rotates three photographs supplied by the owner (2026-11-22):

| #   | Subject                    | Original link                                                                                      | Files in `apps/web/src/assets/hero/`                                         |
| --- | -------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | Container port at dusk     | https://www.image2url.com/r2/default/images/1795400523064-fdd625d8-7f92-4715-8885-4d29e6154766.jpg | `port-terminal-{768,1280,1920}.webp`, plus `fallback-port-terminal-1280.jpg` |
| 2   | Warehouse aisle with staff | https://www.image2url.com/r2/default/images/1795400483114-e1007ef6-7cde-4495-9878-f9179883a6de.jpg | `warehouse-aisle-{768,1280,1920}.webp`                                       |
| 3   | Fulfilment floor           | https://www.image2url.com/r2/default/images/1795400538298-2d1bef45-13d9-4b2f-9b51-e89121435773.jpg | `fulfilment-floor-{768,1280,1920}.webp`                                      |

The photos are served from this site, not hot-linked. They were resized and re-encoded as WebP, with metadata stripped. Nothing else was changed.

**Licence status: unverified.** image2url.com is an anonymous image host, so it doesn't record who took a photo or under what licence. Before launch, find each photo's original source and confirm that commercial use is allowed. Also check:

- **Photo 1** shows other shipping companies' names on containers (Maersk, Evergreen, Hapag-Lloyd). The overlay makes them hard to read, but they're still third-party trademarks.
- **Photo 2** shows recognisable people (motion-blurred). Commercial use normally needs a model release, which most stock licences include.

## Build progress

- [x] **Stage 1:** Project setup and design system
- [x] **Stage 2:** Homepage and responsive navigation
- [x] **Stage 3:** Backend and database
- [x] **Stage 4:** Package tracking
- [x] **Stage 5:** Admin authentication
- [x] **Stage 6:** Shipment creation and management
- [x] **Stage 7:** Customer support
- [x] **Stage 8:** Security testing and bug fixing
- [ ] Stage 9: Deployment preparation
