# Crowd Conscious — Platform Audit (April 2026)

**Purpose:** Single reference for product, engineering, and design when planning features and UX/UI improvements.  
**Scope:** Application code, API routes, Supabase schema (migrations), AI agents, Vercel crons/automations, user and sponsor flows, operational status.  
**Method:** Repository inspection (not production runtime metrics). A production deployment may differ where environment variables or Supabase dashboard settings diverge.

---

## Executive summary

| Area | Maturity | Notes |
|------|----------|--------|
| **Core predictions** (markets, votes, XP, leaderboard, Conscious Fund) | Strong | Central product; extensive API and DB support. |
| **Conscious Pulse** (`/pulse`) | Strong | Primary surface for sponsored/market discovery; replaces legacy `/sponsor` landing (301 to Pulse). |
| **Conscious Locations** (`/locations`) | Active | Community-verified places; DB evolution through migrations (e.g. `conscious_locations`, alias votes). |
| **AI agents** (Anthropic) | Strong | Multiple agents + logging; admin manual run; cron schedules in `vercel.json`. |
| **Stripe & webhooks** | Strong (when configured) | Modular webhook router (sponsorship, Pulse, modules, treasury, etc.). Build warns if `STRIPE_SECRET_KEY` unset. |
| **Email / newsletter** | Moderate | Resend; newsletter cron with cooldown logic documented in `docs/AGENTS-CRON-SETUP.md`. |
| **Corporate / employee learning** | Moderate | APIs and portal routes exist; depends on content and ops. |
| **Legacy “communities” UX** | Weak / fragmented | Many UI links point to `/communities/...`; landing API returns empty; no `app/communities/**/page.tsx` found — **high risk of 404s** for those links. |
| **CI / automated tests** | Not visible in repo | No `.github/workflows` in workspace; rely on Vercel build + manual QA. |
| **Documentation** | Dense | Many historical `.md` files at repo root; some contradict current `vercel.json` (cron times). |

---

## 1. Technology stack

| Layer | Choice |
|--------|--------|
| Framework | Next.js **15.5.7**, React **19**, App Router |
| Language | TypeScript **5** |
| Styling | Tailwind CSS **3.4**, Framer Motion |
| Backend / DB | **Supabase** (PostgreSQL, Auth, RLS) |
| Payments | **Stripe** |
| AI | **Anthropic** (`@anthropic-ai/sdk`) |
| Email | **Resend** |
| Rate limiting | **Upstash** Redis (optional) |
| i18n | `next-intl` + locale JSON (`locales/en.json`, `locales/es.json`) |
| Hosting | **Vercel** (serverless, crons, `vercel.json`) |
| Analytics | Vercel Analytics / Speed Insights |

**Dependencies (representative):** Chart.js, Recharts, Zod, React Email, Apify client, RSS parser, exceljs, jspdf — indicating reporting, data export, and content ingestion capabilities.

---

## 2. Codebase structure (high level)

- **`app/`** — Routes and API. Large **Route Handler** surface: **170+** `route.ts` files under `app/api/`.
- **`lib/`** — Auth helpers, Supabase clients (server/browser/admin), agents, email, validation, Pulse/location helpers.
- **`components/`** — Shared UI (some cross-imported from `app/components`).
- **`supabase/migrations/`** — **64** SQL migrations (authoritative schema history for this repo).
- **`scripts/`** — Tooling (e.g. `seed-predictions`, module JSON).
- **Root / `docs/`** — Many ad-hoc guides and past audits; treat **`vercel.json`** and **migrations** as source of truth over older markdown.

**Auth model:** Middleware does **not** gate auth globally; protected areas use **layout-level** checks (`getCurrentUser()`, redirects). Public predictions paths are explicitly allowed through middleware for headers/pathname (see `middleware.ts`).

**Workspace note:** `next build` may warn about multiple lockfiles / inferred workspace root — worth fixing (`outputFileTracingRoot` or consolidating lockfiles) to avoid confusing CI or local builds.

---

## 3. Database (Supabase)

### 3.1 Migration inventory

There are **64** migration files, covering major domains:

- **Predictions:** market overhaul (`126_*`), outcomes/votes, anonymous votes, Pulse, live events, resolution, archiving, coupons, categories.
- **Gamification:** XP, achievements, leaderboard constraints.
- **Conscious Fund / causes:** fund tables, votes, transactions.
- **Conscious Inbox:** inbox schema, nominations, nullable user handling.
- **Conscious Locations:** locations, categories, voting alignment with API (`190_alias_vote_conscious_locations.sql` aligns anonymous votes with location-linked markets).
- **Sponsorship:** sponsorships, sponsor accounts, logos storage, report tokens, tier limits, logging.
- **Blog / content:** blog posts, comments, Pulse embeds.
- **Corporate / modules:** enrollments, progress (cross-reference migrations for course/module tables).
- **Operations:** `cron_job_runs`, `agent_runs`, email digest logs, notifications.

### 3.2 Architectural patterns

- **RLS** enabled on user-facing tables; **SECURITY DEFINER** functions for votes, wallets, and sensitive operations.
- **Triggers** for XP, notifications, and derived fields (see migration comments and `docs/APP-CONTEXT-AND-DESCRIPTION.md`).
- **Legacy vs current:** Comments in API (e.g. landing communities) state **communities table removed** — DB and UI are not fully aligned.

### 3.3 Known DB-adjacent risks (from internal docs + inspection)

- Large volume of **`function_search_path_mutable`** warnings in Postgres (called out in `docs/APP-CONTEXT-AND-DESCRIPTION.md`) — security hardening backlog.
- **Leaked password protection** in Supabase Auth recommended disabled → enable in dashboard when acceptable to UX.

---

## 4. API surface

Roughly **173** API route modules under `app/api/`, including:

- **`/api/predictions/*`** — Markets, votes, wallet, fund, inbox, admin resolution, stats, leaderboard, agent content.
- **`/api/cron/*`** — Scheduled jobs (agents, newsletter, live reminders, pulse auto-resolve, archive, re-engagement, etc.).
- **`/api/webhooks/stripe`** — Central Stripe event dispatch to specialized handlers.
- **`/api/sponsor/*`**, **`/api/pulse/*`** — Checkout and sponsor flows.
- **`/api/corporate/*`**, **`/api/employee/*`** — B2B progress, certificates, invites.
- **`/api/admin/*`** — Moderation, modules, locations, metrics, wallets, promo codes.
- **`/api/auth/ensure-profile`** — Profile/bootstrap path post-signup.

**Implication for UX:** API breadth exceeds what most users see in navigation; **information architecture** (what to expose in primary nav vs settings vs admin) is a key product lever.

---

## 5. AI agents (`lib/agents/`)

| Agent | Role |
|--------|------|
| **ceo-digest** | Executive-style digest of platform activity. |
| **content-creator** | Generates content (e.g. blog drafts in `blog_posts`, related markets). |
| **news-monitor** | News/signal ingestion; uses external APIs when keys exist (`NEWSDATA_API_KEY`, `GNEWS_API_KEY`). |
| **inbox-curator** | Curates Conscious Inbox suggestions. |
| **sponsor-report** | Sponsor-facing reporting content. |
| **intelligence-bridge** | Supporting utilities / bridging logic. |

**Logging:** `lib/agents/config.ts` — `logAgentRun()`, JSON parsing helpers; **`agent_runs`** and **`agent_content`** tables (see migrations `135_*`, `141_*`).

**Admin execution:** `POST /api/predictions/admin/run-agent` runs: `ceo-digest`, `content-creator`, `news-monitor`, `inbox-curator` only.

**Gap:** **`sponsor-report` is not in the admin `run-agent` switch** — only cron (or direct import) can run it unless extended.

**Test route:** `GET /api/predictions/admin/test-agent` — similar agent list; also omits `sponsor-report`.

---

## 6. Automations: Vercel crons & related routes

**Authoritative schedule:** `vercel.json` → `crons` array (UTC).

| Path | Schedule (from `vercel.json`) | Role |
|------|------------------------------|------|
| `/api/cron/agents/news-monitor` | `0 14 * * *` | Daily news agent |
| `/api/cron/agents/inbox-curator` | `5 14 * * *` | Inbox curation |
| `/api/cron/newsletter` | `0 14 * * 1,3,5` | Mon/Wed/Fri newsletter |
| `/api/cron/agents/content-creator` | `30 14 * * *` | Content creator |
| `/api/cron/agents/ceo-digest` | `0 16 * * *` | CEO digest |
| `/api/cron/reengagement-inactive` | `0 16 * * 1` | Weekly re-engagement |
| `/api/cron/live-reminders` | `*/10 * * * *` | Frequent live reminders |
| `/api/cron/live-auto-end` | `*/5 * * * *` | Live session auto-end |
| `/api/cron/pulse-auto-resolve` | `5 * * * *` | Hourly (at :05) Pulse resolution |
| `/api/cron/agents/sponsor-report` | `0 9 1 * *` | Monthly sponsor report |
| `/api/cron/archive` | `0 6 * * *` | Archive old markets/content/inbox |

**Functions block** in `vercel.json` also sets `maxDuration` for **`/api/cron/monthly-impact`** — but **`monthly-impact` is not listed in the `crons` array**. Unless scheduled elsewhere (external cron, manual), **monthly impact emails may not run on a schedule**. Confirm in Vercel Dashboard → Cron Jobs.

**Auth:** Cron routes expect `Authorization: Bearer ${CRON_SECRET}` (see agent docs).

**Health:** `lib/cron-health.ts` writes **`cron_job_runs`**; failures can email `ADMIN_EMAIL` when Resend is configured.

**Doc drift:** `docs/AGENTS-CRON-SETUP.md` lists older “9:00 UTC” schedules for all daily agents; **actual production times differ** (mostly **14:00–16:00 UTC** cluster in `vercel.json`). Update docs or add a “last verified” note to avoid misconfiguration.

---

## 7. Stripe webhooks

`app/api/webhooks/stripe/route.ts` verifies signatures and delegates to handlers:

- Module purchases, **community/content sponsorship**, **market sponsorship**, Pulse purchases/add-ons, **market sponsor accounts**, treasury donations, payment verification.

**UX implication:** Multiple checkout entry points must stay consistent (success/cancel URLs, email content, sponsor dashboard links).

---

## 8. User flows

### 8.1 Acquisition & auth

- **Signup / login** — Supabase Auth; **`/api/auth/ensure-profile`** ensures `profiles` + stats (per `docs/APP-CONTEXT-AND-DESCRIPTION.md`).
- **Optional gate:** `PREDICTIONS_ACCESS_CODE` + `/api/predictions/verify-code` for restricted access.
- **Session:** Notifications and client code handle **401** → login redirect.

### 8.2 Core app: predictions

- **`/predictions`** (and nested routes: fund, leaderboard, inbox, admin sub-areas) — primary logged-in experience for markets and gamification.
- **Wallet** — Optional paid/trading path; docs describe free-to-play as primary.

### 8.3 Conscious Pulse

- **`/pulse`** — Public listing; sponsor context (e.g. `sponsorAccount`) for branded views. Aligns with **market sponsorship** product.

### 8.4 Conscious Locations

- **`/locations`** — Dedicated page using `components/locations/LocationsPage`. Supports verified-place narrative and voting; DB migrations continue to align anonymous voting rules with location-linked markets.

### 8.5 Blog / insights

- Migrations and APIs for **`blog_posts`**; content-creator agent writes **draft** posts for review.

### 8.6 Corporate / employee

- Routes under **`app/corporate`**, **`app/employee-portal`**, APIs for progress, certificates, invitations. Typical flow: invite → accept → modules → completion.

### 8.7 Legacy “communities”

- **`/api/landing/communities`** returns **empty** `{ communities: [], count: 0 }` by design.
- **No `app/communities/page.tsx`** found; however **links remain** in `SimpleDashboard`, `CommunityCarousel`, `NotificationSystem`, `AdminDashboardClient`, etc.

**Impact:** Users or admins following those links likely hit **404** — a major **UX and trust** issue until routes are restored, redirected, or links removed.

---

## 9. Sponsor & brand flows

### 9.1 Primary entry: Pulse (not legacy sponsor page)

- **`app/(public)/sponsor/page.tsx`** performs **`permanentRedirect('/pulse')`** — legacy URL intentionally moves traffic to Conscious Pulse.

### 9.2 Sponsor dashboards (token-based)

- **`app/(public)/dashboard/sponsor/[token]/...`** — Onboarding, reports, share, guide, per-market report, create-pulse, etc.
- APIs under **`/api/dashboard/sponsor/[token]/*`** support server actions without a classic “logged-in sponsor account” session in some flows (token auth pattern).

### 9.3 Checkout & reporting

- **`/api/sponsor/checkout`**, **`/api/pulse/checkout`**, upload logo, AI assist for sponsor copy.
- **Impact reports:** `/sponsor/report/[id]` (and related) — tokenized private dashboards for sponsors.

### 9.4 Community/content sponsorship (parallel system)

- Components such as **`SponsorshipCheckout`**, **`MySponsorships`**, and archive docs describe **need-based** community sponsorship. Confirm which surfaces are still linked in production UI; archive docs once claimed “frontend missing” may be partially obsolete if components were wired later — **verify in UI**, not only docs.

---

## 10. Admin

- Routes under **`app/admin`** — metrics, promo codes, locations, intelligence, deletions, email tests, etc.
- **Predictions admin** — `/predictions/admin/*` (agents, markets, blog posts, coupons, resolve tools).
- **Manual agent runs** — `/predictions/admin/agents` UI + API (see section 5).

---

## 11. Observability & quality

- **Error tracking:** `lib/error-tracking.ts` + integration notes in `ERROR-TRACKING-IMPLEMENTATION.md` (structured for future Sentry; console today).
- **Vercel Analytics / Speed Insights** — Package present.
- **Build:** `npm run build` **completed successfully** in this environment (April 2026); Stripe disabled when key missing; noisy but non-fatal **dynamic server usage** messages during static generation for cookie-based routes.

---

## 12. What is working well (engineering)

1. **Coherent core loop:** Markets ↔ votes ↔ XP ↔ fund ↔ inbox is implemented end-to-end with substantial API and schema support.
2. **Agent pipeline:** Multiple agents, DB logging, cron triggers, admin overrides (for four agents).
3. **Payments architecture:** Webhook router split by domain reduces monolithic handler risk.
4. **Internationalization hooks** for Pulse listing and public pages.
5. **Operational discipline:** Cron health table + optional admin email on failure.

---

## 13. Gaps, risks, and debt

| Issue | Severity | Notes |
|-------|----------|--------|
| **Broken `/communities` links** | High | Remove, redirect, or rebuild community routes. |
| **`monthly-impact` not in `vercel.json` crons** | Medium–High | Confirm if emails are sent; add cron or external scheduler. |
| **Admin `run-agent` missing `sponsor-report`** | Medium | Operational friction; easy code fix. |
| **Documentation vs `vercel.json` cron times** | Medium | Misleading runbooks. |
| **No CI workflows in repo** | Medium | No automated test/lint gate visible in `.github`. |
| **RLS / search_path / Supabase linter warnings** | Low–Medium | Incremental hardening. |
| **Root-level doc sprawl** | Low | Hard for newcomers to find current truth; consolidate pointers. |

---

## 14. UX / UI opportunities (for new features)

1. **Navigation truth map** — Audit primary nav, footer, and dashboard cards against **actual routes** (Pulse vs legacy sponsor vs communities). Reduce dead ends.
2. **Sponsor clarity** — Single clear funnel: **Pulse pricing → checkout → token dashboard → report**. Surface post-purchase steps in-app email and empty states.
3. **First-run user** — Onboarding from signup → first vote → first fund interaction → inbox submission; align empty states and progressive disclosure.
4. **Admin cognitive load** — Many capabilities; consider role-based tabs or “tasks today” (resolve markets, inbox promotions, blog review).
5. **Locations × Pulse** — Cross-link narratives (“verify a place” ↔ “pulse on local issues”) if product strategy allows.
6. **Mobile** — Framer Motion + dense dashboards: verify touch targets and critical paths on small screens.
7. **Trust & transparency** — Show **how** sponsorship funds causes (percentages, timing) on Pulse and fund pages consistently.

---

## 15. Suggested next steps (prioritized)

1. **Fix or remove all `/communities` links** (quick win; large UX impact).
2. **Verify `monthly-impact` scheduling** in Vercel and document the single source of truth.
3. **Align internal cron documentation** with `vercel.json`.
4. **Extend admin agent runner** to include `sponsor-report` (and update test-agent parity).
5. **Add minimal CI** (typecheck + lint + build) if not configured only on Vercel.
6. **Curate `docs/`** — One “index” file pointing to canonical architecture (`APP-CONTEXT`, this audit, `vercel.json`).

---

## 16. File references (quick)

| Topic | Location |
|--------|----------|
| Cron schedules | `vercel.json` |
| Agent implementations | `lib/agents/*.ts` |
| Admin agent trigger | `app/api/predictions/admin/run-agent/route.ts` |
| Sponsor redirect | `app/(public)/sponsor/page.tsx` |
| Stripe webhook | `app/api/webhooks/stripe/route.ts` |
| Cron health | `lib/cron-health.ts` |
| Middleware | `middleware.ts` |
| Schema history | `supabase/migrations/*.sql` |
| Product narrative | `docs/APP-CONTEXT-AND-DESCRIPTION.md` |

---

*This audit reflects the repository state at the time of writing and is intended to complement, not replace, production monitoring and user research.*
