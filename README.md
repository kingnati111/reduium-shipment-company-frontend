# Reduium Shipment Company: Frontend

Customer website, package tracking pages and admin dashboard: React 19, Vite and Tailwind CSS 4.

> **Status:** Stage 8 of 9 (security testing and bug fixing). See [Build progress](#build-progress).

## Repositories

| Repository                          | Contents                                                        |
| ----------------------------------- | --------------------------------------------------------------- |
| `reduium-shipment-company-frontend` | Customer website, tracking pages and admin dashboard (React)    |
| `reduium-shipment-company-backend`  | API, staff authentication, database schema, migrations, scripts |

The website never connects to the database directly. It calls the API at `/api/…`; in development, the website's dev server forwards those calls to the API on `127.0.0.1:4000`.

## Project layout

```
Frontend/   React app: pages, components, translations, unit and browser tests
Shared/     Statuses, tracking-number rules, validation, permissions and languages (also in the Backend repository)
docs/       Deployment plan and launch checklist
scripts/    shared-hash.mjs (see "Shared code")
```

Both folders are npm workspaces (`@reduium/web`, `@reduium/shared`).

## Shared code

`Shared/` (statuses, tracking-number rules, validation schemas, permissions and the list of languages) is used by both the website and the API, so an **identical copy** lives in both repositories.

- Change it in one repository, then make exactly the same change in the Backend repository.
- `npm run shared:hash` prints a fingerprint of `Shared/`. The two repositories must print the same value.

## Requirements

- Node.js 24 LTS or newer
- For a working site locally and for the full browser tests: the Backend repository, with its `Backend/.env` set up (see its README). Keep it next to this repository in a folder named `reduium-backend`, or set `REDUIUM_BACKEND_DIR` to its folder.

## First-time setup

```bash
npm install
```

## Everyday commands

| Command                    | What it does                                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `npm run dev`              | Starts the website on port 5173. Start the API first (`npm run dev` in the Backend repository) so `/api` works |
| `npm run typecheck`        | TypeScript checks                                                                                              |
| `npm run lint`             | Code-quality checks                                                                                            |
| `npm test`                 | Website and shared-logic unit tests                                                                            |
| `npm run test:e2e`         | Browser tests (desktop, tablet and mobile). Starts the API from the Backend repository                         |
| `npm run test:e2e:preview` | Builds the site and tests it under the production security headers                                             |
| `npm run build`            | Production build of the website (`Frontend/dist`)                                                              |
| `npm run check`            | Type-check, lint, test and build in one go                                                                     |
| `npm run shared:hash`      | Fingerprint of `Shared/` (must match the Backend repository)                                                   |

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

**Try it locally** with the sample shipments from `npm run db:seed -w @reduium/api` (in the Backend repository). The seed prints their tracking numbers; in the current dev database they are:

- `RDM-46EH-YBRW-8` (delivered)
- `RDM-VGYD-H7Q5-V` (at customs)
- `RDM-PFBP-R2CQ-B` (delayed)

## Admin dashboard

Sign in at `/admin/login`.

### Shipment screens

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

### Support screens

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

### Roles

Administrators and Operators see different parts of the dashboard. The permission map is in [`Shared/src/permissions.ts`](Shared/src/permissions.ts). **The API enforces it on every request;** the website uses the same map only to decide what to show.

## Customer support form

A contact form: name, email, optional phone, optional tracking number, topic, subject and message.

- Missing or invalid fields are explained next to the field, and focus moves to the first problem.
- After sending, the customer sees a reference such as `SUP-7K3M-QX9P` to quote later. **No confirmation email is sent**, and the page says so.
- The tracking number is checked for format only. The answer is the same whether or not the shipment exists, so the form can't be used to discover real tracking numbers.
- Spam protection: a hidden "spam trap" field (a filled-in one is refused with an honest error, never a fake success), and per-IP limits: 30 attempts per 15 minutes, and 5 accepted messages per hour and 20 per day (typing mistakes don't count).

## Browser-test account

The browser tests sign in for real with one dedicated account, `e2e-browser-tests@example.invalid`. It's an Operator, the least-privileged role.

- Each test run gives it a new random password that exists only in that run's memory.
- After the run, it's **disabled** and its sessions are deleted.
- Each switch on or off is audit-logged.
- Support requests sent by the browser tests use `e2e.support.<anything>@example.invalid`. They are deleted (and audit-logged by reference only) when the account is switched on and off. Nothing else is touched.
- `E2E_NO_DB=1` runs the browser tests without the test account, so nothing is written to the database: the real sign-in tests are skipped (public tracking tests still read the sample shipments).

The account is switched on and off by `Backend/scripts/e2e-account.ts` in the Backend repository.

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

Each language in [`Shared/src/locales.ts`](Shared/src/locales.ts) has a status:

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

**The seven draft translations were written without a native-speaker review.** Visitors only see them by choosing the language (or following a `/xx/` link); a browser set to Spanish, for example, still starts in English. Before marking a language `reviewed`, have a fluent speaker read every file in `Frontend/src/locales/<code>/` against English, ideally on the live pages. Things worth their attention: shipping terminology (e.g. "line haul", customs terms), tone, and the Arabic plural forms.

### What is translated, and what isn't

**Translated** (dictionaries in `Frontend/src/locales/<language>/`): every piece of customer-facing interface text: navigation, homepage, tracking form, results, history and every tracking state, shipment status names and descriptions, shipping methods, journey stages, the support page and form, its validation and error messages, the "page not found" page, page titles, and screen-reader labels.

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

- [i18next](https://www.i18next.com) + react-i18next (MIT-licensed, free). Text lives in dictionaries, `Frontend/src/locales/<language>/<area>.json`; components never contain translated text.
- English is built in (it's the fallback: anything not yet translated shows in English, never as a raw key). Every other language is a separate small download, fetched only when a visitor opens it. No translation service is called at runtime.
- `npm run typecheck` fails on a misspelled or missing text key. `npm test` fails if a translation is missing a key or has an extra one, lacks a plural form its grammar needs (Arabic has six), or breaks a `{{placeholder}}` or `<tag>`; and if the English status, method or topic text ever drifts from the shared definitions the admin and API use. A browser test opens every customer page and state in the pseudo-language and fails on any interface text that is still plain English. Another test fails if a translation is left identical to English (a short list of genuinely identical words, like French "Services", is allowed). Browser tests open every launch language on desktop, tablet and mobile and check the page language and direction, sideways scrolling, translated text, localized dates and the font used.

**Adding a language:** add its entry to `Shared/src/locales.ts`, copy `Frontend/src/locales/en/` to `Frontend/src/locales/<code>/`, translate the text, and change its status from `planned` to `draft` (then `reviewed` after a native-speaker review).

**Testing before translations exist (development only):** two pseudo-languages, `/en-XA/` (accented, ~35% longer text, to spot untranslated or clipped text) and `/ar-XB/` (the same, right-to-left). They never appear in the production build.

### Progress

- [x] **Milestone 1:** foundation: language addresses, redirects, detection, selector, memory, page language and direction
- [x] **Milestone 2:** all customer-facing text in dictionaries; dates, numbers and country names per language
- [x] **Milestone 3:** right-to-left layout for Arabic
- [x] **Milestone 4:** draft translations for the seven other launch languages, fonts for Arabic/Chinese/Japanese, layout checked in every language

## Security headers

Website pages send security headers, defined in [`Frontend/security-headers.ts`](Frontend/security-headers.ts): frame blocking (against clickjacking), `nosniff`, and referrer and permissions policies everywhere, plus a strict Content-Security-Policy (only the site's own scripts, styles, fonts and images) for the production build. The API sets its own headers; see the Backend repository.

**Production build test.** `npm run test:e2e:preview` builds the site, serves it with the production headers, and fails if the browser blocks anything under the strict policy (desktop and mobile). The production host (Stage 9) must send the same headers as `productionSecurityHeaders()`.

## Before launch: placeholder checklist

All business details live in `Frontend/src/config/company.ts`. Each one shows a visible **PLACEHOLDER** marker on the site until it's replaced:

- [x] Support email: `info@reduiumshipment.com`
- [x] Support phone number: +44 113 320 7332
- [x] Headquarters address: 115 Crown Street, London, United Kingdom
- [x] Support hours: 24 hours a day, 7 days a week (shown in each visitor's language)
- [x] Registered legal entity name: Reduium Shipment Ltd
- [ ] Company registration number (not shown on the site until it's added in `company.ts`)

Also confirm before launch:

- [ ] The four services listed in `Shared/src/shipping-methods.ts` match what Reduium actually offers
- [ ] Privacy policy and terms pages (needed before collecting support requests from the public)
- [ ] How long support messages are kept (retention), and who deletes them
- [ ] **Licences for the three hero photographs** (see below). Not yet verified.
- [ ] Use a strong, unique password for every staff account (there is no two-factor sign-in: deferred, not approved for implementation; see "Staff sign-in and admin security")

## Hero photographs

The homepage hero rotates three photographs supplied by the owner (2026-11-22):

| #   | Subject                    | Original link                                                                                      | Files in `Frontend/src/assets/hero/`                                         |
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
