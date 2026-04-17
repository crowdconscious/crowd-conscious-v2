# Crowd Conscious — Complete Platform Audit

**Date:** February 2026  
**Purpose:** Pre–World Cup 2026 overhaul — full inventory for simplification and focus on free-to-play prediction/engagement.

---

## Executive Summary

The Crowd Conscious platform is a large, multi-product Next.js application with **~90 pages**, **~128 API routes**, and **~78 components**. The codebase spans six major product areas: Community Platform, Predictions/Collective Consciousness, Concientizaciones (employee portal), Learn & Earn (marketplace/courses), User System (auth, XP, gamification), and Admin. **Roughly 40–50% of the codebase serves active prediction/community features**; the remainder supports corporate training, marketplace, treasury, and admin tooling. The prediction market uses **real money** via Stripe (MXN) and `prediction_wallets`; deposits flow through Stripe PaymentIntents and a webhook that credits wallets. **No AI agent cron jobs exist** — the four agents (News Monitor, Sentiment Tracker, Data Watchdog, Content Creator) are **not implemented**; only seed data populates `agent_content` and `sentiment_scores`. The platform has **no Mercado Pago integration** for predictions. Key concerns: many STUB/HIDDEN routes, outdated PREDICTIONS-IMPLEMENTATION-STATUS.md, and dependencies between community treasury, corporate enrollments, and shared gamification that complicate removal of Concientizaciones or Community Wallet.

---

# Part 1: Codebase Architecture Audit

## 1.1 Route Map

| Path | Component File | Purpose | Auth | Status |
|------|----------------|---------|------|--------|
| `/` | `app/page.tsx` | Landing page | No | ACTIVE |
| `/about` | `app/(public)/about/page.tsx` | About page | No | ACTIVE |
| `/login` | `app/(public)/login/page.tsx` | Login | No | ACTIVE |
| `/signup` | `app/(public)/signup/page.tsx` | User signup | No | ACTIVE |
| `/signup-corporate` | `app/signup-corporate/page.tsx` | Corporate signup | No | ACTIVE |
| `/forgot-password` | `app/(public)/forgot-password/page.tsx` | Password reset request | No | ACTIVE |
| `/reset-password` | `app/(public)/reset-password/page.tsx` | Password reset form | No | ACTIVE |
| `/privacy` | `app/(public)/privacy/page.tsx` | Privacy policy | No | ACTIVE |
| `/terms` | `app/(public)/terms/page.tsx` | Terms of service | No | ACTIVE |
| `/cookies` | `app/(public)/cookies/page.tsx` | Cookie policy | No | ACTIVE |
| `/impact` | `app/(public)/impact/page.tsx` | Public impact page | No | ACTIVE |
| `/share/content/[contentId]` | `app/(public)/share/content/[contentId]/page.tsx` | Shared content view | No | ACTIVE |
| `/share/[token]` | `app/(public)/share/[token]/page.tsx` | Shared content by token | No | ACTIVE |
| `/concientizaciones` | `app/concientizaciones/page.tsx` | Corporate training landing | No | ACTIVE |
| `/assessment` | `app/assessment/page.tsx` | Assessment/quiz | No | ACTIVE |
| `/verify` | `app/verify/page.tsx` | Email verification | No | ACTIVE |
| `/verify/[code]` | `app/verify/[code]/page.tsx` | Email verification with code | No | ACTIVE |
| `/proposal/[id]` | `app/proposal/[id]/page.tsx` | Proposal view | No | STUB |
| `/marketplace` | `app/marketplace/page.tsx` | Marketplace (public browse) | No | ACTIVE |
| `/marketplace/[id]` | `app/marketplace/[id]/page.tsx` | Module detail | No | ACTIVE |
| `/module-trial/[moduleId]` | `app/module-trial/[moduleId]/page.tsx` | Module trial | No | ACTIVE |
| `/checkout` | `app/checkout/page.tsx` | Checkout | Yes | ACTIVE |
| `/sponsorship/success` | `app/sponsorship/success/page.tsx` | Sponsorship success | No | ACTIVE |
| `/sponsorship/cancelled` | `app/sponsorship/cancelled/page.tsx` | Sponsorship cancelled | No | ACTIVE |
| `/demo-hub` | `app/demo-hub/page.tsx` | Demo hub | No | HIDDEN |
| `/enhanced-demo` | `app/enhanced-demo/page.tsx` | Enhanced demo | No | HIDDEN |
| `/enhanced-community-demo` | `app/enhanced-community-demo/page.tsx` | Community demo | No | HIDDEN |
| `/demo-disclaimer` | `app/demo-disclaimer/page.tsx` | Demo disclaimer | No | HIDDEN |
| `/demo/module-tools` | `app/demo/module-tools/page.tsx` | Module tools demo | No | HIDDEN |
| `/design-system` | `app/design-system/page.tsx` | Design system | No | HIDDEN |
| `/corporate/checkout` | `app/corporate/checkout/page.tsx` | Corporate checkout | Yes | ACTIVE |
| `/corporate/checkout/success` | `app/corporate/checkout/success/page.tsx` | Corporate checkout success | Yes | ACTIVE |
| `/corporate/dashboard` | `app/corporate/dashboard/page.tsx` | Corporate dashboard | Yes | ACTIVE |
| `/corporate/employees` | `app/corporate/employees/page.tsx` | Employee management | Yes | ACTIVE |
| `/corporate/progress` | `app/corporate/progress/page.tsx` | Progress tracking | Yes | ACTIVE |
| `/corporate/certificates` | `app/corporate/certificates/page.tsx` | Certificates | Yes | ACTIVE |
| `/corporate/settings` | `app/corporate/settings/page.tsx` | Corporate settings | Yes | ACTIVE |
| `/corporate/impact` | `app/corporate/impact/page.tsx` | Corporate impact | Yes | ACTIVE |
| `/corporate/esg-reports` | `app/corporate/esg-reports/page.tsx` | ESG reports | Yes | ACTIVE |
| `/employee-portal/dashboard` | `app/employee-portal/dashboard/page.tsx` | Employee learning dashboard | Yes | ACTIVE |
| `/employee-portal/courses` | `app/employee-portal/courses/page.tsx` | Courses list | Yes | ACTIVE |
| `/employee-portal/certifications` | `app/employee-portal/certifications/page.tsx` | Certifications | Yes | ACTIVE |
| `/employee-portal/impact` | `app/employee-portal/impact/page.tsx` | Employee impact | Yes | ACTIVE |
| `/employee-portal/mi-impacto` | `app/(app)/employee-portal/mi-impacto/page.tsx` | Mi Impacto / ESG | Yes | ACTIVE |
| `/employee-portal/modules/[moduleId]` | `app/employee-portal/modules/[moduleId]/page.tsx` | Module detail | Yes | ACTIVE |
| `/employee-portal/modules/[moduleId]/lessons/[lessonId]` | `app/employee-portal/modules/[moduleId]/lessons/[lessonId]/page.tsx` | Lesson view | Yes | ACTIVE |
| `/employee-portal/modules/[moduleId]/certificate` | `app/employee-portal/modules/[moduleId]/certificate/page.tsx` | Certificate view | Yes | ACTIVE |
| `/employee-portal-public/accept-invitation` | `app/employee-portal-public/accept-invitation/page.tsx` | Accept corporate invitation | No | ACTIVE |
| `/creator/apply` | `app/creator/apply/page.tsx` | Creator application | No | ACTIVE |
| `/creator/module-builder` | `app/creator/module-builder/page.tsx` | Module builder | No | ACTIVE |
| `/admin` | `app/admin/page.tsx` | Admin dashboard | Yes (admin) | ACTIVE |
| `/admin/email-templates` | `app/admin/email-templates/page.tsx` | Email templates | Yes (admin) | ACTIVE |
| `/admin/email-test` | `app/admin/email-test/page.tsx` | Email testing | Yes (admin) | ACTIVE |
| `/admin/deletions` | `app/admin/deletions/page.tsx` | Deletion requests | Yes (admin) | ACTIVE |
| `/admin/metrics` | `app/admin/metrics/page.tsx` | Admin metrics | Yes (admin) | ACTIVE |
| `/admin/test-systems` | `app/admin/test-systems/page.tsx` | Test systems | Yes (admin) | ACTIVE |
| `/admin/promo-codes` | (in admin layout) | Promo codes | Yes (admin) | ACTIVE |
| `/predictions/gate` | `app/(predictions)/predictions/gate/page.tsx` | Predictions access gate | No | ACTIVE |
| `/predictions` | `app/(predictions)/predictions/page.tsx` | Predictions dashboard | Yes + gate | ACTIVE |
| `/predictions/markets` | `app/(predictions)/predictions/markets/page.tsx` | Markets list | Yes + gate | ACTIVE |
| `/predictions/markets/[id]` | `app/(predictions)/predictions/markets/[id]/page.tsx` | Market detail | Yes + gate | ACTIVE |
| `/predictions/trades` | `app/(predictions)/predictions/trades/page.tsx` | Trades history | Yes + gate | ACTIVE |
| `/predictions/wallet` | `app/(predictions)/predictions/wallet/page.tsx` | Prediction wallet | Yes + gate | ACTIVE |
| `/predictions/fund` | `app/(predictions)/predictions/fund/page.tsx` | Conscious fund + cause voting | Yes + gate | ACTIVE |
| `/predictions/insights` | `app/(predictions)/predictions/insights/page.tsx` | AI insights | Yes + gate | ACTIVE |
| `/predictions/admin/resolve` | `app/(predictions)/predictions/admin/resolve/page.tsx` | Resolve markets | Yes + gate + admin | ACTIVE |
| `/dashboard` | `app/(app)/dashboard/page.tsx` | Main dashboard | Yes | ACTIVE |
| `/dashboard/payments` | `app/(app)/dashboard/payments/page.tsx` | Payments dashboard | Yes | ACTIVE |
| `/dashboard/payments/success` | `app/(app)/dashboard/payments/success/page.tsx` | Payment success | Yes | ACTIVE |
| `/dashboard/payments/refresh` | `app/(app)/dashboard/payments/refresh/page.tsx` | Payment refresh | Yes | ACTIVE |
| `/communities` | `app/(app)/communities/page.tsx` | Communities list | Yes | ACTIVE |
| `/communities/new` | `app/(app)/communities/new/page.tsx` | Create community | Yes | ACTIVE |
| `/communities/[id]` | `app/(app)/communities/[id]/page.tsx` | Community detail | Yes | ACTIVE |
| `/communities/[id]/content/[contentId]` | `app/(app)/communities/[id]/content/[contentId]/page.tsx` | Content detail | Yes | ACTIVE |
| `/communities/[id]/content/[contentId]/sponsor` | `app/(app)/communities/[id]/content/[contentId]/sponsor/page.tsx` | Sponsor content | Yes | ACTIVE |
| `/communities/[id]/content/new` | `app/(app)/communities/[id]/content/new/page.tsx` | Create content | Yes | ACTIVE |
| `/communities/[id]/modules` | `app/(app)/communities/[id]/modules/page.tsx` | Community modules | Yes | ACTIVE |
| `/communities/[id]/modules/create` | `app/(app)/communities/[id]/modules/create/page.tsx` | Create module | Yes | ACTIVE |
| `/communities/[id]/modules/templates` | `app/(app)/communities/[id]/modules/templates/page.tsx` | Module templates | Yes | ACTIVE |
| `/communities/[id]/settings` | `app/(app)/communities/[id]/settings/page.tsx` | Community settings | Yes | ACTIVE |
| `/communities/[id]/impact` | `app/(app)/communities/[id]/impact/page.tsx` | Community impact | Yes | ACTIVE |
| `/marketplace-browse` | `app/(app)/marketplace-browse/page.tsx` | Marketplace browse (app) | Yes | ACTIVE |
| `/marketplace/create` | `app/(app)/marketplace/create/page.tsx` | Create marketplace module | Yes | ACTIVE |
| `/discover` | `app/(app)/discover/page.tsx` | Discover communities | Yes | ACTIVE |
| `/leaderboard` | `app/(app)/leaderboard/page.tsx` | XP leaderboard | Yes | ACTIVE |
| `/achievements` | `app/(app)/achievements/page.tsx` | Achievements | Yes | ACTIVE |
| `/profile` | `app/(app)/profile/page.tsx` | User profile | Yes | ACTIVE |
| `/settings` | `app/(app)/settings/page.tsx` | User settings | Yes | ACTIVE |
| `/setup-admin` | `app/(app)/setup-admin/page.tsx` | One-time admin setup | Yes | ACTIVE |

---

## 1.2 Feature Inventory

### Community Platform
| Feature | Status | Last Change | Dependencies | Data |
|---------|--------|-------------|--------------|------|
| Communities CRUD | WORKING | Recent | profiles, community_members | Real |
| Content (needs, events, challenges, polls) | WORKING | Recent | communities, votes, sponsorships | Real |
| Voting | WORKING | Recent | community_content, votes | Real |
| Sponsorships | WORKING | Recent | Stripe, communities | Real |
| Community treasury | WORKING | Recent | wallets, Stripe | Real |
| Community modules | WORKING | Recent | marketplace_modules, enrollments | Real |
| Share links | WORKING | Recent | share_links | Real |
| Comments | WORKING | Recent | comments | Real |
| Event registration | WORKING | Recent | event_registrations | Real |
| Poll voting | WORKING | Recent | poll_votes | Real |

### Predictions / Collective Consciousness
| Feature | Status | Last Change | Dependencies | Data |
|---------|--------|-------------|--------------|------|
| Access gate | WORKING | Recent | PREDICTIONS_ACCESS_CODE cookie | — |
| Dashboard (personalized) | WORKING | Recent | positions, agent_content, history | Real/seed |
| Markets list | WORKING | Recent | prediction_markets, history | Real/seed |
| Market detail | WORKING | Recent | history, agent_content, sentiment, trades | Real/seed |
| Trading | WORKING | Recent | execute_prediction_trade RPC, wallet | Real |
| Wallet + Stripe deposit | WORKING | Recent | Stripe, prediction_wallets, webhook | Real |
| Conscious fund | WORKING | Recent | conscious_fund, transactions | Real |
| Cause voting | WORKING | Recent | fund_causes, fund_votes | Real |
| Trades history | PARTIAL | Recent | prediction_trades | Real |
| AI insights page | WORKING | Recent | agent_content | Seed |
| Admin resolve | WORKING | Recent | resolve_prediction_market RPC | Real |
| Mercado Pago | NOT IMPLEMENTED | — | — | — |

### Concientizaciones (Employee Portal)
| Feature | Status | Last Change | Dependencies | Data |
|---------|--------|-------------|--------------|------|
| Employee dashboard | WORKING | Recent | course_enrollments, modules | Real |
| Courses list | WORKING | Recent | marketplace_modules, enrollments | Real |
| Module lessons | WORKING | Recent | module_lessons, activity_responses | Real |
| Certifications | WORKING | Recent | certifications | Real |
| Impact / ESG | WORKING | Recent | impact_metrics, ESG report | Real |
| Corporate dashboard | WORKING | Recent | corporate_accounts, employees | Real |
| Corporate checkout | WORKING | Recent | Stripe | Real |
| Employee invitations | WORKING | Recent | employee_invitations | Real |
| Module tools (carbon, water, etc.) | WORKING | Recent | module_lessons | Real |

### Learn & Earn / Marketplace
| Feature | Status | Last Change | Dependencies | Data |
|---------|--------|-------------|--------------|------|
| Marketplace browse | WORKING | Recent | marketplace_modules | Real |
| Module purchase | WORKING | Recent | Stripe, cart, enrollments | Real |
| Cart | WORKING | Recent | cart_items | Real |
| Promo codes | WORKING | Recent | promo_codes | Real |
| Module create | WORKING | Recent | marketplace_modules | Real |
| Creator apply | WORKING | Recent | — | Real |
| Module builder | WORKING | Recent | — | Real |
| Reviews | WORKING | Recent | community_reviews, module_reviews | Real |

### User System
| Feature | Status | Last Change | Dependencies | Data |
|---------|--------|-------------|--------------|------|
| Auth (Supabase) | WORKING | Recent | profiles | Real |
| Profiles | WORKING | Recent | profiles | Real |
| XP system | WORKING | Recent | user_xp, xp_rewards | Real |
| Tiers | WORKING | Recent | tier_config | Real |
| Achievements | WORKING | Recent | user_achievements | Real |
| Leaderboard | WORKING | Recent | user_xp | Real |
| Streaks | PARTIAL | Older | — | — |

### Admin
| Feature | Status | Last Change | Dependencies | Data |
|---------|--------|-------------|--------------|------|
| Admin dashboard | WORKING | Recent | — | Real |
| Moderation (user, community, sponsorship) | WORKING | Recent | profiles, communities | Real |
| Module review | WORKING | Recent | marketplace_modules | Real |
| Deletion requests | WORKING | Recent | deletion_requests | Real |
| Promo codes | WORKING | Recent | promo_codes | Real |
| Wallets | WORKING | Recent | wallets | Real |
| Email templates/test | WORKING | Recent | Resend | — |
| Metrics | WORKING | Recent | — | Real |
| Test systems | WORKING | Recent | — | — |
| Market resolve (predictions) | WORKING | Recent | prediction_markets | Real |

### Brand / Sponsor
| Feature | Status | Last Change | Dependencies | Data |
|---------|--------|-------------|--------------|------|
| Sponsorship flow | WORKING | Recent | Stripe, sponsorships | Real |
| Treasury donation | WORKING | Recent | Stripe, wallets | Real |

### Other
| Feature | Status | Last Change | Dependencies | Data |
|---------|--------|-------------|--------------|------|
| Assessment | PARTIAL | Older | — | — |
| Location search | WORKING | Recent | External API | — |
| Share system | WORKING | Recent | share_links | Real |
| ESG report generation | WORKING | Recent | exceljs, jspdf | Real |

---

## 1.3 Component & Shared Code Map

### Shared Components (`/components`)
| Component | Used | Notes |
|-----------|------|-------|
| AnalyticsTracker | No | Dead |
| CommunitiesWithLoading | Yes | communities page |
| CookieConsent | Yes | app/page.tsx |
| CoreValuesSelector | Yes | Communities |
| DashboardMobileMenu | Yes | Dashboard |
| DashboardNavigation | Yes | Multiple |
| DiscussionSystem | Yes | Content detail |
| Footer | Yes | Layout |
| GamificationSystem | Yes | Dashboard |
| LocationAutocomplete | Yes | Community creation |
| MarketplacePurchaseButton | No | Dead |
| MobileNavigation | Yes | Layout |
| NotificationSystem | Yes | Multiple |
| PaymentForm | No | Dead |
| ProfilePictureUpload | Yes | Settings |
| SelfEnrollButton | No | Dead |
| ShareButton | Yes | Content detail |
| SignOutButton | Yes | Layouts |
| TrustedBrands | Yes | Landing |
| WalletCard | No | Dead |
| CorporateTrainingCard | Yes | Dashboard |
| DesignSystemDemo | Yes | Design system |
| Module tools (Module1–6, Carbon, Water, etc.) | Yes | Employee portal lessons |
| Gamification (XPBadge, TierDisplay, etc.) | Yes | Dashboard, profile |
| UI (Toast, Card, Badge, etc.) | Yes | App-wide |

### Lib Utilities
| File | Purpose |
|------|---------|
| auth-server, auth | Server/client auth |
| supabase, supabase-client, supabase-server, supabase-admin | Supabase clients |
| stripe | Stripe client |
| resend, email-simple | Email |
| xp-system, achievement-service, tier-config | Gamification |
| prediction-schemas, validation-schemas | Validation |
| rate-limit | Upstash Redis rate limiting |
| api-responses | API response helpers |
| media, storage | Media/storage helpers |
| generate-professional-esg-pdf | ESG PDF |

### Hooks
| Hook | Purpose |
|------|---------|
| useMediaQuery | Responsive, reduced motion |
| useUserTier | XP, tier, progress |
| useUserAchievements | Achievements |
| useLeaderboard | Leaderboard data |
| useToolDataSaver | Save tool data |

---

## 1.4 API Routes (Summary)

| Path Pattern | Methods | Purpose | Called From |
|--------------|---------|---------|-------------|
| `/api/auth/*` | GET, POST | Auth callback, reset password | Auth flows |
| `/api/communities/*` | GET, POST, PUT, DELETE | Communities CRUD, media | Communities pages |
| `/api/comments` | GET, POST | Comments | Content detail |
| `/api/share` | GET, POST | Share links | ShareButton |
| `/api/polls/[id]/vote` | POST, DELETE | Poll voting | Content detail |
| `/api/events/[id]/register` | POST, DELETE | Event registration | Content detail |
| `/api/modules/*` | GET, POST | Modules, lessons, create | Employee portal, marketplace |
| `/api/enrollments/*` | GET, POST | Enrollments, activities | Employee portal |
| `/api/activities/*` | GET, POST | Save response, upload evidence | Employee portal |
| `/api/certificates/*` | GET, POST | Generate, verify | Employee portal |
| `/api/cart/*` | GET, POST, PUT, DELETE | Cart CRUD, checkout | Marketplace |
| `/api/payments/create-intent` | POST | Payment intent | Checkout |
| `/api/verify-payment` | GET | Verify payment | — |
| `/api/webhooks/stripe` | POST | Stripe webhook | Stripe |
| `/api/marketplace/*` | GET, POST | Modules, purchase | Marketplace |
| `/api/user/*` | GET, POST | Profile, modules | Profile, create |
| `/api/user-stats` | GET | User stats | Dashboard |
| `/api/gamification/*` | GET, POST | XP, achievements, leaderboard | Dashboard, profile |
| `/api/corporate/*` | GET, POST | Invite, accept, progress | Corporate, employee |
| `/api/admin/*` | GET, POST, PUT, PATCH, DELETE | Moderation, promo, deletions | Admin |
| `/api/predictions/*` | GET, POST | Markets, trade, wallet, fund, vote | Predictions pages |
| `/api/treasury/*` | GET, POST | Stats, donate, spend | Community treasury |
| `/api/wallets/*` | GET, POST | User/community wallets | Treasury, admin |
| `/api/cron/*` | GET | Monthly impact, challenge reminders | Vercel cron |
| `/api/landing/*` | GET | Stats, communities | Landing |
| `/api/locations/search` | GET | Location search | Community creation |
| `/api/assessment/*` | GET, POST | Assessment | Assessment page |
| `/api/creator/apply` | POST | Creator application | Creator apply |
| `/api/esg/generate-report` | GET | ESG report | Corporate |
| `/api/stripe/connect/onboard` | GET, POST | Stripe Connect | Dashboard payments |
| `/api/test-*`, `/api/debug-*`, `/api/diagnose-*` | GET, POST | Debug, test | Admin |

---

## 1.5 Third-Party Integrations

| Service | Purpose | Env Vars |
|---------|---------|----------|
| Supabase | Auth, database, storage | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY |
| Stripe | Payments (predictions, marketplace, treasury, sponsorships) | STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET |
| Resend | Email | RESEND_API_KEY, FROM_EMAIL |
| Vercel | Hosting, cron, analytics | CRON_SECRET, Vercel env |
| Upstash Redis | Rate limiting | UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN |
| @vercel/analytics | Analytics | — |
| @vercel/speed-insights | Speed insights | — |
| External location API | Location search | NEXT_PUBLIC_SITE_URL (Referer) |

**Not integrated:** Mercado Pago, Anthropic/Claude (AI agents), News APIs, Google Trends.

---

## 1.6 Cron Jobs / Scheduled Tasks

| Path | Schedule | Purpose | In vercel.json |
|------|----------|---------|----------------|
| `/api/cron/monthly-impact` | `0 9 1 * *` (1st of month, 9:00) | Monthly impact emails | Yes |
| `/api/cron/challenge-reminders` | `0 8 * * *` (daily 8:00) | Challenge reminders | Yes |
| `/api/cron/event-reminders` | — | Event reminders | **No** (route exists, not scheduled) |

**AI agent crons:** None. The four agents (News Monitor, Sentiment Tracker, Data Watchdog, Content Creator) from PREDICTIONS-CONTEXT.md are **not implemented**. No `lib/agents/*` or `/api/cron/agents/*` routes exist.

---

# Part 2: Database Audit (Supabase)

## 2.1 Table Inventory

| Table | Purpose | Columns | Relationships | Used By |
|-------|---------|---------|---------------|---------|
| profiles | User profiles | 6 | auth.users | App-wide |
| communities | Communities | 14 | creator_id→profiles | Communities |
| community_members | Membership | 5 | community_id, user_id | Communities |
| community_content | Needs, events, challenges, polls | 18 | community_id | Communities |
| sponsorships | Content sponsorships | 12 | content_id, community_id | Sponsorships |
| votes | Content votes | 5 | content_id, user_id | Voting |
| share_links | Share tokens | 6 | content_id | Share |
| need_activities | Need activities | 6 | need_id | Needs |
| poll_options | Poll options | 5 | poll_id | Polls |
| poll_votes | Poll votes | 5 | option_id, user_id | Polls |
| event_registrations | Event registrations | 6 | event_id, user_id | Events |
| course_enrollments | Course enrollments | 12 | user_id, module_id | Employee portal |
| corporate_accounts | Corporate accounts | 12+ | — | Corporate |
| employee_invitations | Employee invitations | 8+ | corporate_id | Corporate |
| marketplace_modules | Marketplace modules | 20+ | creator_community_id | Marketplace |
| module_lessons | Module lessons | 10+ | module_id | Employee portal |
| cart_items | Cart items | 6 | user_id, module_id | Cart |
| promo_codes | Promo codes | 10+ | — | Promo |
| promo_code_uses | Promo code uses | 5 | promo_id, user_id | Promo |
| wallets | Wallet balances | 10+ | user_id, community_id | Treasury |
| community_reviews | Community reviews | 6 | community_id | Reviews |
| activity_responses | Activity responses | 8+ | enrollment_id | Employee portal |
| lesson_responses | Lesson responses | 6 | lesson_id | Employee portal |
| certifications | Certifications | 10+ | user_id, module_id | Employee portal |
| impact_metrics | Impact metrics | 10+ | — | Impact |
| user_stats | User stats | 6 | user_id | Gamification |
| user_xp | XP records | 6 | user_id | Gamification |
| xp_rewards | XP reward config | 5 | — | Gamification |
| deletion_requests | Deletion requests | 8+ | user_id | Admin |
| audit_logs | Audit logs | 8+ | — | Admin |
| prediction_markets | Prediction markets | 20+ | created_by | Predictions |
| prediction_trades | Prediction trades | 10 | market_id, user_id | Predictions |
| prediction_positions | User positions | 8 | market_id, user_id | Predictions |
| prediction_wallets | Prediction wallets | 10 | user_id | Predictions |
| prediction_deposits | Stripe deposits | 6 | user_id, wallet_id | Predictions |
| conscious_fund | Conscious fund | 5 | — | Predictions |
| conscious_fund_transactions | Fund transactions | 7 | market_id | Predictions |
| prediction_market_history | Market history | 6 | market_id | Predictions |
| agent_content | AI content | 11 | market_id | Predictions (seed) |
| sentiment_scores | Sentiment scores | 7 | market_id | Predictions (seed) |
| fund_causes | Fund causes | 9 | — | Predictions |
| fund_votes | Fund votes | 6 | user_id, cause_id | Predictions |

**Row counts:** Unknown without querying. Seed data exists for predictions (8 markets, agent_content, sentiment_scores).

---

## 2.2 RLS Policies

All prediction tables have RLS enabled with policies as documented in migrations 119–125. Community, marketplace, and corporate tables have RLS. Some legacy tables may have permissive or missing policies — a full RLS audit would require querying `pg_policies`.

---

## 2.3 Database Functions

| Function | Purpose | Called From |
|----------|---------|-------------|
| get_or_create_prediction_wallet | Create/fetch prediction wallet | API wallet GET/POST |
| execute_prediction_trade | Execute trade, update positions, fund | API trade POST |
| resolve_prediction_market | Resolve market, pay winners | API admin resolve |
| get_market_trades_anon | Anonymized trades for activity feed | Market detail, trades API |
| trigger_prediction_trade_history | Insert history on trade | Trigger |
| trigger_prediction_markets_updated_at | Update updated_at | Trigger |
| (others from migrations) | Various | — |

---

## 2.4 Edge Functions

None found in codebase. Supabase Edge Functions would be configured in Supabase dashboard.

---

## 2.5 Storage Buckets

Storage is used for avatars, community media, module resources. Bucket names and configuration are in migrations (create-storage-buckets.sql, etc.). Exact list requires Supabase dashboard.

---

## 2.6 Realtime Subscriptions

No realtime subscriptions found in frontend code. Realtime may be enabled in Supabase but not actively used.

---

# Part 3: Environment & Configuration

## 3.1 Environment Variables

| Variable | Purpose | Required For |
|----------|---------|--------------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase URL | Auth, DB |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon key | Auth, DB |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service key | Admin, webhooks |
| STRIPE_SECRET_KEY | Stripe API | Payments |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Stripe client | Checkout UI |
| STRIPE_WEBHOOK_SECRET | Webhook verification | Stripe webhook |
| RESEND_API_KEY | Email | Emails |
| FROM_EMAIL | Sender email | Emails |
| PREDICTIONS_ACCESS_CODE | Predictions gate | Predictions |
| CRON_SECRET | Cron auth | Vercel cron |
| NEXT_PUBLIC_APP_URL | App URL | Emails, redirects |
| NEXT_PUBLIC_SITE_URL | Site URL | Location API |
| UPSTASH_REDIS_REST_URL | Redis | Rate limiting |
| UPSTASH_REDIS_REST_TOKEN | Redis | Rate limiting |
| MONITORING_ENABLED | Monitoring | next.config |
| PAGE_LOAD_THRESHOLD | Monitoring | next.config |
| API_RESPONSE_THRESHOLD | Monitoring | next.config |

---

## 3.2 Vercel Configuration

- **Build:** `npm run build`
- **Output:** `.next`
- **Region:** `iad1`
- **Functions:** `app/api/**/*.ts` maxDuration 30s
- **Crons:** monthly-impact, challenge-reminders (see 1.6)
- **Headers:** X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy
- **Redirects:** terms-and-conditions→terms, privacy-policy→privacy

---

## 3.3 Package Dependencies

| Package | Purpose | Notes |
|---------|---------|-------|
| next, react, react-dom | Framework | Core |
| @supabase/ssr, @supabase/supabase-js | Supabase | Core |
| stripe, @stripe/react-stripe-js, @stripe/stripe-js | Stripe | Payments |
| resend, @react-email/* | Email | Emails |
| recharts | Charts | Predictions, dashboard |
| framer-motion | Animations | UI |
| date-fns | Dates | App-wide |
| zod | Validation | API |
| lucide-react | Icons | App-wide |
| exceljs, jspdf, jspdf-autotable | PDF/Excel | ESG reports |
| @upstash/ratelimit, @upstash/redis | Rate limiting | API |
| canvas-confetti | Confetti | Gamification |
| html2canvas | Screenshots | — |
| next-intl | i18n | Partial |
| react-hook-form | Forms | Forms |
| tailwind-merge, clsx, class-variance-authority | Styling | UI |

---

# Part 4: Critical Questions — Answers

### What percentage of the codebase is actually serving active users vs. dead/demo code?

**~50–60% active.** Active: predictions (gate, dashboard, markets, trading, wallet, fund, cause voting), communities, marketplace, employee portal, corporate, gamification, admin. Dead/demo: design-system, enhanced-demo, demo-hub, demo-disclaimer, demo/module-tools, some unused components (AnalyticsTracker, MarketplacePurchaseButton, PaymentForm, SelfEnrollButton, WalletCard).

### Which database tables have real user data vs. only test/seed data?

**Real:** profiles, communities, community_members, community_content, sponsorships, votes, course_enrollments, marketplace_modules, cart_items, prediction_trades, prediction_positions, prediction_wallets, conscious_fund, conscious_fund_transactions, fund_votes (if users voted). **Seed/test:** prediction_markets (8 seeded), prediction_market_history (seeded), agent_content (seeded), sentiment_scores (seeded). Corporate, wallets, and other tables depend on actual usage.

### Are there any security concerns?

- **RLS:** Tables have RLS; full audit would require checking each policy.
- **API keys:** No hardcoded keys in code; all from env.
- **Predictions gate:** Cookie-based; code in PREDICTIONS_ACCESS_CODE must be kept secret.
- **Stripe webhook:** Signature verification required.

### What is the actual data flow for the prediction market feature?

1. **Trade:** User submits trade → `POST /api/predictions/trade` → `execute_prediction_trade` RPC → checks wallet balance, calculates shares, deducts balance, inserts trade, updates position, updates market probability, inserts conscious_fund_transaction, trigger inserts prediction_market_history.
2. **Deposit:** User enters amount → `POST /api/predictions/wallet` → Stripe PaymentIntent created with metadata (type: prediction_deposit, user_id, wallet_id) → Stripe Elements confirmCardPayment → Stripe sends `payment_intent.succeeded` webhook → `handlePredictionDeposit` inserts prediction_deposits, credits prediction_wallets.
3. **Display:** Markets, positions, fund, causes fetched from Supabase in server components or API routes.

### Is the prediction market currently using real money?

**Yes.** Stripe in MXN. Users deposit via card; `prediction_wallets` hold MXN balance; trades use that balance. Payouts on resolution credit `prediction_wallets` ($10/share for winners).

### What would break if I removed the Concientizaciones employee portal entirely?

- **Direct breaks:** All `/employee-portal/*` and `/corporate/*` routes, course_enrollments, module_lessons, activity_responses, certifications, corporate_accounts, employee_invitations.
- **Shared dependencies:** Gamification (XP, achievements) is shared; prediction_trade awards XP. Leaderboard uses user_xp. If you keep predictions + leaderboard, gamification stays.
- **Marketplace:** Module purchase and cart support both individual and corporate; removing corporate would simplify but not break individual purchase.
- **Recommendation:** Keep gamification, leaderboard, profiles. Remove employee-portal routes, corporate routes, course_enrollments, corporate_accounts, employee_invitations. Archive marketplace if not needed for World Cup.

### What would break if I removed the Community Wallet / donations feature?

- **Direct breaks:** `/api/treasury/*`, CommunityTreasury component, donate flow, Stripe handler for treasury_donation.
- **Dependencies:** wallets table (used for community wallets), community balance display.
- **Sponsorships:** Separate flow; sponsorship payments go to community via different path. Treasury donate is explicit "donate to community" flow.
- **Recommendation:** Community treasury can be removed if you do not need community donations. Sponsorships can remain if desired.

### What is the minimum set of tables needed to run ONLY the prediction/engagement feature + user auth + leaderboard?

**Tables:**
- profiles (auth)
- auth.users (Supabase)
- prediction_markets
- prediction_trades
- prediction_positions
- prediction_wallets
- prediction_deposits
- conscious_fund
- conscious_fund_transactions
- prediction_market_history
- fund_causes
- fund_votes
- user_xp (leaderboard)
- xp_rewards (gamification config)
- user_achievements (optional, for achievements)
- audit_logs (optional)

**Not needed:** communities, community_content, sponsorships, course_enrollments, marketplace_modules, corporate_accounts, wallets (community), cart_items, etc.

### Are the four AI agent cron jobs (Internal Analytics, News Monitor, Content Creator, Data Watchdog) currently functional?

**No.** They do not exist. There are no `lib/agents/*` files or `/api/cron/agents/*` routes. `agent_content` and `sentiment_scores` are populated only by `scripts/seed-prediction-markets.ts`. The PREDICTIONS-CONTEXT.md describes them as future work.

### What's the current monthly Supabase usage and are we anywhere near limits?

Cannot be determined from codebase. Check Supabase dashboard for: rows read, storage, auth MAU, edge function invocations. Free tier limits are typically 500MB database, 1GB storage, 50K MAU.

---

# Recommendations

## Prioritized: Keep for World Cup Launch

1. **Predictions:** Gate, dashboard, markets, trading, wallet, fund, cause voting, admin resolve.
2. **Auth:** Login, signup, profiles.
3. **Gamification:** XP, leaderboard, achievements (for engagement).
4. **Stripe:** Prediction deposits, webhook.
5. **Admin:** Market resolve, basic moderation if needed.

## Archive (Move to /archive or separate repo)

1. Employee portal (`/employee-portal/*`, `/corporate/*`).
2. Marketplace (if not needed for World Cup).
3. Community platform (if World Cup is prediction-only).
4. Treasury/donations.
5. Sponsorships (unless needed).
6. Demo pages (demo-hub, enhanced-demo, etc.).
7. Design system page.
8. Creator apply, module builder.

## Delete / Clean Up

1. Unused components: AnalyticsTracker, MarketplacePurchaseButton, PaymentForm, SelfEnrollButton, WalletCard.
2. Dead API routes (test-email, debug-email, diagnose-email, etc.) — or restrict to admin.
3. event-reminders cron route if not used.
4. Update PREDICTIONS-IMPLEMENTATION-STATUS.md to reflect current state.

## Dependency Map (Simplified)

```
predictions
  ├── auth (profiles)
  ├── gamification (user_xp, leaderboard)
  ├── Stripe (deposits)
  └── Supabase (all prediction tables)

gamification
  ├── auth (profiles)
  └── user_xp, xp_rewards, user_achievements

community platform
  ├── auth
  ├── wallets (treasury)
  ├── Stripe (sponsorships, donations)
  └── communities, content, votes, etc.

employee portal
  ├── auth
  ├── corporate_accounts
  ├── course_enrollments
  ├── marketplace_modules
  └── Stripe (corporate checkout)

marketplace
  ├── auth
  ├── cart
  ├── Stripe
  └── marketplace_modules
```

**Safe to remove without breaking predictions:** Employee portal, marketplace, community platform, treasury, sponsorships (if not used). Keep: auth, gamification (for leaderboard/engagement), predictions, Stripe for predictions.
