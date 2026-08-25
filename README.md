# مؤسسه حقوقی و داوری دادآور — Dādāvar Legal & Arbitration Institute

A production-grade, fully Persian (fa-IR) **right-to-left** website and admin panel for an
Iranian legal and arbitration institution.

Every visible string, label, date, number, validation message and error state is Persian.
Only the codebase — identifiers, types, comments and this document — is English.

---

## Stack

| Concern        | Choice                                                        |
| -------------- | ------------------------------------------------------------- |
| Framework      | Next.js 16 (App Router, React 19, Server Actions, Turbopack)   |
| Language       | TypeScript (strict)                                            |
| Styling        | Tailwind CSS v4 (CSS-first `@theme` tokens)                    |
| Typography     | Vazirmatn Variable, self-hosted via `next/font/local`          |
| Validation     | Zod 4 — one schema per form, run on client **and** server      |
| Auth           | HS256 JWT session cookie (`jose`) + scrypt password hashing    |
| SMS            | sms.ir — OTP verification, client and office notifications     |
| Persistence    | MariaDB via `mysql2` — snapshot reads, per-row writes          |
| Charts / icons | Hand-built SVG — no charting or icon dependency                |

Runtime dependencies: `next`, `react`, `react-dom`, `zod`, `jose`, `mysql2`,
`server-only`, `@fontsource-variable/vazirmatn`. Nothing else.

---

## Getting started

```bash
npm install
cp .env.example .env.local   # then edit the secrets
npm run dev
```

Open <http://localhost:3000>.

### Environment

`AUTH_SECRET` is **required in production** — the app refuses to boot with a missing or
short secret rather than falling back to an insecure key.

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

| Variable                  | Purpose                                              | Default          |
| ------------------------- | ---------------------------------------------------- | ---------------- |
| `DATABASE_URL`            | MariaDB connection (`mysql://user:pass@host:3306/db`) | — (required)     |
| `AUTH_SECRET`             | Session + CSRF signing key (min 32 chars)             | — (required)     |
| `NEXT_PUBLIC_SITE_URL`    | Canonical origin for SEO, sitemap, Open Graph         | built-in default |
| `SESSION_MAX_AGE_SECONDS` | Session lifetime                                      | `28800` (8h)     |
| `TRUST_PROXY_HOPS`        | Reverse proxies in front, for real-IP rate limiting   | `1`              |
| `SEED_ADMIN_EMAIL`        | First administrator, first boot only                  | `admin@dadavar-law.ir` |
| `SEED_ADMIN_PASSWORD`     | First administrator password — **required in prod**   | — (no fallback)  |
| `SEED_DEMO_DATA`          | Also seed sample enquiries for evaluation             | `false`          |
| `UPLOAD_DIR`              | Case attachments (**absolute, outside the deploy**)   | `.uploads`       |
| `MEDIA_DIR`               | Media library files (**absolute, outside the deploy**)| `.data/media`    |
| `SMSIR_API_KEY`           | sms.ir API key — SMS is inert without it              | —                |
| `SMSIR_LINE_NUMBER`       | Sending line for notifications                        | —                |
| `SMSIR_OTP_TEMPLATE_ID`   | Registered sms.ir verification template               | —                |

`NEXT_PUBLIC_SITE_URL` is **inlined at build time**. It must be set when `npm run build`
runs, not only when the server starts — otherwise every canonical URL, sitemap entry and
Open Graph image falls back to the built-in default.

See `.env.example` for the complete list, including the CSP escape hatches.

### Admin panel

`/admin` — **one** account is created the first time the database is initialised, from
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. There is no fallback password in production:
the app refuses to initialise without one. Create the rest of the staff accounts from
*Users* in the panel so each has its own password.

Access is capability-based rather than a rank ladder — see `src/lib/auth/permissions.ts`:

- `admin` — everything, including settings, custom code, users and SMS
- `editor` — content and media; never sees case operations
- `manager` — enquiries, appointments and messages; never sees settings

### Scripts

```bash
npm run dev        # development server
npm run build      # production build
npm run start      # serve the production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

---

## Routes

### Public

| Route                  | Page                                                        |
| ---------------------- | ----------------------------------------------------------- |
| `/`                    | Home — hero, credibility, about, services, arbitration, team, articles, FAQ |
| `/about`               | About the institution — mission, principles, history, team    |
| `/services`            | Service catalogue grouped by category                         |
| `/services/[slug]`     | Individual service — body, process, highlights, related FAQ   |
| `/arbitration`         | Arbitration hub — six modalities, 7-step process, comparison, legal basis |
| `/arbitrators`         | Arbitrator / legal-team directory                             |
| `/arbitrators/[slug]`  | Individual profile — biography, education, background         |
| `/articles`            | Knowledge centre — category filter, search, pagination        |
| `/articles/[slug]`     | Article — editorial typography + table of contents            |
| `/faq`                 | FAQ grouped by topic with jump navigation                     |
| `/contact`             | Contact details, hours, map, contact form                     |
| `/consultation`        | Consultation / arbitration request + document upload          |
| `/appointment`         | 7-step appointment booking wizard                             |
| `/tracking`            | Request & booking status lookup                               |
| `/privacy`, `/terms`   | Legal documents                                               |

Plus `/sitemap.xml`, `/robots.txt`, `/icon.svg` and generated `opengraph-image` routes.

### Admin (`noindex`, session-gated)

`/admin` overview · `appointments` · `requests` · `messages` · `users` ·
`arbitrators` · `services` · `articles` · `faq` · `settings`, each with new/edit
sub-routes where relevant.

---

## Architecture

```
src/
├── app/
│   ├── (site)/            public site — shares header/footer + Organization JSON-LD
│   ├── admin/
│   │   ├── login/         unauthenticated
│   │   └── (dashboard)/   session-gated shell (sidebar + topbar)
│   ├── api/admin/         authenticated attachment download
│   ├── layout.tsx         <html lang="fa" dir="rtl"> + font
│   ├── sitemap.ts, robots.ts, opengraph-image.tsx
├── components/
│   ├── ui/                design-system primitives (button, field, badge, states…)
│   ├── brand/             monogram, hero geometry, portrait plates
│   ├── layout/            site header, footer, page hero
│   ├── cards/             service, article, arbitrator cards
│   ├── sections/          reusable page sections
│   ├── forms/             consultation, contact, tracking, booking wizard
│   ├── admin/             admin shell, tables, charts, CMS forms
│   └── tracking/          public status timeline
├── lib/
│   ├── actions/           Server Actions (public + admin + auth)
│   ├── auth/              sessions, password hashing, RBAC
│   ├── security/          CSRF, rate limiting, upload validation
│   ├── validation/        Zod schemas — the single source of form truth
│   ├── db/                repositories + JSON storage adapter
│   ├── services/          domain rules (appointment scheduling)
│   ├── content/           Markdown-subset renderer
│   ├── config/            routes, navigation, Persian label dictionaries
│   ├── seo/               metadata factory, JSON-LD, OG image renderer
│   └── utils/             Persian numerals, Jalali calendar, ids, slugs
├── data/                  seed content (services, arbitrators, articles, FAQ…)
├── types/                 domain models
└── proxy.ts               edge gate for /admin
```

### Persistence

MariaDB, through `src/lib/db/store.ts`. Every read goes through `readDb()` and every write
through `mutate()`; the ~120 repository functions in `index.ts` / `cms.ts` work against a
plain in-memory `Database` object that the store materialises from SQL.

Each collection is one table (`id` primary key, entity as JSON, indexed `updated_at`), plus
`otp_codes` and `rate_limits` for short-lived state. Tables are created automatically on
first start; the database itself must exist.

Two properties matter for a multi-process deployment:

- **Per-row writes.** A mutation diffs the snapshot and writes only the rows that changed,
  rather than rewriting the whole dataset.
- **Cross-process coherence.** `db_meta.revision` is bumped inside every write transaction,
  and writers take `SELECT … FOR UPDATE` on that row. A cached snapshot is only trusted
  while its revision matches, so a second process picks up the first one's edits and two
  processes cannot lose each other's writes.

The snapshot is held in memory per process — the right trade for a dataset that is read on
every page render and measured in hundreds of kilobytes. The append-only collections are
capped in `schema.ts`; enquiries and appointments are the ones that grow, and are what to
move behind paginated SQL first if this ever outgrows the approach.

Migrating from the previous JSON store: set `DATA_IMPORT_FILE` to the old `db.json` and
start once against an empty database. It is opt-in on purpose — a stray development
snapshot in the deploy directory must never silently become the live database.

---

---

## Deploying

Node 20.9+ and MariaDB 10.5+ (or MySQL 8+).

**1. Create the database.** The app creates its own tables, but not the database:

```sql
CREATE DATABASE dadavar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dadavar'@'localhost' IDENTIFIED BY 'a-strong-password';
GRANT ALL PRIVILEGES ON dadavar.* TO 'dadavar'@'localhost';
FLUSH PRIVILEGES;
```

`utf8mb4` is not optional — Persian content needs it.

**2. Configure.** Copy `.env.example` to `.env.production` and fill in `DATABASE_URL`,
`AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, `SEED_ADMIN_PASSWORD`, and absolute `UPLOAD_DIR` /
`MEDIA_DIR` paths **outside** the deploy directory — otherwise client documents and media
are deleted by the next deployment.

**3. Build and start.**

```bash
npm ci
npm run build
npm run start
```

The build does not need the database to be reachable; the running server does. On first
start the tables are created and the administrator account is seeded.

**4. Check it came up.** `/api/health` returns `{"status":"ok","database":true}` and 200,
or 503 when the database is unreachable — point the host's health check at it.

### Notes for the host

- **Run one process** unless you have reason not to. Multiple processes are safe (writes
  are serialised through a row lock), but each holds its own snapshot in memory.
- **Startup validation.** A missing database URL or a weak `AUTH_SECRET` stops the process
  with an explicit message rather than failing later at request time. Warnings — SMS half
  configured, storage paths still relative — are printed and do not block startup.
- **Backups.** `mysqldump dadavar > backup.sql`, plus the `UPLOAD_DIR` and `MEDIA_DIR`
  trees, which hold the files the database only references.

---

## SMS (sms.ir)

Three flows, deliberately shaped differently:

| Flow | Trigger | Route |
| ---- | ------- | ----- |
| Phone verification | Visitor requests a code on a public form | `/send/verify` (registered template) |
| Client notification | **Staff press send** on a request or appointment | `/send/bulk` |
| Office alert | Automatic, when a new enquiry or booking arrives | `/send/bulk` |

Credentials live in the environment, never in the admin panel — an editor with access to
settings must not be able to read the account's API key. Behaviour and message wording are
configured at **Settings › SMS** (`advanced` capability, i.e. the super administrator).

The client notification is not a side effect of changing a status, and that is on purpose:
the wording of a message about somebody's legal matter should be read by the person sending
it, and not every status change warrants a text. The composer prefills from the template for
the current status and stays editable; the recipient is read from the stored record, never
from the form.

Nothing sends until `SMSIR_API_KEY` is set *and* SMS is enabled in settings. Phone
verification only applies when both switches are on — otherwise the public forms would ask
for a code that can never arrive. Every attempt is logged, successful or not; one-time codes
are stored hashed and never written to the log.

---

## Persian & RTL specifics

Several decisions here exist because of Persian typography, not by accident:

- **Numerals.** Persian readers expect `۰۱۲۳`. Every number goes through `fa()` /
  `faNumber()` from `src/lib/utils/persian.ts`. Inputs run through `toEnDigits()` before
  validation, so users may type either script.
- **Jalali calendar.** The date picker and every displayed date use an in-house Solar
  Hijri converter (`src/lib/utils/jalali.ts`), verified against reference dates. Storage
  stays Gregorian ISO; Jalali exists only at the presentation layer. The native
  `<input type="date">` is deliberately avoided — it shows a Gregorian calendar.
- **Week starts Saturday.** Friday is the weekend and is non-bookable.
- **No negative letter-spacing.** Persian ligatures break under tight tracking, so
  `letter-spacing: 0` is enforced globally and line-height defaults to `1.9`.
- **Logical properties.** Layout uses `ms-`/`me-`/`ps-`/`pe-`/`start`/`end` throughout, so
  the design mirrors correctly. Arrow icons are named semantically (`arrow-forward`
  points left in RTL).
- **Bidi isolation.** Phone numbers, emails and tracking codes are wrapped in `dir="ltr"`
  so they never reorder inside Persian sentences.
- **OG images.** Satori lays runs out left-to-right and treats ZWNJ as a run boundary, so
  `src/lib/seo/og-image.tsx` emits each word — and each ZWNJ segment — as its own flex
  child in `row-reverse`. Without that, cards render as "های‌تصمیم" instead of "تصمیم‌های".

---

## Security

| Control | Implementation |
| ------- | -------------- |
| Sessions | HS256 JWT in an `httpOnly`, `sameSite=lax`, `secure`-in-prod cookie |
| Passwords | scrypt (N=16384) with per-user salt; parameters stored in the hash |
| Route protection | Edge gate in `proxy.ts` **plus** `requireAdminSession()` on every admin page |
| RBAC | Ranked roles; destructive + settings operations require `admin` |
| CSRF | Signed double-submit token on every mutating form |
| Rate limiting | Sliding window per IP, and per account on login |
| Login hardening | Identical response for unknown user / wrong password / wrong role; constant-ish timing |
| Open redirect | Post-login `next` accepted only when it is a relative `/admin` path |
| Uploads | Extension + MIME allow-list, magic-byte sniffing, size cap, unguessable stored names, stored outside `public/` |
| Attachment access | Authenticated route handler; serves only files referenced by a real record; forced download + `nosniff` + `no-store` |
| Case-data lookup | Tracking requires code **and** the submitting phone number |
| Stored XSS | Admin-authored content renders as React elements, never `dangerouslySetInnerHTML` |
| Headers | CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, Referrer-Policy, Permissions-Policy |

**Before production:** set a real `AUTH_SECRET`, change the seed admin credentials, and put
rate limiting on a shared store if running more than one instance
(`src/lib/security/rate-limit.ts` is the only file that changes).

---

## SEO

Semantic landmarks and a single `<h1>` per page; per-page meta titles and descriptions;
canonical URLs; Open Graph + Twitter cards with **generated Persian PNG** social images;
`sitemap.xml` and `robots.txt`; and Schema.org JSON-LD for `Organization` / `LegalService`,
`WebSite`, `Person`, `Article`, `FAQPage`, `BreadcrumbList`, `ItemList` and `ContactPage`.

Search-result and paginated article views are `noindex`; `/tracking` and the whole admin
area are `noindex, nofollow`.

---

## Performance

Server Components by default — client JavaScript is limited to the header, booking wizard,
accordion, counters, reveal animation and admin forms. Charts and icons are inline SVG
rendered on the server. Fonts are self-hosted, subset and preloaded. Images are
`next/image` with AVIF/WebP and lazy loading below the fold. Public content pages are
statically prerendered.

---

## ⚠️ Placeholder content

Everything below is **illustrative and must be replaced before launch**:

- Institution name, registration number, address, phones, email, map coordinates
  (`src/data/settings.ts`, editable at `/admin/settings`)
- Homepage statistics — years, cases, arbitrations, practice areas. These are labelled as
  placeholders in the UI itself and are **not** presented as verified figures.
- All arbitrator names, biographies, degrees and affiliations (`src/data/arbitrators.ts`) —
  fictional
- Sample users, appointments, requests and messages (`src/data/samples.ts`) — **not seeded
  by default.** Set `SEED_DEMO_DATA=true` before first start only if you want them for
  evaluating the dashboard; never on a live site.

Article, service and FAQ bodies are substantive Persian legal writing intended as a
starting point. They describe Iranian law accurately at a general level but are
**informational, not legal advice**, and should be reviewed by the institution before
publication.

Arbitrator portraits render a designed monogram plate until a real photograph is uploaded —
there is no stock photography anywhere in the project. Article covers are generated
abstract SVGs in `public/covers`.
