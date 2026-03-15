# Crowd Conscious v2 — Comprehensive Application Audit

**Generated:** February 25, 2025

---

## Executive Summary

Crowd Conscious is a Next.js 15 application combining **prediction markets**, **conscious fund voting**, **gamification (XP/achievements)**, **corporate learning**, **sponsorship**, and **AI-generated content**. The stack is modern (React 19, Supabase, Stripe, Anthropic). Auth is layout-based; middleware does not enforce auth. Recent fixes address signup triggers, refresh token handling, and security linter issues.

---

## 1. STACK

### Framework & Core
| Item | Version |
|------|---------|
| **Next.js** | 15.5.7 |
| **React** | 19.1.2 |
| **Node** | ^20 |
| **TypeScript** | ^5 |

### Key Dependencies
| Package | Purpose |
|---------|---------|
| `@supabase/supabase-js` ^2.57.4 | Supabase client |
| `@supabase/ssr` ^0.7.0 | Server-side auth (cookies) |
| `stripe` ^18.5.0, `@stripe/stripe-js` ^7.9.0 | Payments |
| `@anthropic-ai/sdk` ^0.78.0 | AI agents (Claude) |
| `@upstash/ratelimit` ^2.0.7, `@upstash/redis` ^1.35.6 | Rate limiting |
| `next-intl` ^4.5.1 | i18n |
| `framer-motion` ^12.23.22 | Animations |
| `recharts` ^3.2.1 | Charts |
| `resend` ^6.1.0 | Email |
| `zod` ^4.1.11 | Validation |
| `date-fns` ^4.1.0 | Dates |
| `exceljs`, `jspdf`, `html2canvas` | Export/PDF |

### Config Files
- **package.json**: `/package.json`
- **next.config.js**: Monitoring env vars, API headers
- **vercel.json**: Crons, security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy), redirects (terms, privacy)
- **tailwind.config.js**: Primary teal (#14b8a6), secondary purple (#a855f7), darkMode: class

---

## 2. ENV VARIABLES

### No `.env.example` or `.env.local.example`
No env example files found. Variables inferred from code and docs.

### Required Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypass RLS (admin, cron, webhooks) |
| `NEXT_PUBLIC_APP_URL` | Base URL, Stripe success/cancel, email links |
| `STRIPE_SECRET_KEY` | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client Stripe |
| `RESEND_API_KEY` | Email sending |
| `FROM_EMAIL` | Sender address |
| `CRON_SECRET` | All `/api/cron/*` routes |
| `ANTHROPIC_API_KEY` | AI agents |
| `NEWSDATA_API_KEY` / `GNEWS_API_KEY` | News Monitor agent |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limiting |
| `PREDICTIONS_ACCESS_CODE` | Optional predictions gate |
| `ADMIN_EMAIL` | Admin notifications |
| `MONITORING_ENABLED`, `PAGE_LOAD_THRESHOLD`, `API_RESPONSE_THRESHOLD` | next.config monitoring |

### Recommendation
Create `.env.example` with all required variables (values redacted) for onboarding.

---

## 3. CODE ARCHITECTURE

### App Structure (Route Groups)
```
app/
├── (app)/           # Auth-required: dashboard, profile, leaderboard, achievements, settings
├── (public)/        # Public: login, signup, about, sponsor, markets, privacy, terms
├── (predictions)/   # Predictions feature (auth required)
├── corporate/       # Corporate dashboard (auth)
├── employee-portal/ # Employee learning (auth)
├── employee-portal-public/  # Accept invitation (no auth)
├── auth/callback/   # OAuth/magic link callback
└── api/             # API routes (117+)
```

### Lib Structure
```
lib/
├── supabase.ts, supabase-client.ts, supabase-server.ts, supabase-admin.ts
├── auth.ts (createClientAuth), auth-server.ts (createServerAuth, getCurrentUser, AuthSessionExpiredError)
├── stripe.ts, rate-limit.ts, resend.ts
├── design-system.ts   # CVA variants, cn(), colors, typography
├── agents/            # AI agents
│   ├── config.ts      # Anthropic client, logAgentRun, parseAgentJSON
│   ├── ceo-digest.ts, content-creator.ts, news-monitor.ts
│   ├── inbox-curator.ts, sponsor-report.ts
├── xp-system.ts, achievement-service.ts
├── fund-allocation.ts, probability-utils.ts
└── i18n/, validation-schemas.ts
```

### API Routes (117+)
- **Auth**: `/api/auth/callback`, `reset-password`, `ensure-profile`, `signout`
- **Predictions**: `/api/predictions/*` — markets, trade, wallet, fund, inbox, history, verify-code
- **Predictions Admin**: `/api/predictions/admin/*` — resolve, agents, create-market, inbox
- **Cron**: `/api/cron/agents/*` (ceo-digest, content-creator, news-monitor, inbox-curator, sponsor-report), `/api/cron/monthly-impact`
- **Corporate**: `/api/corporate/*` — invite, accept-invitation, progress, signup
- **Admin**: `/api/admin/*` — deletion-requests, modules, promo-codes, update-setting
- **Webhooks**: `/api/webhooks/stripe`
- **Other**: gamification, certificates, notifications, modules, reviews, etc.

---

## 4. UX & USER FLOWS

### Signup / Login
1. **Signup** (`/signup`): `supabase.auth.signUp` → email confirmation → `/auth/callback?code=...` → `/predictions`
2. **Login** (`/login`): `supabase.auth.signInWithPassword` → `/dashboard`
3. **Callback** (`/auth/callback`): `exchangeCodeForSession` → ensure-profile → redirect `/predictions`
4. **Ensure profile**: `/api/auth/ensure-profile` (POST) creates profile + user_stats if missing (trigger replacement)

### Main User Journeys
- **Landing** (`/`) → Sign up / Log in → Predictions dashboard
- **Predictions**: Dashboard → Markets → Trade → Wallet (Stripe deposit)
- **Conscious Fund**: `/predictions/fund` — vote on causes, view transactions
- **Leaderboard**: `/leaderboard` (app) and `/predictions/leaderboard`
- **Corporate**: Invite → Accept invitation → Employee portal → Courses → Certificates
- **Admin**: `/admin` — metrics, deletions, promo codes, markets, agents

### Key Pages (64 page.tsx files)
- Public: `/`, `/about`, `/login`, `/signup`, `/sponsor`, `/markets`, `/privacy`, `/terms`
- App: `/dashboard`, `/profile`, `/leaderboard`, `/achievements`, `/settings`
- Predictions: `/predictions`, `/predictions/markets`, `/predictions/wallet`, `/predictions/fund`, `/predictions/insights`
- Corporate: `/corporate/dashboard`, `/corporate/checkout`, `/employee-portal/*`
- Admin: `/admin`, `/admin/metrics`, `/admin/deletions`, `/predictions/admin/*`

---

## 5. UI

### Design System
- **File**: `lib/design-system.ts`
- **Tailwind**: Primary teal (#14b8a6), secondary purple (#a855f7), darkMode: class
- **CVA variants**: buttonVariants, cardVariants, badgeVariants, progressVariants, inputVariants, skeletonVariants
- **Animations**: fadeIn, slideUp, bounceIn

### UI Components
- `/app/components/ui/`: Button, Card, Badge, Progress, Skeleton, Toast, SwipeableTabs
- `/app/components/`: ShareButton, MediaUpload, gamification (XPBadge, TierThemeProvider), landing, community

---

## 6. AUTHENTICATION

### Supabase Auth
- **Client**: `lib/auth.ts` → `createClientAuth()` (browser)
- **Server**: `lib/auth-server.ts` → `createServerAuth()`, `getCurrentUser()`
- **Admin**: `lib/supabase-admin.ts` (service role)

### Middleware
- **File**: `middleware.ts`
- **No auth redirects** — auth enforced in layouts, not middleware
- **Behavior**: Adds x-pathname, x-request-start headers; logs slow API requests (>3s)

### Protected Routes
| Layout | Protection |
|--------|------------|
| `(app)/layout.tsx` | `getCurrentUser()` → redirect `/login` |
| `(predictions)/predictions/layout.tsx` | `getCurrentUser()` → redirect `/login` |
| `corporate/layout.tsx` | `getCurrentUser()` → redirect `/login` |
| `employee-portal/layout.tsx` | Same |
| `admin/layout.tsx` | `getCurrentUser()` + `user_type === 'admin'` → redirect `/login` |

### Recent Auth Fixes
- **AuthSessionExpiredError**: On `refresh_token_not_found`, call `signOut()`, clear cookies, return 401
- **NotificationsBell**: On 401 from `/api/notifications`, redirect to `/login`
- **ensure-profile**: Replaces signup triggers; creates profile + user_stats

---

## 7. AGENTS

### Agent Implementation
- **Config**: `lib/agents/config.ts` — Anthropic client, `logAgentRun()`, `parseAgentJSON()`
- **Agents**: `ceo-digest.ts`, `content-creator.ts`, `news-monitor.ts`, `inbox-curator.ts`, `sponsor-report.ts`

### Cron Triggers (vercel.json)
| Agent | Schedule (UTC) | Route |
|-------|---------------|-------|
| CEO Digest | 0 9 * * * (daily) | `/api/cron/agents/ceo-digest` |
| Content Creator | 0 9 * * * | `/api/cron/agents/content-creator` |
| News Monitor | 0 9 * * * | `/api/cron/agents/news-monitor` |
| Inbox Curator | 0 9 * * * | `/api/cron/agents/inbox-curator` |
| Sponsor Report | 0 9 1 * * (monthly) | `/api/cron/agents/sponsor-report` |
| Monthly Impact | 0 9 1 * * | `/api/cron/monthly-impact` |

### Auth
- `Authorization: Bearer ${process.env.CRON_SECRET}` required for cron routes

### agent_content Table
- **content_type**: news_summary, sentiment_report, data_alert, social_post, weekly_digest, market_insight, sponsor_report
- **Writers**: news-monitor, content-creator, inbox-curator, ceo-digest, sponsor-report

### agent_runs Table
- **Columns**: id, agent_name, status, duration_ms, tokens_input, tokens_output, cost_estimate, error_message, summary, created_at
- **Writer**: `lib/agents/config.ts` → `logAgentRun()`

### Admin
- `/predictions/admin/agents` — view runs, run agents manually
- `/api/predictions/admin/run-agent` — manual trigger

---

## 8. FEATURES

| Feature | Description | Key Paths |
|---------|-------------|-----------|
| **Predictions** | Markets, trading, wallet, deposits | `/predictions/*`, `execute_prediction_trade` RPC |
| **Conscious Fund** | Fund from fees, cause voting | `/predictions/fund`, fund_causes, fund_votes |
| **Leaderboard** | XP ranking | `/leaderboard`, `/predictions/leaderboard` |
| **Notifications** | In-app notifications | `notifications` table, `/api/notifications` |
| **Admin** | Metrics, deletions, promo codes, markets | `/admin/*`, `/predictions/admin/*` |
| **Gamification** | XP, achievements, streaks | user_xp, user_achievements, xp_rewards |
| **Corporate** | Invites, enrollments, certificates | `/corporate/*`, `/employee-portal/*` |
| **Sponsorship** | Stripe checkout, reports | `/sponsor/*`, `/api/create-checkout` |
| **Marketplace** | Modules, lessons, reviews | marketplace_modules, module_lessons |

---

## 9. BACKEND

### Tables (from migrations and types)

| Table | Key Columns | Domain |
|-------|-------------|--------|
| **profiles** | id, email, full_name, avatar_url, user_type | Auth |
| **prediction_markets** | id, title, category, status, current_probability, total_volume, resolution_date | Predictions |
| **market_outcomes** | id, market_id, title, probability | Predictions |
| **market_votes** | id, market_id, outcome_id, user_id, confidence, xp_earned | Predictions |
| **prediction_trades** | id, market_id, user_id, side, amount, price, fee_amount, conscious_fund_amount | Predictions |
| **prediction_positions** | user_id, market_id, side, shares, average_price | Predictions |
| **prediction_wallets** | user_id, balance, total_deposited, currency | Predictions |
| **prediction_deposits** | user_id, wallet_id, stripe_payment_intent_id, amount, status | Predictions |
| **conscious_fund** | total_collected, total_disbursed, current_balance | Predictions |
| **conscious_fund_transactions** | amount, source_type, market_id | Predictions |
| **prediction_market_history** | market_id, probability, volume_24h, recorded_at | Predictions |
| **agent_content** | market_id, agent_type, content_type, title, body, published | Predictions |
| **agent_runs** | agent_name, status, duration_ms, error_message | Predictions |
| **sentiment_scores** | market_id, score, source, recorded_at | Predictions |
| **fund_causes** | title, description, status | Predictions |
| **fund_votes** | cause_id, user_id | Predictions |
| **conscious_inbox** | title, description, status | Predictions |
| **inbox_votes** | inbox_item_id, user_id | Predictions |
| **market_comments** | market_id, user_id, content | Predictions |
| **sponsorships** | sponsor_name, sponsor_email, market_id, sponsor_url, report_token | Predictions |
| **course_enrollments** | user_id, module_id, progress_percentage, completed | Corporate |
| **corporate_accounts** | name, admin_user_id | Corporate |
| **employee_invitations** | corporate_account_id, email, status | Corporate |
| **marketplace_modules** | title, slug, creator_community_id | Marketplace |
| **module_lessons** | module_id, title, order_index | Marketplace |
| **notifications** | user_id, type, title, message, read, link | Notifications |
| **user_xp** | user_id, total_xp, tier | Gamification |
| **user_achievements** | user_id, achievement_type | Gamification |
| **user_stats** | user_id, total_xp, level | Gamification |
| **xp_rewards** | action_type, xp_amount | Gamification |
| **payment_transactions** | stripe_payment_intent_id, amount, status | Payments |
| **communities** | name, slug, creator_id | Community |
| **community_content** | community_id, type, title, status | Community |
| **community_members** | community_id, user_id, role | Community |
| **deletion_requests** | requester_id, status | Admin |
| **promo_codes** | code, discount_type | Admin |

### RLS Summary
- **profiles**: SELECT all, UPDATE/INSERT own; Service role can insert
- **prediction_markets**: SELECT authenticated, INSERT/UPDATE admins
- **prediction_trades**: SELECT own, INSERT authenticated
- **prediction_wallets**: SELECT/UPDATE/INSERT own
- **agent_content**: SELECT where published
- **agent_runs**: `FOR ALL USING (true)` (service role)
- **payment_transactions**: SELECT admins only (INSERT/UPDATE via service role)
- **notifications**: SELECT/UPDATE own, INSERT system

### Triggers
- `member_count_trigger` — community_members INSERT/DELETE
- `trigger_prediction_trade_history` — prediction_trades → prediction_market_history
- `trg_prediction_markets_updated_at` — prediction_markets updated_at
- `trigger_content_xp`, `trigger_vote_xp`, `trigger_comment_xp`, `trigger_community_join_xp`, etc.
- `trigger_notify_content_approved`, `trigger_notify_new_content` — notifications

### SECURITY DEFINER Functions
- `get_or_create_prediction_wallet(p_user_id)` — wallet creation
- `execute_prediction_trade(...)` — trade execution
- `resolve_prediction_market(...)` — market resolution
- `award_xp(...)`, `check_achievements(...)`, `update_leaderboard_ranks()`, `get_leaderboard(...)`
- `create_notification(...)` — notification creation
- `get_content_share_stats()`, `get_user_referral_stats()`
- `get_enrollment_type()`, `initialize_community_treasury()`, `add_treasury_donation()`
- `create_user_settings()` — user_settings trigger
- `get_user_rank(p_user_id)` — leaderboard

### Recent Migrations (sql-migrations/)
- **EMERGENCY-FIX-signup-triggers-ALL.sql** — Drop on_auth_user_created, on_auth_user_created_stats
- **FIX-security-definer-votes-view.sql** — Drop public.votes view
- **FIX-payment-transactions-rls-policies.sql** — Admins can SELECT payment_transactions

---

## 10. RECOMMENDATIONS

### High Priority
1. **Create `.env.example`** — Document all required env vars for onboarding
2. **Enable leaked password protection** — Supabase Auth → Settings → Password
3. **Remove console.log from production** — e.g. `app/(app)/layout.tsx` has auth logs

### Medium Priority
4. **Add search_path to critical functions** — award_xp, process_module_sale, wallet functions
5. **Consider middleware auth** — Optional: redirect unauthenticated users at edge for faster UX
6. **Legacy tables** — Community tables (communities, community_content, etc.) still used; plan deprecation if needed

### Low Priority
7. **Function search_path** — Fix 889 warnings incrementally when touching functions
8. **Materialized view in API** — Review user_progress_summary exposure if sensitive

---

## Key File Paths

| Area | Path |
|------|------|
| Auth server | `lib/auth-server.ts` |
| Supabase clients | `lib/supabase*.ts` |
| Design system | `lib/design-system.ts` |
| Agent config | `lib/agents/config.ts` |
| Middleware | `middleware.ts` |
| App layout (protected) | `app/(app)/layout.tsx` |
| Predictions layout | `app/(predictions)/predictions/layout.tsx` |
| Auth callback | `app/auth/callback/route.ts` |
| Cron config | `vercel.json` |
| Database types | `types/database.ts` |
| Supabase migrations | `supabase/migrations/` |
| SQL migrations | `sql-migrations/` |
