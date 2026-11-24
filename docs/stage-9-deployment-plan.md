# Stage 9: Deployment plan (for review, NOT approved to execute)

**Status:** planning only. Nothing in this document has been bought, created, configured or published. Every step in "Order of work" needs your separate approval.

**Prepared:** 23 November 2026 · **Domain:** reduiumshipment.com (registered by you, DNS untouched)

---

## 1. Summary and recommendation

| Decision          | Recommendation                                                                                       | Approx. monthly cost |
| ----------------- | ---------------------------------------------------------------------------------------------------- | -------------------- |
| Hosting           | **Render**, one always-on "Starter" web service in **Frankfurt (EU)**, serving both website and API  | ~$7                  |
| Database          | **New, separate Neon project** for production, region **London (AWS eu-west-2)**, "Launch" plan      | ~$5–15 (usage-based) |
| Off-site backups  | Daily encrypted database export to object storage (e.g. Cloudflare R2 or Backblaze B2)               | ~$0–1 at this size   |
| DNS / HTTPS       | DNS at your registrar (or free Cloudflare DNS); free automatic HTTPS certificates from the host      | $0                   |
| Uptime monitoring | Free plan of an uptime checker (e.g. UptimeRobot / Better Stack)                                     | $0                   |
| Email inbox       | For info@reduiumshipment.com: forward to an existing inbox (free) or a business mailbox (~$1–7/user) | $0–7                 |
| **Total**         |                                                                                                      | **≈ $12–30 / month** |

Plus the domain renewal (~$10–20/year), which you already pay.

**All prices are estimates** gathered from current third-party pricing trackers (November 2026), not quotes. Several providers changed prices during 2026. Confirm on each provider's own pricing page before approving.

---

## 2. What gets deployed

```
Visitor's browser (anywhere in the world)
        │  https://reduiumshipment.com
        ▼
Host's HTTPS edge (certificate, HTTP→HTTPS redirect)
        ▼
ONE Node.js service
   ├─ /en/…, /ar/…, /admin…  → the built website files (+ security headers)
   └─ /api/…                 → the Express API
        ▼  encrypted connection (sslmode=verify-full, already enforced)
Neon PostgreSQL: production project (London), separate from development
```

**Why one service at one address:** staff sign-in uses a `__Host-` cookie with `SameSite=Strict` and an Origin check. These are strongest when the website and API share exactly one address, and the code already assumes it (`trust proxy` = 1 hop). It is also the simplest and cheapest setup.

**Why always-on (paid), not a free tier:** free services "sleep" and take 30–60 s to wake, and give no reliability guarantee. The rate limits live in the server's memory, so the app must run as **exactly one instance** (scaling to several instances later needs a shared rate-limit store; noted in the Stage 8 report).

### Small code changes Stage 9 needs (made locally, fully tested, shown to you before deploying)

1. **API serves the built website in production**, with the existing `productionSecurityHeaders()` and "unknown page → index.html" so links like `/ja/track/RDM-…` work.
2. **Add HSTS to website pages** (tells browsers to always use HTTPS). The API already sends it; website pages don't yet. Start with a short duration, raise to one year after launch is stable.
3. **Production start and health check** for the host (`/api/health` already exists).
4. **Optional, recommended: a least-privilege database user** for the running app (can read/write data but cannot change or drop tables). Migrations use a separate owner login.
5. **Guards** so development-only tools refuse production: the sample-data seed already refuses; the browser-test account script will be made to refuse as well.

No business logic, status codes, customer data handling or security controls change.

---

## 3. Hosting options and recurring costs

|                    | **A. Render (recommended)**                           | B. Fly.io                                   | C. Railway                                                                           |
| ------------------ | ----------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------ |
| App hosting        | Starter: **~$7/mo** (0.5 CPU, 512 MB)                 | shared-cpu-1x 512 MB: **~$4–5/mo** (London) | Hobby **$5/mo** incl. $5 usage; a small always-on app ≈ $5–10; Pro (business) $20/mo |
| UK/EU region       | Frankfurt                                             | **London**                                  | Amsterdam (EU West)                                                                  |
| How you deploy     | Connect a **private** GitHub repo, or deploy manually | Command-line tool + Dockerfile              | Connect GitHub repo                                                                  |
| HTTPS certificates | Automatic, free                                       | Automatic, free                             | Automatic, free                                                                      |
| Effort for you     | **Lowest**: web dashboard, clear logs                 | Higher: command-line driven                 | Low                                                                                  |
| Notes              | Mature, predictable fixed price                       | Cheapest, closest to UK; more hands-on      | Usage-based bill varies; reported 2026 price rises unconfirmed                       |

Database for any option: **Neon Launch**, usage-based (compute ~$0.106 per CU-hour, storage ~$0.35 per GB-month; a small, mostly idle app like this is typically ~$5–15/mo). Point-in-time restore: up to 7 days of history on Launch, billed ~$0.20 per GB-month (pennies at this size). Sources conflict on whether a $5 monthly minimum still applies: confirm on neon.tech.

**Not suitable:** shared "cPanel/PHP" web hosting (can't run Node.js), free tiers (sleep, no guarantees), and "serverless functions" platforms (the in-memory rate limits wouldn't work).

Price sources (third-party, verify before buying): [Render](https://makerkit.dev/pricing-calculator/render), [Render total-cost note](https://www.budgetforge.dev/tools/render-pricing-2026), [Fly.io official](https://docs.fly.io/about/pricing), [Fly.io Oct-2026 regional prices](https://dev.to/pavel-hostim/flyio-pricing-2026-what-changed-on-1-october-and-what-it-costs-in-europe-1pjl), [Railway official](https://railway.com/pricing.md), [Railway 2026 increase report](https://www.getpricepulse.com/blog/railway-price-increase-2026.html), [Neon](https://www.jetadmin.io/blog/neon-pricing/), [Neon restore pricing](https://datastorage.com/cloud_providers/neon/).

---

## 4. Production database: setup and separation from development

- **A brand-new Neon project** (e.g. `reduium-shipment-production`), not a branch of the development project. Separate project = separate passwords, separate billing limits, and no way for a development command to reach it by mistake. Region: **London**, near the company and the app.
- **Your development database stays exactly as it is** (your shipments, the sample data and the test account). Nothing is copied to production.
- **Production starts empty.** The schema is created by applying the two committed migrations (`prisma migrate deploy`). **No sample data**: the seed script refuses to run in production.
- **Credentials live only in the host's encrypted "environment variables" settings.** Never in the code, in GitHub, in chat, or in your local `.env` (which stays pointed at development).
- **Encrypted connections only** (`sslmode=verify-full`): already enforced by the app and migrations.
- The automated tests run only against development (they create their own temporary schema); production is never used for testing data.

---

## 5. Domain and DNS (reduiumshipment.com)

You make these changes yourself at your registrar when the time comes; I'll give exact values from the chosen host. **Do not change anything yet.**

| Record                                       | Name                     | Points to                                                 | Purpose                                                            |
| -------------------------------------------- | ------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------ |
| A / ALIAS (or CNAME-flattening)              | `reduiumshipment.com`    | value from host                                           | The website                                                        |
| CNAME                                        | `www`                    | value from host                                           | `www` → redirects to the main address                              |
| CAA                                          | `reduiumshipment.com`    | the host's certificate authority (e.g. `letsencrypt.org`) | Only that authority may issue certificates for your domain         |
| MX, TXT (SPF), TXT/CNAME (DKIM), TXT (DMARC) | from your email provider |                                                           | So info@ receives mail and your mail isn't treated as spam/spoofed |

Also at the registrar: **registrar lock** (prevents transfer), **auto-renew**, **WHOIS privacy**, and **two-step sign-in on your registrar account**. Lower the records' TTL to 5 minutes the day before the switch so changes take effect quickly. Optional: move DNS to Cloudflare's free plan (DNS only, no proxy at first).

---

## 6. HTTPS and security configuration

- **HTTPS everywhere:** certificate issued and renewed automatically by the host; HTTP redirects to HTTPS; HSTS on all pages (see §2).
- **Production settings** (in the host dashboard, never in files): `NODE_ENV=production`, `WEB_ORIGIN=https://reduiumshipment.com`, `DATABASE_URL`, `DIRECT_URL` (migrations only). The API **refuses to start** if `WEB_ORIGIN` isn't `https://` in production (Stage 8).
- **Kept exactly as today:** Argon2id passwords, `__Host-` `Secure` `HttpOnly` `SameSite=Strict` session cookie, 12 h / 2 h-idle sessions, CSRF token + Origin check, sign-in rate limits and account pauses, tracking and support rate limits, admin/operator permissions, audit log, strict Content-Security-Policy, no default admin.
- **Proxy count check:** `trust proxy` = 1 must match the host's setup so rate limits see the real visitor IP. Verified on the live service before launch (§9). If a CDN/proxy such as Cloudflare is added later, this changes to 2 and is re-tested.
- **Code repository:** if deploying from GitHub, the repository must be **private**. (Pushing to GitHub needs your separate approval; the commit author should be corrected first.)
- **Two-factor sign-in for staff:** deferred by your decision; strong unique passwords required instead (see README).

---

## 7. Production administrator account

- Created **once, by you**, with the existing `admin:create` tool, run from your laptop against the production database. It asks for your name, email and password interactively; the password is never written to a file, log or chat, only its Argon2id hash is stored.
- **No default administrator, no built-in password.**
- The browser-test account and its tooling **never exist in production**.
- Further staff (Operators) are then added from the admin dashboard by you.
- Before launch: confirm who should have Admin vs Operator access, and that each person uses a strong, unique password.

---

## 8. Backup and recovery

| Layer                                                                   | What it protects against                                   | Retention                                 |
| ----------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| Neon point-in-time restore                                              | Mistakes or bad changes: rewind the database to any moment | 7 days (Launch)                           |
| **Daily encrypted export** (`pg_dump`) to separate storage outside Neon | Losing the Neon project or account                         | 30 days (adjust to your retention policy) |
| Git history + private GitHub copy (when approved)                       | Losing the code or the laptop                              | Permanent                                 |
| Host settings record (names of variables, never values)                 | Rebuilding the service from scratch                        | Kept in docs                              |

- **Backups contain personal data** (customer names, addresses, support messages): encrypted, access limited to you, kept no longer than your retention policy says.
- **Restore drill before launch:** restore a backup into a throwaway database and confirm it's complete. Repeat every 3 months.
- **Written runbook** (prepared in Stage 9): site down; data damaged (point-in-time restore); credentials leaked (rotate the database password, which signs nobody out, then sign out all staff sessions); laptop lost.

---

## 9. Final production security testing (before the site is announced)

Run against the live address, with the site deployed but not yet announced (and asking search engines not to index it until launch):

- HTTPS: certificate valid, HTTP→HTTPS and `www`→main redirects, HSTS present; external TLS grade check (aim for A).
- Security headers and CSP on every page type; the production CSP browser test re-run against the live site.
- Cookie flags on sign-in (`__Host-`, `Secure`, `HttpOnly`, `SameSite=Strict`).
- Admin: every admin endpoint refuses visitors (401) and Operators where admin-only (403); sign-in rate limit and account pause work using the **real visitor IP** (proxy count check).
- CSRF/Origin rejection; tracking and support rate limits; error pages reveal nothing internal.
- No secrets or source maps with secrets in the published files; `npm audit` clean.
- Production database: correct schema, **no sample/test data**, no test account; app user has only the permissions it needs.
- Restore drill completed; uptime monitor alerting you.
- Every language loads; Arabic right-to-left; drafts still not auto-selected.

Results reported to you before any public announcement.

---

## 10. Global access and authorized administrator access

- **Worldwide visitors:** the site is reachable from anywhere, with no geo-blocking. The app and database run in Europe (close to the UK company). The website is small and cached by browsers; a free CDN layer (e.g. Cloudflare proxy) can be added later if visitors far away find it slow (requires the proxy-count change and re-test).
- **Languages:** every page at `/en/`, `/es/` … `/ja/`; English stays the automatic default; the seven translations stay **drafts** until native-speaker review.
- **Uptime monitoring** emails you if the site or `/api/health` stops responding.
- **Admin access:** `/admin` on the same domain, open to sign-in from anywhere but protected by password + session security + rate limits + role permissions + audit log. Optional extra layer for later (no code change, free for small teams): put `/admin` behind an identity check such as Cloudflare Access so only approved email addresses even reach the sign-in page. Not part of this plan unless you approve it.

---

## 11. Order of work: each gate needs your separate approval

| Gate | What happens                                                                                | Who                  | Costs money? |
| ---- | ------------------------------------------------------------------------------------------- | -------------------- | ------------ |
| G1   | Choose host, region and email option; approve the monthly budget                            | You                  | No           |
| G2   | Code changes from §2 made locally, tested, committed; shown to you                          | Me                   | No           |
| G3   | Create accounts (host, Neon production project, backup storage); add payment method         | You (I guide)        | **Yes**      |
| G4   | Create production database and apply migrations (no data)                                   | Me, with you present | Usage        |
| G5   | Deploy the service (temporary host address first)                                           | Me / you             | **Yes**      |
| G6   | DNS changes at the registrar                                                                | You                  | No           |
| G7   | Production security testing (§9) and restore drill; report                                  | Me                   | No           |
| G8   | Create the first administrator                                                              | You                  | No           |
| G9   | **Public launch** (allow search engines, announce) after the business checklist is complete | You                  | No           |

---

## 12. Decisions needed from you

1. Host: **Render (recommended)**, Fly.io, or Railway?
2. OK with **Frankfurt (app) + London (database)**, or prefer everything in London (Fly.io)?
3. Deploy from a **private GitHub repository** (simplest updates) or manual uploads? If GitHub: which author name/email should commits show?
4. Email for info@: forwarding to an existing inbox, or a business mailbox provider?
5. Backup storage provider (Cloudflare R2 or Backblaze B2; both have free allowances that cover this size).
6. Keep the site hidden from search engines until the business checklist is done? (Recommended: yes.)

## 13. Limits and risks to be aware of

- Single instance: a host outage or restart means brief downtime (typically seconds to minutes). Acceptable at launch; revisit if traffic grows.
- Usage-based database billing can vary; set a spending alert/limit in Neon.
- Prices above are estimates and may change.
- Draft translations are public once launched (visitors can choose them), but are never selected automatically.
- Staff accounts are protected by password only (two-factor deferred).
