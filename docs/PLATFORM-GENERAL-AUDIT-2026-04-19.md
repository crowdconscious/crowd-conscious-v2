# Crowd Conscious — General Platform Audit (April 19, 2026)

> **Scope:** Every shipped feature, every user/client journey, the UX surface, the code organization, the database, and concrete next steps.
> **Method:** Repository inspection at HEAD on `main` (Apr 19, 2026), cross-referenced against `vercel.json`, `supabase/migrations/`, and the canonical context docs (`PLATFORM-FULL-AUDIT-2026-04-16.md`, `REFINED-STRATEGY-2026-04-16.md`, `PERFORMANCE-NOTES-2026-04-16.md`, `APP-CONTEXT-AND-DESCRIPTION.md`).
> **Frame:** **53 days** to Estadio Azteca kickoff (Jun 11, 2026). Recommendations are filtered through that.

---

## 0. Executive snapshot

| Dimension | State | One-line take |
|-----------|-------|----------------|
| Engineering foundation | **Mature** | Next.js 15.5.7 / React 19, 64-table Supabase schema with RLS, modular Stripe webhooks, 5 working AI agents, Vercel cron health table. Build is clean. |
| Predictions core loop | **Strong** | Free-to-play votes → XP → leaderboard → Conscious Fund. Anonymous voting + post-vote conversion now wired (resolved earlier audit gap). |
| Conscious Pulse (B2B) | **Productized** | Public pricing page, Mundial Pack SKU, Club Reset case study, sponsor token dashboards, AI sponsor outreach loop. Zero paying customers as of last digest. |
| Conscious Locations | **Wedge confirmed** | 3 seed cards live, Map view, Azteca proximity module, value badges, anonymous voting wired. Acquisition + B2B pipeline. |
| Conscious Live | **Operational** | Realtime votes, comments, leaderboard, archived_at soft-delete, auto-end + reminders crons, auction event type. Awaits Mundial. |
| Conscious Fund | **Visible** | Founder seed + thermometer surfaced everywhere; transparency page exists; donation thermometer renders 0 → goal MXN. Conversion link established but balance still small. |
| Conscious Inbox | **Built, dormant** | UI + agent + admin promotion path; pending submissions = 0. Needs CTA push. |
| Corporate / Employee learning | **Mature but parked** | Modules, lessons, certificates, ESG report, marketplace reviews. Per `REFINED-STRATEGY` it’s deferred until post-Mundial. |
| Blog | **Working draft factory** | content-creator agent writes drafts; manual publish; pulse embeds, comments, related markets. |
| AI agents + crons | **Healthy** | 5 agents (`ceo-digest`, `content-creator`, `news-monitor`, `inbox-curator`, `sponsor-report`) all selectable from admin runner. `monthly-impact` now scheduled. |
| Observability | **Console-grade** | `agent_runs`, `cron_job_runs`, `share_events`, error-tracking shim. Sentry wiring TODO. |
| Documentation | **Curated index** | `docs/INDEX.md` is canonical. Root-level legacy SQL/MD remains and is the single biggest hygiene drag in the repo. |

**Bottom line:** Engineering is meaningfully ahead of distribution. The product wedge is correct and shipped. The remaining work is **content density, sales motion, and the last 10% of UX polish**, not new platform capability.

---

## 1. Technology stack & infrastructure

### 1.1 Runtime
- **Framework:** Next.js **15.5.7** (App Router), React **19.1.2**, TypeScript 5
- **Hosting:** Vercel — region `iad1`, with per-route `maxDuration` budgets in `vercel.json`
- **Styling:** Tailwind CSS 3.4 with `@tailwindcss/typography`; custom design system in `lib/design-system.ts`; tokens used as `bg-cc-bg`, `text-cc-text-primary`, `border-cc-border`
- **Animation:** Framer Motion 12
- **i18n:** `next-intl` 4.5 + `locales/en.json`, `locales/es.json` + `contexts/LanguageContext.tsx` + `lib/i18n/`
- **Maps:** Leaflet 1.9 + react-leaflet 5 (Locations map view)
- **Charts:** Both `chart.js` + `react-chartjs-2` (used only in `IntelligenceClient`) and `recharts` 3 — duplication still pending consolidation
- **PDF / export:** `jspdf`, `jspdf-autotable`, `exceljs`, `html2canvas` (sponsor + ESG reports)

### 1.2 Backend services
- **Database / Auth:** Supabase (PostgreSQL with RLS); 64 numbered migrations at `supabase/migrations/126_*` → `203_*`
- **Payments:** Stripe (server SDK 18.5, react-stripe-js 4) — webhook router under `app/api/webhooks/stripe/`
- **AI:** Anthropic SDK 0.78 — Haiku 4.5 (`FAST`) for summarization, Sonnet 4.5 (`CREATIVE`) for content; verified working in `lib/agents/config.ts`
- **Email:** Resend 6 + `@react-email/*` for templated emails
- **Rate-limiting:** Upstash Ratelimit + Redis (optional, falls back when unconfigured)
- **External signals:** RSS Parser, Apify client (news monitor), optional `NEWSDATA_API_KEY` / `GNEWS_API_KEY`
- **Analytics:** `@vercel/analytics`, `@vercel/speed-insights`

### 1.3 Configuration
- **`middleware.ts`** — Does **not** gate auth; only stamps `x-pathname` / monitoring headers and explicitly leaves `/predictions` open to anon traffic
- **`vercel.json`** — Authoritative cron schedules + per-route `maxDuration`; security headers (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`); 301 redirects for legacy `/terms-and-conditions`, `/privacy-policy`
- **Next config:** `next.config.js` and `next.config.ts` both present (legacy `.js` should be removed)
- **`.env.local` keys (inferred from code):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, `ADMIN_EMAIL`, `UPSTASH_REDIS_REST_URL/TOKEN`, `NEWSDATA_API_KEY`, `GNEWS_API_KEY`, `APIFY_TOKEN`

---

## 2. Repository structure

```
app/
  (app)/               Authed product chrome (header, footer, profile, settings, leaderboard, achievements,
                       notifications, dashboard, employee-portal sub-shell, admin sub-shell)
  (predictions)/       Predictions feature shell + nested routes (markets, fund, leaderboard, inbox, insights,
                       intelligence, wallet, trades, pulse, notifications, admin/*)
  (public)/            Login, signup, password reset, dashboard/sponsor/[token]/*, sponsor (→/pulse), markets
                       alias, about, terms, privacy, cookies
  admin/               Top-level admin (metrics, intelligence, locations, markets, deletions, email-test,
                       email-templates, test-systems)
  api/                 ~180 route.ts files across all domains (see §6)
  blog/                Public blog index + [slug]
  concientizaciones/   Spanish-locale corporate marketing surface
  corporate/           B2B portal: dashboard, employees, checkout, certificates, esg-reports, impact, progress
  employee-portal/     Authed employee learning shell: courses, modules, certifications, dashboard, impact
  employee-portal-public/  Onboarding for invited employees (acceptance flow)
  fund/                Public alias → /predictions/fund (server redirect)
  impact/              Public impact narrative page
  live/                Conscious Live listing + [eventId] match page + preview
  locations/           Public locations browser + [slug] detail
  pulse/               Public Pulse landing + [id] result page + pilot + welcome
  signup-corporate/    Corporate signup
  unsubscribed/        Email unsubscribe confirmation
  verify/              Verification handler
  layout.tsx, page.tsx Landing (3-block redesigned hero + top markets + locations + Fund)

components/            Shared UI grouped by domain (locations, markets, pulse, sponsor, live, fund, gamification,
                       sharing, anon, blog, admin, dashboard, esg, reviews, activities, case-study, landing,
                       coupon, ui)
hooks/                 Realtime + tier hooks (useLiveEvent, useLiveLeaderboard, useLiveMarkets,
                       useLiveNavBadge, usePresence, usePulseNavBadge, useUserTier, useMediaQuery)
lib/                   Server helpers (supabase clients, auth, agents, emails, predictions, locations, pulse,
                       live, design-system, validation, sponsor, fund, xp-system, share, world-cup-kickoff…)
locales/               en.json, es.json
supabase/migrations/   Authoritative schema history (126 → 203)
scripts/               Seed scripts + module data import scripts
docs/                  Canonical reference set (see docs/INDEX.md)
types/database.ts      Generated Supabase types (1.5k lines)
```

**Workspace hygiene:** ~95 root-level `.sql` + `.md` files (`FIX-*.sql`, `CHECK-*.sql`, `DIAGNOSE-*.sql`, etc.) remain as historical artifacts. They are not referenced by code but pollute search and onboarding.

---

## 3. Feature inventory (what the platform actually does today)

### 3.1 Predictions (free-to-play core)
- Multi-outcome markets (binary or N-way), confidence-weighted votes, anonymous + registered voting paths.
- Per-market detail page with vote panel, trade panel (legacy paid), comment thread, vote-reasoning surface, and embedded share card.
- **Anonymous flow:** alias-based participants persist across sessions; `converted_to_user_id` ties anonymous votes to users on signup, preserving XP and confidence (migrations `158`, `169`, `190`).
- **Public-surface gating:** Markets only appear on landing / list when `total_votes >= PUBLIC_MARKET_MIN_VOTES` (`lib/predictions/engagement.ts`). Eliminates 0% / 100% bars.
- **Categories:** `world`, `government`, `corporate`, `community`, `cause`, `sustainability`, `world_cup`, `pulse`, `geopolitics` (migrations `127`, `164`).
- **Auto-resolve / archive:** `pulse-auto-resolve` (hourly), `archive` (daily); `live-auto-end` (every 5 min); resolution emails + market-resolution notifications.

### 3.2 Conscious Pulse (B2B sentiment product)
- Public landing with `MundialPulseHero`, pricing tiers (`PulsePricingSection`), Mundial Pulse Pack card, Club Reset case study card, hero highlight, listing of all consultations.
- Pulse-specific markets carry `is_pulse=true` and use `PulseListingView` (filterable, locale-aware).
- Per-Pulse result view: outcome bars, confidence histogram, vote timeline, CSV export, sponsor branding, share controls.
- Tier model: Single, Pulse Pack, Subscription, Custom (MXN-first, USD shadow); `lib/pulse/`, `lib/pulse-tiers.ts`, `lib/pulse-tier-benefits.ts`.
- Onboarding: `app/pulse/welcome` (post-checkout), `app/pulse/pilot` (pilot SKU landing).
- Sponsor token dashboard at `/dashboard/sponsor/[token]/*` (overview, reports, share, guide, create-pulse, per-market report).

### 3.3 Conscious Locations
- Community-certified venues / brands / influencers (categories: restaurant, bar, cafe, hotel, coworking, store, brand, influencer, other).
- Card view + map view (Leaflet) + Azteca proximity module (`NearestToAztecaSection`, `lib/locations/geo.ts`).
- Per-location detail with rotating market voting, Conscious Score (after ≥10 votes), value badges, share, perks.
- Anonymous voting wired in `LocationsPage` via `recordAnonVote` + `AnonymousSoftGate` + `AnonymousVoteToast` + `PostVoteShare`.
- Admin-only flows: `/api/admin/locations`, recalculate score, verify, nominate.
- Inbox path: `/api/locations/nominate` cross-feeds Conscious Inbox.

### 3.4 Conscious Live
- Live event entity (`live_events`) with status `scheduled | live | completed | cancelled`, soft-delete `archived_at` (migration `203`), event types including standard live + auctions (`201`, `202`).
- Realtime publication via Supabase realtime (vote tallies, comments, viewer presence via `usePresence`).
- YouTube embed (`StreamEmbed`), countdown, viewer count, anonymous join, leaderboard, fund impact ticker, comments.
- Operational crons: reminders (every 10 min), auto-end (every 5 min); both stamp `cron_job_runs`.
- Admin tools: `CreateLiveEventPanel`, `AdminLiveControls`.

### 3.5 Conscious Fund
- Public landing block with `FundThermometer` (current → `CONSCIOUS_FUND_GOAL_MXN`).
- Founder seed established (`191`); reset/seed migrations (`182`).
- Public read access (migration `198`) so anonymous landing reads succeed regardless of RLS state.
- Cause vote model: `fund_causes` + `fund_votes` + monthly cycle key; admin causes management at `/predictions/admin/causes`.
- Transparency dashboard component lives in `components/fund/TransparencyDashboard.tsx`; public `/predictions/fund` page is the canonical surface.
- Treasury donation supported via Stripe (`handleTreasuryDonation`).

### 3.6 Conscious Inbox
- User-submitted ideas (market_idea, cause_proposal, ngo_suggestion, general); upvotes; admin moderation pipeline (`/predictions/admin/inbox`); promotion to live market.
- AI agent (`inbox-curator`) summarizes pending items; falls back to nomination counts when empty (already merged).
- Nullable user_id (`189`) supports nominations from anonymous users.

### 3.7 Gamification
- XP model: `awardXP()` RPC; `user_xp` (totals), `user_stats` (streaks), `xp_transactions` (audit), `user_achievements`.
- Tier system: `lib/tier-config.ts`, `useUserTier`, `TierThemeProvider`, `TierTimeline`, `TierProgressionCard`, `TierUnlockPreview`, `XPBadge`, `XPProgressBar`, `XPWaysToEarn`.
- Celebration UX: `CelebrationModal`, `LazyCelebrationModal`, `canvas-confetti`.
- Streaks: `StreakTracker` runs in `(app)` layout.

### 3.8 Sponsor & brand experience
- Two parallel surfaces:
  1. **Token dashboard** (`/dashboard/sponsor/[token]/*`) — long-lived, no login required, used for ongoing campaign management.
  2. **Public Pulse landing** (`/pulse`) — pricing, case study, Mundial Pack, listing.
- Stripe checkout entry points: `/api/sponsor/checkout`, `/api/pulse/checkout`, `/api/create-checkout`.
- Webhook handlers (modular): module purchase, sponsorship, market sponsorship, pulse purchase, pulse add-on, market sponsor account, treasury donation, payment verification.
- Sponsor account model with tier limits (`185`), report token (`142`), last dashboard visit (`183`).
- AI assist: `/api/sponsor/ai-assist`, `agent_content_sponsor_outreach` (193).
- Logo upload: `/api/sponsor/upload-logo` + `sponsor_logos` storage bucket (132).

### 3.9 Corporate / Employee learning
- Corporate dashboard (`/corporate/*`): employees CRUD, checkout (modules), progress, certificates, ESG reports, impact.
- Employee portal (`/employee-portal/*`): courses list, module detail, lessons, certifications, impact, dashboard.
- Public corporate signup + invitation acceptance (`/employee-portal-public`).
- Marketplace review: `MarketplaceReviewTab` in admin; `ModuleReviewsSection` for employees.
- Tooling configured per module (audit script + module-tools components).

### 3.10 Blog
- Public listing + `[slug]` detail.
- Pulse embeds inside posts (`BlogPulseEmbedFields`, `EmbeddedMarketCard`, `PulseEmbed`); related markets surfaced (`172`, `173`).
- Comments (`171`, `BlogComments`) with notifications.
- Drafts created by `content-creator` agent; require manual publish (status flow `draft → published`).

### 3.11 Notifications & email
- `notifications` table with `link` (143), email-prefs + types (146), digest log (149, 170), `email_unsubscribe` flow.
- React Email templates rendered via Resend; `lib/prediction-email-notifications.ts`, `lib/market-email-helpers.ts`, `lib/live-event-emails.ts`.
- Newsletter cron (Mon/Wed/Fri 14:00 UTC), monthly impact email (1st of month 10:00 UTC), re-engagement for inactive users (Mon 16:00 UTC).
- Admin email tester at `/admin/email-test` and previews under `/api/email-previews`.

### 3.12 Sharing & growth surface
- `PostVoteShare`, `SharingSystem`, `ShareButton`, OG-image routes (`/api/og/*`), `share_events` table (197) for attribution.
- Cookie consent (`CookieConsent`), language switcher (single + simple variants), trusted brands row.

### 3.13 Search / discovery / SEO
- `app/sitemap.ts`, `app/robots.ts`, locale-aware `alternates.languages` on every public page.
- Per-page `generateMetadata` for canonical + OG.
- Pulse-specific SEO copy in `lib/i18n/pulse-listing.ts`.

### 3.14 Admin
- **Top-level admin** (`/admin`): metrics, AI intelligence dashboard, locations management, markets, deletion requests, email tests + templates, test-systems harness.
- **Predictions admin** (`/predictions/admin/*`): agents UI (run individual agents incl. sponsor-report), blog drafts review, causes CRUD, coupons, create/edit market, inbox moderation, locations, resolve markets, sponsors.
- Admin-only API routes under `/api/admin/*` and `/api/predictions/admin/*` with profile-row `user_type='admin'` checks.

---

## 4. User & client journeys

### 4.1 Anonymous visitor (acquisition path — primary)
1. Lands on `/` → 3-block hero (live event banner if any → impact ticker → top 3 markets ≥5 votes → top 3 locations → Fund thermometer + cause leaderboard → Brands mini-pitch).
2. Taps a market → `/markets/[id]` (or per-id detail) → can vote anonymously without signup.
3. Vote completes → `AnonymousVoteToast` confirms shift; `recordAnonVote` persists alias; `PostVoteShare` invites a share.
4. After N votes (configured), `AnonymousSoftGate` proposes saving streak/XP via signup or Google OAuth.
5. Optional path: `/locations` → swipes a location → same anonymous vote system → soft-gate.
6. Optional path: `/pulse` → reads pricing → "Book a 15-min demo" / contact → enters Pulse sales pipeline.

### 4.2 Registered free user (engagement loop)
1. Signs in (`/login`) or signs up (`/signup`) → `(app)` shell loads with `HeaderClient`, `StreakTracker`, mobile nav.
2. Hits `/predictions` (registered) or `/predictions/markets` (anon redirect target).
3. Dashboard surfaces: own vote streak, XP/tier, recently resolved predictions, biggest movers, new markets, agent content (news_summary), portfolio (legacy trading), Conscious Fund balance.
4. Side actions: `/predictions/leaderboard`, `/predictions/inbox` (submit ideas), `/predictions/fund` (vote on cause), `/predictions/insights`, `/predictions/intelligence` (admin-leaning agent dashboards).
5. Notifications bell polls; redirects to `/login` on 401; deep links to `notifications.link`.
6. Profile + settings: `(app)/profile`, `(app)/settings`, achievements, locale toggle.

### 4.3 Sponsor (B2B client path)
1. Discovers Pulse on `/pulse` (pricing transparent in MXN) or via outbound sales (CEO digest pipeline).
2. Either:
   - Buys Pulse Pack / Single via `/api/pulse/checkout` (Stripe) → Stripe webhook routes to `handlePulsePurchase` → sponsor account + access token created → confirmation email with token URL.
   - Or community-sponsorship flow: `/api/sponsor/checkout` → `handleMarketSponsorship` → sponsor logo + link mounted on market card.
3. Receives token URL `/dashboard/sponsor/[token]` → onboarding banner → analytics, market list, share, create-pulse, per-market report, guide.
4. Monthly cron `sponsor-report` (1st 09:00 UTC) emails impact reports.
5. Sponsor can run `create-pulse` to define a new sponsored Pulse, upload logo, get AI copy assist.

### 4.4 Corporate buyer / employee
1. Corporate admin signs up at `/signup-corporate` → `/corporate/dashboard` to manage employees.
2. Invites employee → email via Resend → employee accepts at `/employee-portal-public/...` → joins portal.
3. Employee → `/employee-portal/courses` → enrolls in modules → completes lessons → earns certificates.
4. Corporate admin sees aggregated progress, downloads ESG report PDF.

### 4.5 Admin daily operations
1. Logs in as admin → `/predictions/admin` dashboard with "tasks today" attention counts (pending market suggestions, draft blog posts).
2. Manual agent runs at `/predictions/admin/agents` (any of 5 agents).
3. Reviews `agent_content` proposals → promotes inbox suggestions → publishes blog drafts.
4. Resolves markets at `/predictions/admin/resolve` → triggers XP scoring + notifications + emails.
5. Monitors `cron_job_runs`, `agent_runs` (admin-only API endpoints exist for both).

### 4.6 Live event audience
1. `/live` lists upcoming + past events; `LiveEventBanner` on landing if status=`live`.
2. `/live/[eventId]` opens `LiveMatchClient` → countdown → on-air vote panel (`LiveVotingPanel`), comments (`LiveComments`), leaderboard (`LiveLeaderboard`), viewer count, fund impact ticker, micro-markets.
3. Anonymous join supported via `/api/live/anonymous-session` and `/api/live/join-anonymous`.
4. Auto-end cron closes the event 5 min after match end; resolve flow runs.

---

## 5. UX / UI surface — what works, what to polish

### 5.1 What works (verified in code)
- **Locale-consistent language switcher** (`LanguageSwitcher`, `LanguageSwitcherSimple`) plus `next-intl`.
- **Anonymous-first vote loop** — Soft gate, toast, share, conversion celebration components in place.
- **Trust signals on landing** — Fund thermometer, impact ticker, cause leaderboard, location density, top-vote markets only.
- **Mobile-aware** — `MobileNavigation`, snap-x carousels on landing, min-h-44px touch targets in primary CTAs, dashboard mobile menu.
- **Tiered theming** — `TierThemeProvider` re-themes the authed shell.
- **Designed system tokens** — `lib/design-system.ts`, `tailwind.config.js` extends `cc-bg`, `cc-card`, `cc-border`, `cc-text-primary`. Consistency is high; legacy hex fragments remain in a few client components.
- **OG / share infrastructure** — `share_events` analytics, `/api/og/market/[id]` via `@vercel/og`, share buttons everywhere.

### 5.2 What still drags UX
| Issue | Where | Why it matters |
|-------|-------|----------------|
| Root-level dead landing components (`LandingHeroClient.tsx`, `CommunityCarousel.tsx`, `CompletedNeeds.tsx`) | `app/components/landing/` (per Performance Notes) | Confuses contributors and inflates raw `<img>` count |
| Duplicate Next config (`next.config.js` + `next.config.ts`) | repo root | Hard to know which is authoritative |
| Mixed-locale chrome | nav labels vs hero copy | Spanish hero with English nav was flagged in REFINED-STRATEGY; partially fixed (Pulse, Locations Spanish-first) but global QA pass missing |
| Disabled Subscribe button | `NewsletterForm` (footer) | Trust killer; fix or hide |
| Two language toggles in footer area | landing footer | Double-control bug pre-Mundial |
| `/sponsor` legacy term in nav | landing nav | Nav label should match destination ("Pulse" / "For Brands") |
| `chart.js + recharts` duplication | bundle | `IntelligenceClient.tsx` only consumer of chart.js — migrate to recharts to drop ~120 KB |
| Raw `<img>` tags (~19) | mostly in OG/email/dead components — most are intentional | Becomes minor after deleting dead components |
| Profile picture upload still uses `<img>` | `ProfilePictureUpload.tsx` | Acceptable; user-uploaded |
| `console.log` noise in webhook + auth helpers | various | Acceptable while monitoring; remove before scaling |
| Repository root SQL/MD sprawl | repo root | Onboarding friction — already noted, still present |
| Some pages still render `<a>` instead of `<Link>` | older sub-pages | Quick polish for prefetching |
| `app/components/` and `components/` dual root | tree | Imports work but an aspiring dev sees two trees |

### 5.3 Concrete UX wins to ship in week 1
1. Delete confirmed dead landing components (the Performance Notes lists them) — also fixes raw-img count.
2. Single-source the Next config (delete `.js`).
3. Final locale QA on landing nav + footer + newsletter form.
4. Remove `/sponsor` and `/markets` from primary nav; rename to "Pulse" / "Predicciones"; consolidate to the 5-item nav recommended in REFINED-STRATEGY (Predicciones · Lugares · Pulse · Fondo · Acerca).
5. Replace the Conscious Fund "$0" pre-state in any remaining surface with the `FundThermometer` (landing already does this — check footer + sponsor dashboards).

---

## 6. Code architecture

### 6.1 API surface (~180 route handlers under `app/api/`)
**Top-level groups:**
```
api/
  activities/          External activity tracking
  admin/               Cross-domain admin (cron-health, locations, markets, modules, promo-codes, wallets,
                       deletion-requests, moderate-{community,sponsorship,user}, update-setting)
  auth/                Profile bootstrap (ensure-profile)
  blog/                Blog CRUD + comments + pulse-embed helpers
  case-studies/        Case study fetch (e.g. club-reset)
  certificates/        Corporate certificate issuance
  corporate/           B2B endpoints (invite, accept, reports, self-enroll, signup, certificates, progress)
  coupons/             Promo / coupon code lookup
  create-checkout/     Generic Stripe checkout entry
  cron/                Scheduled jobs (see §7)
  dashboard/sponsor/   Token-authed sponsor dashboard endpoints
  email/, emails/, email-previews/   Send + preview templates
  employee/impact/     Employee-side impact metrics
  enrollments/         Course/module enrollments
  esg/                 ESG report endpoints
  external-response/   Webhook for external integrations
  fund/balance/        Public fund balance
  gamification/        Achievements / XP queries
  landing/             Landing aggregations
  live/                Realtime event sub-API (events, comments, anonymous-session, join-anonymous, markets,
                       resolve, fund-context, video-check)
  locations/           Public list + nominate + recalculate + verify
  markets/             Public + trending market endpoints
  modules/             Module CRUD (corporate)
  monitoring/          Internal metrics
  newsletter/          Subscribe + unsubscribe
  notifications/       List + per-id read
  og/                  OG-image generators
  predictions/         Bulk: markets, votes, fund, leaderboard, my-predictions, positions, stats, trade,
                       wallet, verify-code, history, inbox, agent-content, admin/* (run-agent, send-newsletter,
                       resolve, blog-posts, causes, coupons, create-market, edit-market, agents, sponsors,
                       inbox, intelligence-dashboard, markets, suggest-criteria, test-agent, archive,
                       archive-sweep, cancel, dismiss-suggestion)
  public/              Public reads behind admin client (when needed)
  pulse/               Pulse listing context + checkout + Mundial spots + active-count
  reviews/             Marketplace reviews
  setup-admin/         One-time admin bootstrap
  share/               Share-event tracking
  sponsor/             AI assist + checkout + upload-logo
  support/             Contact form
  test-anthropic/      Anthropic key smoke test
  tools/               Misc dev tools
  user/, user-stats/, users/   User-facing profile data
  votes/               Public vote endpoints
  webhooks/stripe/     Modular webhook router (see §3.8)
```

### 6.2 Auth & access control
- **Middleware:** Header stamping only — does **not** redirect.
- **Layout-level gating:** `(app)/layout.tsx`, `(predictions)/layout.tsx` call `getCurrentUser()` and redirect to `/login` if missing.
- **Public-by-design:** Landing, `/predictions/markets`, `/predictions/[id]`, `/locations`, `/pulse`, `/blog`, `/live`, `/fund` (alias), `/about`, sponsor token dashboards, OG images.
- **Profile self-heal:** `getCurrentUser()` upserts `profiles` + `user_stats` if missing — a known race with `ensure-profile`.
- **Admin gate:** Inline `profile.user_type === 'admin'` checks on each admin endpoint.
- **Cron auth:** Bearer `CRON_SECRET` in handler.
- **Sponsor token:** `sponsor_accounts.access_token` matched in `/dashboard/sponsor/[token]/...`.

### 6.3 Supabase clients
- `supabase-server.ts` (cookie-aware, for server components)
- `supabase-client.ts` (browser)
- `supabase-admin.ts` (service role; bypasses RLS — used in `getLandingData`, locations SSR, agents, webhooks)
- `auth-server.ts` adds `AuthSessionExpiredError` for clean 401s.

### 6.4 Key business modules in `lib/`
- **Predictions:** `predictions/markets-page.ts`, `predictions/engagement.ts`, `predictions/fund-goal.ts`, `prediction-schemas.ts`, `prediction-emails.ts`, `prediction-email-notifications.ts`, `market-categories.ts`, `market-vote-reasonings.ts`, `market-resolution-notifications.ts`, `vote-reasoning.ts`, `persist-vote-reasoning.ts`, `probability-utils.ts`, `pricing.ts`, `daily-digest-market-selector.ts`.
- **Conscious Fund:** `conscious-fund-balance.ts` (admin client read so anon landing always sees the number), `fund-allocation.ts`, `fund-transparency.ts`.
- **Pulse:** `pulse/pulse-hero-data.ts`, `pulse/pulse-listing-data.ts`, `pulse-tier-benefits.ts`, `pulse-tiers.ts`, `pulse-embed-compute.ts`, `pulse-embed-constants.ts`.
- **Live:** `live/event-stats.ts`, `live-event-completion.ts`, `live-event-copy.ts`, `live-event-default-durations.ts`, `live-event-emails.ts`, `live-event-leaderboard-server.ts`, `live-event-title.ts`, `live-event-types.ts`, `live-fund-leading-cause.ts`, `live-market-duration.ts`.
- **Locations:** `locations/categories.ts`, `locations/conscious-values.ts`, `locations/create-voting-market.ts`, `locations/geo.ts`, `locations/image-url.ts`, `locations/recalculate-score.ts`.
- **Sponsor:** `sponsor-account-access.ts`, `sponsor-dashboard-build.ts`, `sponsor-tiers.ts`.
- **AI agents:** `agents/config.ts` (model selection, JSON parsing, run logging, cost estimation), `ceo-digest.ts`, `content-creator.ts`, `news-monitor.ts`, `inbox-curator.ts`, `sponsor-report.ts`, `intelligence-bridge.ts`, `sources-config.ts`, `fetchers/{rss,social}-fetcher.ts`.
- **Anonymous:** `anon-vote-tracker.ts`, `guest-vote-storage.ts`.
- **Email:** `resend.ts`, `email-simple.ts`, `email-unsubscribe.ts`, `crowd-newsletter-cron.ts`, `emails/` (templates).
- **Ops:** `cron-health.ts`, `monitoring.ts`, `monitoring-simple.ts`, `error-tracking.ts`, `rate-limit.ts`, `storage.ts`, `storage-debug.ts`.

### 6.5 Hooks
| Hook | Purpose |
|------|---------|
| `useLiveEvent` | Subscribe to event status / counters in realtime |
| `useLiveLeaderboard` | Realtime per-event leaderboard |
| `useLiveMarkets` | Tally micro-market votes via Supabase realtime |
| `useLiveNavBadge` | Header badge for ongoing live event |
| `usePulseNavBadge` | Header badge for active Pulse |
| `usePresence` | Viewer count via Supabase presence |
| `useUserTier` | Derived tier + progress from `user_xp` |
| `useMediaQuery` | Tailwind-aware breakpoint hook |

### 6.6 Component organization (selected highlights)
- `components/locations/` — 9 files including `LocationCard`, `LocationDetailClient`, `LocationsMap`, `NearestToAztecaSection`, `ValueBadge`.
- `components/pulse/` — 13 files: hero, hero card, pricing section, listing, outcome bars, confidence histogram, vote timeline, checkout modal, result client, case study card, Mundial pack card, CSV export.
- `components/sponsor/` — 7 files: dashboard client, market card, onboarding banner, share client, report print, create-pulse form, types.
- `components/live/` — 17 files: voting panel, viewer count, leaderboard, comments, micro-market card, fund impact ticker, countdown, stream embed, browser, alias entry, connection banner, admin controls, create-event panel, event card, duration field, product sections, index barrel.
- `components/fund/` — `FundThermometer`, `TransparencyDashboard`.
- `components/anon/` — `AnonymousSoftGate`, `AnonymousVoteToast`, `ConversionCelebration`.
- `components/gamification/` — Tier system, XP visuals, celebration modals.

---

## 7. Vercel cron schedule (authoritative — `vercel.json`)

| Path | Schedule (UTC) | Purpose | Notes |
|------|---------------|---------|-------|
| `/api/cron/agents/news-monitor` | `0 14 * * *` | Daily news ingestion | Feeds digest + sponsor outreach |
| `/api/cron/agents/inbox-curator` | `5 14 * * 1` | Weekly inbox curation | Was daily; now Mondays |
| `/api/cron/newsletter` | `0 14 * * 1,3,5` | Mon/Wed/Fri newsletter | Cooldown checks in lib |
| `/api/cron/agents/content-creator` | `30 14 * * 1,3,5` | Mon/Wed/Fri content | Aligns with newsletter cadence |
| `/api/cron/agents/ceo-digest` | `0 16 * * 1` | Weekly CEO digest | Was daily; now Mondays |
| `/api/cron/reengagement-inactive` | `0 16 * * 1` | Weekly re-engagement | Same Monday slot — verify |
| `/api/cron/live-reminders` | `*/10 * * * *` | Every 10 min | Mundial-ready cadence |
| `/api/cron/live-auto-end` | `*/5 * * * *` | Every 5 min | Mundial-ready cadence |
| `/api/cron/pulse-auto-resolve` | `5 * * * *` | Hourly :05 | Pulse auto-resolution |
| `/api/cron/agents/sponsor-report` | `0 9 1 * *` | Monthly 1st 09:00 | Sponsor impact email |
| `/api/cron/monthly-impact` | `0 10 1 * *` | Monthly 1st 10:00 | Now scheduled (was missing) |
| `/api/cron/archive` | `0 6 * * *` | Daily 06:00 | Archives stale markets/inbox |

`functions` block also contains a `daily-market-digest` route under `/api/cron/daily-market-digest` whose schedule is **not** in `crons` — confirm whether it's run externally.

`maxDuration` budgets: 300s for agents + newsletter + admin runner; 120s for live + monthly-impact + pulse-auto-resolve + reengagement; 30s default for everything else.

---

## 8. Database

### 8.1 Schema breadth (64 numbered migrations, 126 → 203)
Major domains:

| Domain | Representative tables |
|--------|------------------------|
| Predictions core | `prediction_markets`, `market_outcomes`, `market_votes`, `market_comments`, `prediction_market_history`, `prediction_positions`, `prediction_trades`, `prediction_wallets`, `xp_transactions` |
| Multi-outcome + free-to-play | introduced in `126_market_overhaul.sql` with confidence (1–10) + `xp_earned` per vote |
| Anonymous voting | `anonymous_participants`, `guest_market_votes` (147), alias system (158), live anonymous votes (156), inclusion of probability in anon votes (161), location-aware anonymous votes (190) |
| Translations | `prediction_markets.translations`, `market_outcomes.translations`, `live_events.translations`, `market translations` (139) |
| Categories | World Cup categories (127); Pulse + geopolitics (164) |
| Conscious Fund | `conscious_fund`, `fund_causes`, `fund_votes`, `conscious_fund_founder_seed` (191), public read RLS (198) |
| Conscious Inbox | `conscious_inbox`, `inbox_votes` (133); link & nullable user (188, 189); location nominations |
| Conscious Locations | `conscious_locations` (186), category expansion (187), coords (199), market alias votes (190) |
| Conscious Live | `live_events`, `live_event_types` (166), `live_comments` (167), `live_anonymous_votes` (156), durations (179), cleanup (200), auctions (201, 202), archive (203), ended_at (169) |
| Conscious Pulse | `prediction_markets.is_pulse` etc. (157), backfill (162), pulse-auto-resolve guard (184), CDMX cover image (176) |
| Coupons | `coupon_codes` (165), piloto coupon (192) |
| Sponsorship | `sponsorships` (140), report token (142), `sponsor_accounts` (159), tier limits (185), sponsor logos bucket (132), URL/type (129), logging (155), sponsor_outreach agent content (193) |
| Blog | `blog_posts` (168), comments (171), Pulse embeds (180), Galton example (172, 173), Club Reset case study (194), cover image (174, 175) |
| Newsletter & email | `newsletter_subscribers` (177), `email_digest_log` (149, 170), email prefs + types (146) |
| Notifications | `notifications` (134), `link` column (143) |
| Gamification | `user_xp`, `user_stats`, `user_achievements`; XP for anonymous resolution (169), multi-outcome contrarian XP (145), constraints fix (130) |
| Operations | `agent_runs` (135), `agent_content` (141, 193, 194), `cron_job_runs` (150), `share_events` (197), Mundial perf indexes (196), prestaged Mundial markets (195) |
| Architectural fixes | RLS without `auth.users` (136), public reads for fund_causes (137), public sentiment read (138), trigger recursion fix (131), search-path / oauth handlers (163), anonymous resolution XP (169) |

### 8.2 Architectural patterns
- **RLS** on user-facing tables; **SECURITY DEFINER** functions for sensitive ops (votes, wallets, XP).
- **Triggers** for `updated_at`, XP awards, leaderboard ranks, inbox upvote counters.
- **Soft-delete via `archived_at`** standardized across markets, inbox, agent_content, blog, and now `live_events` (203).
- **Public-read carve-outs** added when RLS blocked anon SSR (`fund_causes`, `prediction_markets`, `conscious_fund`).
- **Mundial perf** — `196_mundial_perf_indexes.sql` adds focused indexes (active markets by status / category / created_at; market_votes timeline; anonymous participants conversion; conscious_locations market join) + `ANALYZE`.

### 8.3 Known DB-adjacent risks (carry-over)
- `function_search_path_mutable` Postgres warnings; harden each `SECURITY DEFINER` function with `SET search_path = ''`.
- Supabase Auth: leaked-password protection currently disabled (UX trade-off; revisit).
- Some agent_content rows are large JSONB blobs; consider TTL + archival.

---

## 9. AI agents

| Agent | Trigger | Model | Output |
|-------|---------|-------|--------|
| `news-monitor` | Daily 14:00 UTC | Haiku 4.5 | Signals into `agent_content` with type `news_summary`, sentiment_report, signals; feeds CEO digest + sponsor outreach |
| `content-creator` | Mon/Wed/Fri 14:30 UTC | Sonnet 4.5 | Blog drafts, social posts, image prompts, related-market embeds |
| `ceo-digest` | Mon 16:00 UTC | Sonnet 4.5 | Executive digest summarized in `agent_content` (consumed by founder + admin UI) |
| `inbox-curator` | Mon 14:05 UTC | Haiku 4.5 | Curates pending submissions; falls back to nomination counts when empty |
| `sponsor-report` | Monthly 1st 09:00 UTC | Haiku 4.5 | Sponsor impact summary + email |

All agents log to `agent_runs` (`status`, `duration_ms`, `tokens_input`, `tokens_output`, `cost_estimate`, `summary`, `error_message`). Cost estimation is built into `logAgentRun()`.

Manual runner: `POST /api/predictions/admin/run-agent` accepts all five names (sponsor-report no longer missing).

Test/health: `GET /api/predictions/admin/test-agent`, `/api/test-anthropic`.

---

## 10. Stripe & payments

- **Webhook router:** Single `app/api/webhooks/stripe/route.ts` verifies signature, dispatches by `event.type` (currently `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`).
- **Checkout dispatch:** session metadata drives routing (`product_type` = `pulse | pulse_addon | market_sponsor`; `type` = `market_sponsorship | module_purchase | treasury_donation`; or generic `sponsorshipId`).
- **Handlers:** `module-purchase`, `sponsorship`, `market-sponsorship`, `pulse-purchase`, `pulse-addon`, `market-sponsor-account`, `treasury-donation`, `payment-verification`.
- **Logging:** Stripe logs noisy at INFO level; remove `console.log` once Sentry is wired.
- **Failure modes covered:** Missing signature, signature verification failure, processing error → 5xx so Stripe retries.

---

## 11. Observability & QA

- **Run logs:** `agent_runs`, `cron_job_runs`, `share_events`.
- **Email:** `email_digest_log` (with RLS, 170).
- **Error-tracking:** `lib/error-tracking.ts` shim. Sentry wiring deferred (`PERFORMANCE-NOTES`).
- **Performance:** Caching headers added on `/api/markets`, `/api/locations`, `/api/fund/balance`, `/api/pulse/mundial-spots`, `/api/case-studies/club-reset`. Mundial indexes shipped in 196.
- **CI:** No `.github/workflows`; relies on Vercel build feedback + manual QA. Adding `typecheck + lint + build` GitHub Action is the cheapest insurance pre-Mundial.
- **Load testing:** Targets documented in `PERFORMANCE-NOTES`; suggested k6 script not yet authored.

---

## 12. Security posture

- HTTP headers locked at edge (`X-Frame-Options: DENY`, etc.).
- Layout-level auth + admin gates; service-role admin client kept server-side; never imported into client bundles.
- Sponsor token URLs rely on long, opaque tokens (treat as secrets in support comms).
- No CSRF middleware in place — Next App Router server actions handle this implicitly via cookie semantics; verify each `POST` route validates session.
- RLS is the de facto authorization layer. Verify each new table's policies before exposing to anon.
- Stripe webhook signature verification is enforced.
- Supabase Auth: leaked-password protection disabled (per APP-CONTEXT). Re-enable when password UX is acceptable.
- Postgres `function_search_path_mutable` warnings remain.

---

## 13. Strengths to preserve

1. **Modular cron + agent architecture** with shared logging + cost estimation.
2. **Migration discipline** — 64 numbered migrations form a clean linear history; each one is small enough to audit.
3. **Anonymous-first vote loop** is now first-class across both Predictions and Locations.
4. **Sponsor token dashboard** decouples B2B clients from auth onboarding — high-conversion product surface.
5. **Pulse productization** — pricing page, Mundial Pack, case study, Pilot SKU, AI sales loop. Engineering already supports the sales motion.
6. **Operational standardization on `archived_at`** simplifies admin maintenance.
7. **i18n + accessible touch targets baked in** to most new components.

---

## 14. Gaps, risks & debt

| Issue | Severity | Source | Action |
|-------|----------|--------|--------|
| Repository root SQL/MD sprawl | Medium | repo root | Move to `docs/archives/pre-mundial/` or delete |
| Duplicate `next.config.js` + `next.config.ts` | Low | repo root | Delete `.js` |
| `chart.js` + `recharts` duplication | Low | bundle | Migrate `IntelligenceClient` to recharts |
| Disabled Subscribe button | Medium | `NewsletterForm` | Wire handler or hide |
| Mixed-locale chrome on landing/footer | Medium | landing nav/footer | Single locale per page |
| Dead landing components still present | Low | `app/components/landing/` | Delete (PERFORMANCE-NOTES list) |
| `cron_job_runs` not surfaced in UI | Medium | `/api/admin/cron-health` | Build a tiny admin tile |
| No CI workflow | Medium | repo | Add typecheck + lint + build action |
| Sentry not wired | Medium | `lib/error-tracking.ts` | `npx @sentry/wizard@latest -i nextjs` pre-Mundial |
| Postgres `search_path` warnings | Low–Medium | Supabase linter | Harden each SECURITY DEFINER fn |
| Fund balance still small / public | High | `conscious_fund` | Founder seed + visible thermometer ✓; needs first paying sponsor inflow narrative |
| 0 inbox submissions | Medium | product | Add a homepage "Sugiere un mercado" CTA + onboard share |
| Inbox-curator runs weekly only | Low | `vercel.json` | Acceptable now; revisit if submissions spike |
| Auth race (`getCurrentUser` self-heal) | Low | `lib/auth-server.ts` | Add a metric + alert if fallback fires often |
| `/api/cron/daily-market-digest` exists but unscheduled | Low | crons array | Confirm intent — schedule or remove |
| Email "leaked password" Supabase warning | Low | Auth | Re-enable when password UX allows |

---

## 15. Recommendations & ideal next steps

### 15.1 This week (Mundial readiness sprint — 53 days out)
1. **Delete dead landing components** + `next.config.js` + obsolete root SQL — 1 PR, immediate hygiene win.
2. **Final locale QA** — Pick Spanish-first for the public chrome (nav, footer, newsletter), English mirrored 1:1. Fix the Subscribe button or hide it.
3. **Consolidate primary nav** to 5 items: `Predicciones · Lugares · Pulse · Fondo · Acerca`. Move Leaderboard inside Predicciones; Contact to footer.
4. **Add `/admin/cron-health` tile** that queries `cron_job_runs` (admin endpoint already exists). 30-minute build, prevents silent cron drift on match days.
5. **Wire `/api/cron/daily-market-digest`** if it's intended to ship; otherwise delete the route.
6. **Add a minimal GitHub Action** (`pnpm typecheck && pnpm lint && pnpm build`). Free insurance pre-Mundial.
7. **Run `news-monitor` + `content-creator` against the 10 pre-staged Mundial markets** so social posts queue up for May.

### 15.2 Next 2 weeks (Wedge weaponization)
8. **Pulse case-study expansion** — Mirror Club Reset for one alcaldía + one cerveza brand, even if pilot. Each case study is a sales asset and a landing page.
9. **Locations push to 25 in CDMX** — Outreach via Instagram for top 7 candidates; each location card is reusable acquisition surface.
10. **Sponsor outreach automation** — One-page sponsor brief generated by `ceo-digest` → email or Slack channel daily. The signals are already in `agent_content`; the missing piece is a recipient.
11. **Inbox CTA on landing + Locations** — A single "Sugiere un mercado" tile with one-click anonymous submission revives the dormant inbox loop.
12. **Conscious Fund visible everywhere** — Add the thermometer to the global header (compact variant) so the live MXN number follows users through the site.

### 15.3 Pre-Mundial (4–6 weeks out)
13. **Sentry wiring** before May 15 so match-day failures surface in real time.
14. **k6 load test** at 10× current DAU against `/api/markets`, `/api/locations`, `/api/fund/balance`, `/predictions/markets` (verify Mundial perf indexes hold).
15. **Bundle slim** — Migrate `IntelligenceClient` to recharts; drop `chart.js`. Audit dynamic imports on the dashboard.
16. **Live-event dry run** during Mexico's first Mundial match — script the `live-auto-end` + reminders + leaderboard end-to-end on a low-stakes event.
17. **Postgres hardening** — `SET search_path = ''` on each SECURITY DEFINER function; re-enable Supabase leaked-password protection.

### 15.4 Post-Mundial (deferred but track)
18. **Corporate / employee learning** — Reactivate the marketing surface; the codebase is mature enough to monetize once predictions revenue stabilizes.
19. **Bundle a "Crowd Conscious for media" SKU** — Pulse Pack + branded case study for podcasters / YouTubers. Inventory exists.
20. **Move documentation into `docs/`** as the only source of truth (delete root-level `*.md` once mirrored).
21. **Public roadmap page** — `/roadmap` rendered from a small markdown file. Trust + recruiting magnet.

---

## 16. Quick-reference truth map

| Topic | Source of truth |
|-------|------------------|
| Cron schedules | `vercel.json` |
| Database schema | `supabase/migrations/*.sql` |
| Generated types | `types/database.ts` |
| Product narrative | `docs/APP-CONTEXT-AND-DESCRIPTION.md` |
| Strategic frame | `docs/REFINED-STRATEGY-2026-04-16.md` |
| Prior audit | `docs/PLATFORM-FULL-AUDIT-2026-04-16.md` |
| Performance pass | `docs/PERFORMANCE-NOTES-2026-04-16.md` |
| Agent code | `lib/agents/*.ts` |
| Stripe routing | `app/api/webhooks/stripe/route.ts` + `handlers/*` |
| Auth helper | `lib/auth-server.ts` |
| Auth gating model | `(app)/layout.tsx`, `(predictions)/layout.tsx` |
| Public landing data | `app/page.tsx` |
| Locations SSR | `app/locations/page.tsx` (admin client used intentionally) |

---

## 17. One-paragraph summary

Crowd Conscious is now a coherent, multi-surface platform — Predictions (free-to-play core + anonymous-first conversion), Locations (the validated acquisition wedge), Pulse (the productized B2B revenue engine with Mundial-specific SKUs), Live (Mundial-ready realtime), Fund (visibly thermometered with a founder seed), Inbox (built but dormant), and a deferred Corporate learning suite. The engineering, schema, agents, and crons are healthy; what remains for the next 53 days is **distribution and last-mile UX**: collapse the top nav to five locale-consistent items, kill the disabled Subscribe button and dead components, ship the `cron_job_runs` admin tile, wire Sentry, run the news-monitor against the 10 pre-staged Mundial markets, and convert the daily CEO digest into a one-page sponsor outreach loop. Everything else listed in §15 can wait until after the first Pulse client lands.
