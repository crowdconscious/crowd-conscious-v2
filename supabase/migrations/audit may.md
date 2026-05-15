Crowd Conscious v2 — End-to-end platform audit
Codebase root: /Users/franciscoblockstrand/Desktop/crowd-conscious-v2
Scope: Read-only scan of app/, app/api/, components/, lib/, supabase/migrations/, sql-migrations/, scripts/, .deprecated/, docs/archives/, key docs (README.md, CLAUDE.md, CHANGELOG.md), package.json, next.config.ts, vercel.json, middleware.ts, types/database.ts, src/app/globals.css.

1. Repository map
1.1 Top-level structure
Area	Path	Role
App Router
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/
Routes: public (/pulse, /para-marcas, /blog, /live, auth pages), authenticated (predictions) shell, (app) user area (/dashboard, /profile, …), /admin/*, /corporate/*, /employee-portal/*, /dashboard/sponsor/[token], APIs under app/api/
Reusable UI
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/components/ (~226 .tsx/.ts files in tree)
Pulse, sponsor, live, locations, blog, UI primitives, gamification
Landing-specific
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/components/landing/
Hero, nav, sections
Libraries
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/
Supabase clients, agents, Stripe/webhooks helpers, email, i18n copy, pulses, cron health, rate limit
Supabase (canonical migrations)
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/supabase/migrations/
Numbered migrations 126–218 (applied ordering in filename)
Legacy / one-off SQL
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/sql-migrations/
~141 historical/editor scripts; not the single source of truth vs supabase/migrations/
Scripts
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/scripts/
Seeds, corp module import, cleanup-legacy-tables.sql, tests
Retired code
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/.deprecated/
Text backups + READMEs (agents, old B2B routes, legacy UI snippets)
Docs archive
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/docs/archives/
Large historical audit/fix SQL/md (ESG, gamification, pre-mundial, etc.)
Global CSS / Tailwind entry
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/src/app/globals.css
Tokens + controversial global light-mode forcing
Types
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/types/database.ts
Hand-maintained DB types (incomplete vs live schema — see §4)
Locales JSON
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/locales/
en.json, es.json (paired with i18n.ts)
i18n (next-intl config only)
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/i18n.ts
No app usage of next-intl hooks found
archive/: There is no top-level archive/ folder named exactly that; archival content lives under /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/docs/archives/ (~300 files) and /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/.deprecated/ (13 files).

1.2 Tech stack snapshot
Layer	Technologies
Framework
Next.js 15.5.7, App Router, React 19, TypeScript
Styling
Tailwind CSS 3.4; design tokens in globals.css; tailwind-merge, clsx, class-variance-authority
Data
Supabase (@supabase/ssr, @supabase/supabase-js)
Payments
Stripe (stripe, @stripe/react-stripe-js, @stripe/stripe-js)
Email
Resend (resend), React Email packages
AI
Anthropic SDK (lib/agents/*)
i18n (actual)
contexts/LanguageContext, cookie preferred-language, lib/i18n/*.ts, LanguageSwitcher*
i18n (declared in README / package)
next-intl in package.json + i18n.ts — unused in TS/TSX imports
Animations / charts
framer-motion, Chart.js / react-chartjs-2, Recharts
Hosting / analytics
Vercel Analytics, Speed Insights (vercel.json crons & headers)
Rate limiting (partial)
@upstash/ratelimit, @upstash/redis via /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/rate-limit.ts; used on a subset of routes (§4)
Validation
Zod (^4.x) — spot usage in APIs (not audited route-by-route)
Observability
Console logging; /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/error-tracking.ts is Sentry stubs
1.3 Counts
Metric	Count	Source
page.tsx under app/
115
glob
route.ts under app/api/
199
glob
SQL files in supabase/migrations/
92
glob
SQL-related files in sql-migrations/
141
glob
public/ static assets (repo)
10 files (mostly SVG/scripts)
glob — logos/images likely CDN or /images/ outside this listing
DB tables reflected in types/database.ts Tables
27 typed tables (through sentiment_scores)
types/database.ts
DB tables implied by numbered migrations
Many more (conscious_inbox, sponsor_pulse_reports, sponsorships, fund_causes, agent_runs, notifications, …) — absent from database.ts
sample: grep CREATE TABLE supabase/migrations
2. Dead / legacy / high-risk cruft (Pulse-first pivot)
Philosophy in-repo: Pulses live in prediction_markets with is_pulse; non-pulse rows stay under /predictions/markets/[id] (see README.md, CLAUDE.md). Anything that duplicate consumer surfaces, keeps prediction-market/trading metaphors, or maintains parallel corporate LMS stacks is friction.

2.1 Routing & pages
Item	Paths	What it does	Why legacy / problematic	Recommendation
Public “markets” page
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(public)/markets/page.tsx + PublicMarketsClient.tsx
SEO + listing “Mercados de Predicción”
next.config.ts permanently redirects /markets → /pulse — this page is unreachable on production canonical URL
DELETE or replace with thin redirect stub if you fear direct file references; consolidate on /pulse
Prediction naming in nav shell
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(predictions)/predictions/PredictionsShell.tsx
Sidebar: “Mercados”, “Mis votos” → /predictions/trades, etc.
Pulse-first UX still labeled as prediction/market dashboard
KEEP-BUT-HIDE / RENAME: align copy with Pulse; consider folding “markets” into “Pulse hub” inside shell
“Trades” page (actually vote history)
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(predictions)/predictions/trades/page.tsx
English “My Predictions”, “Prediction history”
Naming is leftover market/trade product; sidebar calls it “Mis votos” in ES
RENAME copy + route (/predictions/my-votes) or merge into profile
Admin manual resolve UI
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(predictions)/predictions/admin/resolve/page.tsx + /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/predictions/admin/resolve/route.ts + markets-to-resolve
Operator resolves markets
Pulses auto-resolve via /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/cron/pulse-auto-resolve/route.ts (is_pulse=true). Manual flow still matters for is_pulse=false
KEEP for legacy markets; demote UI (“Legacy market resolution”) or hide if is_pulse share → 100%
Duplicate admin locations
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/admin/locations/* and /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(predictions)/predictions/admin/locations/*
Two admin surfaces
Operational confusion
MERGE to one namespace
Corporate + employee LMS
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/corporate/*, /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/employee-portal/*, /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/employee-portal-public/*, /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/signup-corporate/page.tsx, /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/concientizaciones/page.tsx
ESG/training certs, invites (lib/resend.ts mentions accept-invitation URLs)
Orthogonal product to Conscious Pulses; competes for nav, SEO, admin (AdminDashboardClient “corporate” tab)
Business decision: if deprioritized → KEEP-BUT-HIDE behind feature flag OR ARCHIVE + strip from main IA
Sponsor report using trades
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(public)/sponsor/report/[id]/page.tsx
Queries prediction_trades
Pulse engagement is market_votes, not trade ledger
REFACTOR metric source or DELETE page if sponsor analytics moved to token dashboard
2.2 Components / APIs orphaned or misleading
Item	Paths	Notes	Recommendation
TradeModal / TradePanel
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(predictions)/predictions/components/TradeModal.tsx, TradePanel.tsx
rg shows no imports outside themselves; only legacy doc mention
DELETE or wire explicitly if wallet trading returns
Prediction trade API
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/predictions/trade/route.ts
Rate-limited; part of binary trade model
If product is Pulse-only voting: KEEP-BUT-HIDE or guard behind is_pulse=false markets only
Wallet API
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/predictions/wallet/route.ts
Same
Same
Pulse vs duplicate listing
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/pulse/page.tsx vs /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(predictions)/predictions/pulse/page.tsx
Intentional mirror (public vs shell — comment in /pulse/page.tsx)
KEEP — document clearly for contributors
2.3 Data model / terminology
Item	Paths / tables	Why legacy	Recommendation
prediction_trades, prediction_positions, prediction_wallets, prediction_deposits
Typed in /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/types/database.ts
Classic AMM/trading layer
KEEP until DB emptied; stop surfacing in nav if unused
prediction_market_history volume fields
Same types file
24h volume / trade semantics
Pulse analytics should prefer votes + confidence
Cron daily-market-digest, gamification-heavy paths
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/cron/daily-market-digest/route.ts (exists in API tree)
May push “market” framing
Audit copy + eligibility for pulse-only audience
2.4 SQL migrations hygiene
Item	Paths	Risk	Recommendation
Two migration trees
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/supabase/migrations/ vs /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/sql-migrations/
Drift: 141 ad-hoc scripts vs 92 numbered
DOCUMENT canonical path (Supabase migrations only); sql-migrations/ → archive read-only docs or merge
Scripted cleanup never run automatically
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/scripts/cleanup-legacy-tables.sql
Drops old community-era tables — explicitly “review before running”
KEEP as ops doc; never ship to CI
2.5 Dependencies / config drift
Item	Evidence	Recommendation
next-intl unused
Zero from 'next-intl' in codebase; routing not plugin-wrapped
REMOVE dependency OR actually wire (pick one)
@upstash/* partly used
lib/rate-limit.ts + few routes (grep §4); most vote/checkout routes unchecked
Extend rate limits to /api/predictions/vote, Stripe callbacks abuse surface, anon endpoints
2.6 Metadata / branding contradictions
Item	Path	Issue
Root layout SEO
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/layout.tsx
Still describes “Free-to-play prediction markets” — conflicts with Pulse-first CHANGELOG.md / CLAUDE.md
Sponsor success share copy
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(public)/sponsor/success/page.tsx
Fallback mentions “prediction market”
3. UX audit by persona (files referenced)
3a. End user (citizen)
Intended journey: Landing (/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/page.tsx) → /pulse (/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/pulse/page.tsx + /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/pulse/layout.tsx wraps LandingNav) → /pulse/[id] (/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/pulse/[id]/page.tsx, client PulseResultClient etc.) → optional signup (/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(public)/signup/page.tsx, /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(public)/login/page.tsx) → deeper engagement via /predictions shell (/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(predictions)/predictions/layout.tsx, PredictionsShell.tsx) → notifications (/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(app)/notifications/page.tsx vs duplicate /predictions/notifications), profile (/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(app)/profile/page.tsx, ProfileClient.tsx).

Gaps / friction

Copy & mental model: Logged-in shell still says Predictions/Mercados/Trades (PredictionsShell.tsx, DashboardNavigation.tsx with emoji-heavy buttons inconsistent with Pulse brand).
Duplicate notification entry points: Notifications under (app) and under /predictions/notifications — risk of divergence.
Accessibility: Mixed patterns: Landing nav documents aria-label for live badge (LandingNav.tsx); Elsewhere emoji used as lone button content (DashboardNavigation.tsx) — weak for SR users.
Mobile: Predictions sidebar hidden on mobile (pattern in PredictionsShell.tsx) — verify hamburger coverage for primary tasks (pulse list is public /pulse).
Empty / error: /pulse uses PulseListingView — quality of empty states not fully verified without runtime; ensure explicit “no pulses” + CTA for brands linking /para-marcas.
Visual polish conflict: /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/src/app/globals.css forces global light backgrounds with !important on :root, body, universal * while Pulse pages explicitly use bg-[#0f1419] (/pulse/page.tsx). Can cause flashes, scrollbar, form control theming clashes (partially mitigated by html.dark rules later in same file).
3b. Sponsor (brand)
Journey: Marketing /para-marcas (/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/para-marcas/page.tsx, layout, pilot/welcome pages) → Stripe checkout (/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/pulse/checkout/route.ts, /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/sponsor/checkout/route.ts, webhook handlers under /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/webhooks/stripe/handlers/*.ts) → private dashboard /dashboard/sponsor/[token] (/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(public)/dashboard/sponsor/[token]/page.tsx, components/sponsor/SponsorDashboardClient.tsx) → create pulse (/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(public)/dashboard/sponsor/[token]/create-pulse/page.tsx, components/sponsor/CreatePulseForm.tsx) → report /report/[marketId] + PDF/regenerate APIs.

Strengths

Dashboard server page uses createAdminClient with token lookup — workable “magic link” model.
Narrative sponsor reports wired in cron (pulse-auto-resolve → generateSponsorReportAndMaybeEmail).
Gaps

Invalid token UX: Minimal centered copy only (page.tsx) — no recovery link, support contact, or locale switch.
Language consistency: Mix of Spanish default strings vs English in some sponsor surfaces (audit lib/i18n/sponsor-dashboard.ts, sponsor-page-copy.ts).
Billing clarity: Stripe split across multiple handlers (pulse-purchase, pulse-addon, market-sponsorship, sponsor-upgrade, etc.) — sponsor UX may feel fragmented.
(public) route group name for sponsor dashboard — not SEO-private pattern issue; relies on secret token URLs (acceptable if tokens are crypto-strong).
3c. Admin (platform operator)
Surfaces

Dedicated /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/admin/page.tsx (gate: profiles.user_type === 'admin' only).
Embedded admin inside predictions: blog, agents, inbox, sponsors, pulse markets APIs under /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/predictions/admin/*.
Issues

Dual admin privilege models: Many routes accept profiles.user_type === 'admin' OR email match ADMIN_EMAIL (grep hits: pulse/[id]/page.tsx, (predictions)/predictions/layout.tsx, api/predictions/admin/markets/[id]/route.ts, etc.). /admin/page.tsx does not mention ADMIN_EMAIL — inconsistent superuser story.
Navigation discoverability: Heavy tooling under /predictions/admin/*; separate /admin dashboard mixes corporate/wallets tabs (AdminDashboardClient.tsx) diluting Pulse operations focus.
Resolve markets UI (admin/resolve/page.tsx) overlaps conceptually with automatic pulse resolution — operator education needed.
4. Backend / code health audit
4.1 API consistency, validation, auth
Stripe webhook: /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/webhooks/stripe/route.ts — signature verification via constructEvent (good); verbose console logs including partial signature (noise / minor hygiene concern); uses (supabase as any) heavily in handlers.
Cron auth: Example /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/cron/pulse-auto-resolve/route.ts — Bearer CRON_SECRET check (good pattern).
Admin API checks: Mixed strict user_type === 'admin' vs ADMIN_EMAIL OR pattern — harmonize policy.
Zod: Present in dependencies; blanket statement: apply consistently on public write endpoints (vote, create-pulse, webhooks payloads where applicable).
4.2 Supabase — RLS (sample)
Evidence from migrations: RLS enabled on prediction_markets, live_events, blog_posts, conscious_locations, sponsor_pulse_reports, share_events, notifications, conscious_inbox, coupon_codes, auctions, etc. (policies grep in §search).

Concern: Conscious inbox historically had world-readable SELECT (“Anyone can read inbox”) — reconfirm this matches current privacy stance (supabase/migrations/133_conscious_inbox.sql pattern).

sponsor dashboard bypasses RLS intentionally via createAdminClient — acceptable if tokens are secrets; ensure token rotation + audit.

4.3 Type safety
types/database.ts is stale: Missing newer tables referenced in TS code (conscious_inbox, sponsorships, sponsor_pulse_reports, agent_runs, notifications, fund_causes, user_stats, share_events, newsletter_subscribers, etc.). Leads to (supabase as any) sprawl (webhooks/stripe/handlers/*, upload-logo/route.ts).
any in UI: /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(app)/profile/ProfileClient.tsx, HeaderClient.tsx — user: any, profile: any.
4.4 Performance & caching
next.config.ts: experimental.staleTimes dynamic 0, static 180 — dynamic pages aggressively uncached at framework level (good for dashboard freshness).
/pulse uses server data fetch helpers (lib/pulse/pulse-listing-data.ts) — watch N+1 if listing grows; pagination strategy should be validated in PulseListingView.
Bundle size: Heavy chart/animation libs — ensure dynamic imports where possible (already used in several pages).
4.5 Security checklist
Topic	Finding
Webhook signatures
✅ Verified in webhooks/stripe/route.ts
Rate limiting
⚠ Spotty — lib/rate-limit.ts used on trade/wallet/newsletter/etc., not evidently on vote flood endpoints
Env exposure
⚠ Stripe webhook logs hasWebhookSecret; avoid logging secrets in production
Middleware
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/middleware.ts — does not gate auth except headers; /predictions explicitly “no gate” per comments — aligns with anon voting model but increases abuse surface
4.6 Observability
/Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/error-tracking.ts — TODO Sentry placeholders.
Middleware logs slow /api/ >3s (middleware.ts).
Vercel Analytics / Speed Insights in root layout (app/layout.tsx).
5. Visual / design system audit
Tokens: /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/src/app/globals.css defines --cc-* dark-theme variables and richer neutral scales but overrides everything to light-first globally (* + :root + body blocks). Comment at line ~113 acknowledges predictions shell restores dark scheme via html.dark / data-theme=dark — reliance on markup toggles is brittle.

Inconsistency hotspots

Pattern	Locations	Issue
Button systems
components/ui/UIComponents.tsx (AnimatedButton) vs raw Tailwind buttons across sponsor/pulse/live
Divergent hover/spacing states
Nav chrome
Dark LandingNav vs #ffffff-forced globals
Potential FOUC/theming mismatches
Emoji in nav
DashboardNavigation.tsx, NewEnhancedDashboard.tsx snippet from grep
Not brand-grade for sponsor-facing polish
Cards
Sponsor dashboard vs Pulse cards (components/pulse/* vs components/sponsor/*)
Harmonize radius, borders (border-[#2d3748] repeats — good baseline)
Mobile: Sponsor forms & pulse voting (VotePanel.tsx, CreatePulseForm.tsx) — audit long forms + keyboard traps; leaflet maps under locations add weight.

6. Prioritized strategy & cleanup plan
Horizon A — Now (this week)
Initiative	Effort	Impact	Personas
Remove or redirect dead (public)/markets page implementation
S
Med — clarity + less duplicate SEO logic
User
Update global metadata in app/layout.tsx → Pulse-first copy
S
High brand
All
Delete unused TradeModal.tsx / TradePanel.tsx after confirm
S
Low–Med code health
Dev
Regenerate or extend types/database.ts (Supabase CLI) → eliminate as any in Stripe handlers
M
High correctness
Sponsor, Admin
Strip or flag corporate/employee-portal from primary admin/overview if Pulse-only roadmap
M business
High clarity
Admin
Harmonize ADMIN_EMAIL vs user_type gates
S–M
High security ops
Admin
Horizon B — Next (2–4 weeks)
Initiative	Effort	Impact	Personas
Rename /predictions/trades + page copy → vote history
M
Med cognition
User
Consolidate duplicated notifications surfaces
M
Med
User
Merge duplicate admin locations trees
M
Med
Admin
Decide fate of trade/wallet APIs — deprecate publicly
M
Med
User/Dev
Global CSS refactor: drop universal * light overrides; theme via layout class only
L
High visuals
User, Sponsor
Horizon C — Later (1–3 months)
Initiative	Effort	Impact	Personas
DB migration renaming (optional): phase out prediction_* naming in types/docs only (CLAUDE.md forbids rename — revisit strategy)
L strategic
Medium
Tech
Sentry + structured logging dashboards
M
High reliability
Ops
Full next-intl adoption vs remove
L
Med tech debt
All
sql-migrations/ archival policy + deletion of hazardous scripts
M
Med DX
7. Concrete file-level action list
DELETE /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(public)/markets/page.tsx (and PublicMarketsClient.tsx if unused elsewhere) — /markets is 308 → /pulse in next.config.ts.
DELETE /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(predictions)/predictions/components/TradeModal.tsx and TradePanel.tsx — no importer found in codebase search.
UPDATE /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/layout.tsx — replace prediction-market-centric metadata, JSON-LD, keywords with Conscious Pulse positioning.
UPDATE /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(public)/sponsor/success/page.tsx — remove “prediction market” fallback wording.
FIX /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/types/database.ts — add missing tables (sponsor_pulse_reports, sponsorships, conscious_inbox, fund_causes, agent_runs, notifications, user_stats, share_events, newsletter_subscribers, …) or generate from Supabase CLI and commit.
REFACTOR /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/webhooks/stripe/handlers/*.ts — remove (supabase as any) once types fixed.
MERGE routing docs /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/admin/locations/ vs /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(predictions)/predictions/admin/locations/ — single admin UX.
RENAME strings /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(predictions)/predictions/trades/page.tsx — “My Predictions” → “My Pulses” / bilingual via LanguageContext or dedicated copy module.
ALIGN /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/admin/page.tsx admin check with ADMIN_EMAIL fallback if that remains policy — or codify rejection of email-based admin everywhere.
ADD rate limiting to /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/predictions/vote/route.ts (and anon vote equivalents) via lib/rate-limit.ts patterns.
REDUCE logs /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/api/webhooks/stripe/route.ts — avoid signature previews in prod.
package.json — next-intl: adopt in middleware.ts/app routing OR remove unused dependency i18n.ts shim.
THEME cleanup /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/src/app/globals.css — remove * { color-scheme: light !important } global override; scope light theme to explicitly light layouts only.
POLISH /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/components/DashboardNavigation.tsx — drop emoji reliance; align labels with Pulse vocabulary.
ARCHIVE posture /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/sql-migrations/ — mark read-only / move under docs/ to avoid accidental application vs supabase/migrations.
REFACTOR sponsor insight /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/app/(public)/sponsor/report/[id]/page.tsx — replace prediction_trades aggregates with market_votes / pulse metrics.
DEPRECATE internal navigation to /markets canonical (already redirected) inside any residual href="/markets" (search & replace).
OBSERVABILITY /Users/franciscoblockstrand/Desktop/crowd-conscious-v2/lib/error-tracking.ts — integrate Sentry or delete dead abstraction.
Executive summary: The repo is materially Pulse-forward (/pulse, cron pulse-auto-resolve, sponsor reports) but retains a prediction-market skeleton (prediction_* tables, trades/wallets, duplicated /markets page, conflicting global SEO/metadata) and a parallel corporate LMS subtree. Greatest engineering debt: stale types/database.ts, heavy any casts, split SQL migration universes, and CSS global light-mode overrides fighting the dark Pulse UI. Quick wins: delete unreachable public markets page + orphan trade components, refresh root metadata, regenerate DB types, and narrow admin/corporate surfaces to match the Pulse-only GTM.