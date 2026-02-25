# Crowd Conscious v2 — Complete Platform Context

**Version**: 2.0 | **Last Updated**: February 25, 2025  
**Purpose**: Comprehensive reference for database structure, features, tech stack, code quality, and improvement opportunities.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Full Stack Architecture](#2-full-stack-architecture)
3. [Database Structure](#3-database-structure)
4. [User Features (Complete Inventory)](#4-user-features-complete-inventory)
5. [API Reference](#5-api-reference)
6. [Connected APIs & Integrations](#6-connected-apis--integrations)
7. [Values & Code Quality](#7-values--code-quality)
8. [Possible Improvements](#8-possible-improvements)

---

## 1. Platform Overview

### Mission & Value Proposition

**Crowd Conscious** is a social impact platform that connects communities, corporations, and individuals to create measurable environmental and social change.

**Core Model**:
- **Communities** create sustainability training modules from real-world expertise
- **Corporations** purchase training that funds community projects
- **Revenue** flows back to neighborhoods for project implementation
- **Impact** is measured with verifiable metrics and transparent reporting

### User Types

| Type | Description | Capabilities |
|------|-------------|--------------|
| **User** | Individual learner/contributor | Courses, communities, voting, sponsorships, gamification |
| **Brand** | Corporate/sponsor entity | Sponsorships, corporate training, employee management |
| **Admin** | Platform administrator | Moderation, settings, deletion requests, promo codes |

---

## 2. Full Stack Architecture

### Tech Stack Summary

| Layer | Technology | Version |
|-------|-------------|---------|
| **Framework** | Next.js (App Router) | 15.5.7 |
| **UI Library** | React | 19.1.2 |
| **Language** | TypeScript | 5.x |
| **Styling** | Tailwind CSS | 3.4.0 |
| **Animations** | Framer Motion | 12.23.22 |
| **Icons** | Lucide React | 0.544.0 |
| **Forms** | React Hook Form + Zod | 7.63 / 4.1.11 |
| **Database** | Supabase (PostgreSQL) | 2.57.4 |
| **Auth** | Supabase Auth | — |
| **Payments** | Stripe | 18.5.0 |
| **Email** | Resend | 6.1.0 |
| **Rate Limiting** | Upstash Redis | 2.0.7 |
| **Deployment** | Vercel | — |
| **i18n** | next-intl | 4.5.1 |

### Project Structure

```
crowd-conscious-v2/
├── app/
│   ├── (app)/              # Authenticated user routes
│   │   ├── dashboard/      # User dashboard, payments
│   │   ├── communities/    # Community management, content, modules, impact
│   │   ├── marketplace/    # Module creation, browse
│   │   ├── discover/       # Discover communities
│   │   ├── profile/        # User profile
│   │   ├── settings/       # User settings
│   │   ├── achievements/   # Gamification achievements
│   │   ├── leaderboard/    # XP leaderboard
│   │   └── ...
│   ├── (public)/           # Public routes
│   │   ├── login/          # Login
│   │   ├── signup/         # Sign up
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   ├── share/[token]/  # Public share links
│   │   ├── about/, privacy/, terms/
│   │   └── impact/        # Public impact page
│   ├── corporate/         # Corporate dashboard
│   ├── employee-portal/   # Employee learning portal
│   ├── admin/             # Admin panel
│   └── api/               # API routes (106 endpoints)
├── components/
│   ├── ui/                # Primitives (Button, Card, Badge, etc.)
│   ├── gamification/      # XP, tiers, achievements, celebrations
│   ├── community/         # Community components
│   ├── module-tools/       # Calculators, checklists, planners
│   ├── cart/              # Shopping cart
│   └── ...
├── lib/                   # Utilities, auth, Supabase, Stripe, etc.
├── hooks/                 # useUserTier, useMediaQuery, useToolDataSaver
├── types/                 # database.ts (Supabase types)
└── sql-migrations/        # 118+ SQL migration files
```

---

## 3. Database Structure

### Core Tables (from `types/database.ts` and migrations)

#### User & Profile

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | Extended user profiles | id, email, full_name, avatar_url, user_type |
| `user_settings` | User preferences | user_id, theme, notifications |
| `user_follows` | Follow relationships | follower_id, following_id |
| `user_stats` | Aggregated stats (XP, lessons, modules) | user_id, total_xp, lessons_completed, modules_completed |

#### Communities

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `communities` | Community data | id, name, slug, core_values, creator_id, member_count |
| `community_members` | Membership | community_id, user_id, role (founder/admin/member), voting_power |
| `community_content` | Content (needs, events, challenges, polls) | type, title, status, created_by, funding_goal |
| `votes` | Content voting | content_id, user_id, vote (approve/reject), weight |
| `need_activities` | Need activity tracking | content_id, title, is_completed |
| `poll_options` | Poll options | content_id, option_text, vote_count |
| `poll_votes` | Poll votes | poll_option_id, user_id |
| `event_registrations` | Event RSVPs | content_id, user_id, status |

#### Marketplace & Courses

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `marketplace_modules` | Modules for sale | title, slug, creator_community_id, pricing, status |
| `module_lessons` | Lessons | module_id, lesson_order, title, story_content, activity_type |
| `course_enrollments` | Enrollments | user_id, module_id, purchase_type, progress_percentage, completed |
| `module_sales` | Sales tracking | module_id, revenue splits |
| `cart_items` | Shopping cart | user_id, module_id, employee_count |

#### Gamification

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `user_xp` | XP tracking | user_id, total_xp, current_tier, tier_progress |
| `xp_transactions` | XP history | user_id, amount, action_type, action_id |
| `user_achievements` | Achievements/badges | user_id, achievement_type, unlocked_at |
| `user_streaks` | Daily streaks | user_id, current_streak, longest_streak |
| `leaderboards` | Rankings | user_id, total_xp, rank, tier |
| `xp_rewards` | XP reward config | action_type, xp_amount |

#### Financial

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `wallets` | Wallets | owner_type, owner_id, balance, currency |
| `wallet_transactions` | Transaction history | wallet_id, amount, type |
| `sponsorships` | Sponsorship payments | content_id, sponsor_id, amount, status |
| `withdrawal_requests` | Withdrawal requests | wallet_id, amount, status |
| `community_treasury` | Community treasury | community_id, balance |
| `treasury_transactions` | Treasury transactions | — |

#### Corporate

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `corporate_accounts` | Corporate accounts | company_name, program_tier, employee_limit |
| `employee_invitations` | Invitations | corporate_account_id, email, status |
| `certifications` | Employee certifications | user_id, module_id, issued_at |
| `impact_metrics` | Corporate impact | community_id, metric_type, value |
| `project_submissions` | Employee projects | — |
| `corporate_activity_log` | Activity log | — |

#### Reviews & Comments

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `module_reviews` | Module reviews | module_id, user_id, rating, review_text |
| `community_reviews` | Community reviews | community_id, user_id, rating |
| `module_review_votes` | Review helpfulness | review_id, user_id |
| `community_review_votes` | Review helpfulness | — |
| `comments` | Comment system | content_id, user_id, body |

#### Other

| Table | Purpose |
|-------|---------|
| `share_links` | Shareable links (poll, event, post) |
| `notifications` | User notifications |
| `deletion_requests` | Account deletion requests |
| `audit_logs` | Audit trail |
| `admin_actions` | Admin action log |
| `platform_settings` | Platform config |
| `promo_codes` | Promotional codes |
| `promo_code_uses` | Promo usage tracking |
| `creator_applications` | Creator applications |
| `lesson_responses` | Lesson activity responses |
| `external_responses` | External form responses |
| `content_shares` | Share tracking |
| `share_clicks` | Share click tracking |

### Database Views

| View | Purpose |
|------|---------|
| `user_xp_breakdown` | XP by action type |
| `leaderboard_view` | Leaderboard with profiles |
| `user_enrolled_modules` | User enrollments with module info |
| `poll_options_with_totals` | Poll options with vote totals |
| `marketplace_modules_with_pricing` | Modules with pricing |
| `enrollment_time_breakdown` | Enrollment analytics |

### Key Database Functions

| Function | Purpose |
|----------|---------|
| `award_xp(user_id, action_type, action_id, description)` | Awards XP from xp_rewards config |
| `check_achievements()` | Unlocks achievements based on activity |
| `update_leaderboard_ranks()` | Refreshes leaderboard rankings |
| `create_user_settings()` | Creates settings for new users (trigger) |
| `get_total_poll_votes(content_id)` | Poll vote totals |
| `get_user_rank(user_id)` | User rank on leaderboard |
| `process_module_sale()` | Processes marketplace sales |
| `get_or_create_wallet()` | Wallet management |

### XP Triggers (automatic XP awarding)

| Trigger | Table | Action |
|---------|-------|--------|
| `trigger_content_xp` | community_content | Create content |
| `trigger_vote_xp` | votes | Vote on content |
| `trigger_comment_xp` | comments | Add comment |
| `trigger_content_approval` | community_content | Content approved |
| `trigger_poll_vote_xp` | poll_votes | Vote on poll |
| `trigger_community_join_xp` | community_members | Join community |
| `trigger_event_rsvp_xp` | event_registrations | RSVP to event |
| `trigger_sponsorship_xp` | sponsorships | Sponsor need |

### XP Rewards (from `xp_rewards` table)

| Action Type | XP Amount (typical) |
|-------------|---------------------|
| lesson_completed | 50 |
| module_completed | 200 |
| sponsor_need | 100 |
| vote_content | 25 |
| create_content | 75 |
| poll_vote | 25 |
| community_join | 50 |
| event_rsvp | 25 |
| review_module | 30 |

### Tier System (from `lib/tier-config.ts`)

| Tier | Name | XP Required | Perks |
|------|------|-------------|-------|
| 1 | Explorer | 0–500 | Basic dashboard, standard features |
| 2 | Contributor | 501–1,500 | Enhanced dashboard, priority support |
| 3 | Changemaker | 1,501–3,500 | Custom theme, badge display |
| 4 | Impact Leader | 3,501–7,500 | Leaderboard access, exclusive events |
| 5 | Legend | 7,501+ | Animated rainbow theme, all perks |

---

## 4. User Features (Complete Inventory)

### Authentication & Account

- Email/password sign up and login
- Password reset (forgot password → email link → reset)
- Email verification
- Profile creation with avatar upload
- User type selection (user, brand, admin)
- Account deletion requests

### Dashboard (Authenticated User)

- Welcome section with tier-based gradients
- XP and tier display (TierProgressionCard)
- Ways to earn XP (XPWaysToEarn)
- Recent activity
- Payments overview
- Quick links to communities, marketplace, achievements

### Communities

- Create communities (name, slug, description, core values, location, media)
- Join/leave communities
- Community settings (media, basic info)
- Community content:
  - **Needs**: Funding requests with activities
  - **Events**: RSVP, location, date/time
  - **Challenges**: Community competitions
  - **Polls**: Democratic voting with options
- Content moderation (approve/reject voting)
- Impact metrics and distribution
- Community modules (create modules from community)
- Module templates
- Treasury management

### Marketplace

- Browse modules (filter by core value, difficulty, industry)
- Module detail pages with reviews
- Shopping cart (add, update, remove, apply promo)
- Checkout via Stripe
- Module creation (by communities)
- Module templates
- Creator applications

### Courses & Learning

- Module enrollment (individual, corporate, team, enterprise, gift)
- Lesson progression with story-driven content
- Interactive activities:
  - Reflection
  - Calculators (cost, impact, ROI)
  - Assessments
  - Evidence upload
- Module tools (calculators, checklists, planners)
- Progress tracking
- Certificate generation and verification
- Corporate employee portal

### Gamification

- XP system with 5 tiers
- Achievement badges (first content, first vote, first sponsor, etc.)
- Daily streak tracking
- Leaderboard rankings
- Tier-based dashboard themes
- Celebration animations (confetti on achievements)
- Retroactive XP and achievement unlocking

### Payments & Sponsorships

- Stripe integration
- Sponsorship of community needs (brands)
- Platform fee (15% for sponsorships)
- Wallet system for revenue distribution
- Treasury donations
- Module purchases
- Promo codes

### Reviews & Social

- Module reviews (1–5 stars, text, helpfulness votes)
- Community reviews
- Comment system
- Share links for content (poll, event, post)
- Public share pages (e.g., event RSVP without login)

### Corporate Features

- Corporate account creation
- Employee invitation system
- Corporate dashboard (progress, certificates, ESG reports)
- Employee self-enrollment
- Impact metrics dashboard
- Certificate management
- ESG report generation
- Checkout for corporate plans

### Admin Features

- Admin dashboard with metrics
- Module review/approval
- User/community/sponsorship moderation
- Deletion request management
- Promo code management (create, toggle, stats)
- Email template management
- Platform settings
- Wallet overview
- System testing tools

### Other

- Location search/autocomplete
- Media upload (images, videos)
- Notifications system
- Mobile-responsive navigation
- Dark/light theme support
- Multi-language support (next-intl)
- Cookie consent
- Assessment/quotation for corporate clients

---

## 5. API Reference

### Authentication

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/reset-password` | Send password reset email |

### Communities

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/communities` | Create community |
| GET/POST | `/api/communities/[id]/media` | Media management |
| PUT | `/api/communities/[id]/basic-update` | Update basic info |
| PUT | `/api/communities/[id]/media-update` | Update media |

### Marketplace

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/marketplace/modules` | List modules |
| GET | `/api/marketplace/modules/[id]` | Module details |
| GET | `/api/marketplace/modules-with-stats` | Modules with stats |
| POST | `/api/marketplace/purchase` | Purchase module |
| GET | `/api/marketplace/templates` | Get templates |

### Cart

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/cart` | Get cart |
| POST | `/api/cart/add` | Add to cart |
| PUT | `/api/cart/update` | Update item |
| DELETE | `/api/cart/remove` | Remove item |
| POST | `/api/cart/apply-promo` | Apply promo code |
| POST | `/api/cart/checkout` | Checkout |
| DELETE | `/api/cart/clear` | Clear cart |

### Modules & Courses

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/modules/[moduleId]` | Get module |
| POST | `/api/modules/create` | Create module |
| GET | `/api/modules/[moduleId]/lessons/[lessonId]` | Get lesson |
| GET | `/api/modules/templates` | Get templates |
| POST | `/api/modules/clone-template` | Clone template |
| GET | `/api/enrollments` | Get enrollments |
| GET | `/api/enrollments/[enrollmentId]/activities` | Get activities |

### Gamification

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/gamification/xp` | Get user XP |
| POST | `/api/gamification/xp` | Award XP |
| GET | `/api/gamification/achievements` | Get achievements |
| GET | `/api/gamification/leaderboard` | Get leaderboard |
| POST | `/api/gamification/retroactive-xp` | Retroactive XP |
| POST | `/api/gamification/retroactive-achievements` | Retroactive achievements |

### Payments & Wallets

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/payments/create-intent` | Create payment intent |
| GET | `/api/verify-payment` | Verify payment |
| GET | `/api/wallets/user` | User wallet |
| GET | `/api/wallets/community` | Community wallet |
| GET | `/api/wallets/[id]` | Get wallet |
| GET | `/api/wallets/[id]/transactions` | Transactions |
| POST | `/api/treasury/donate` | Donate to treasury |
| GET | `/api/treasury/stats` | Treasury stats |
| POST | `/api/treasury/spend` | Spend from treasury |

### Webhooks

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/webhooks/stripe` | Stripe webhooks (checkout, payment_intent) |

### Corporate

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/corporate/signup` | Corporate signup |
| POST | `/api/corporate/invite` | Invite employee |
| POST | `/api/corporate/accept-invitation` | Accept invitation |
| POST | `/api/corporate/self-enroll` | Self-enroll |
| GET | `/api/corporate/progress/module/[moduleId]` | Module progress |
| POST | `/api/corporate/progress/complete-lesson` | Complete lesson |
| POST | `/api/corporate/progress/save-activity` | Save activity |
| POST | `/api/corporate/progress/upload-evidence` | Upload evidence |
| GET | `/api/corporate/progress/enrollment` | Get enrollment |
| GET | `/api/corporate/certificates` | Get certificates |
| GET | `/api/corporate/reports/impact` | Impact report |

### Reviews, Comments, Events, Polls

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/POST | `/api/reviews/modules` | Module reviews |
| GET/POST | `/api/reviews/communities` | Community reviews |
| GET/POST | `/api/comments` | Comments |
| POST | `/api/events/[id]/register` | Event RSVP |
| POST | `/api/polls/[id]/vote` | Poll vote |

### Admin

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/DELETE | `/api/admin` | Admin dashboard/actions |
| POST | `/api/admin/moderate-user` | Moderate user |
| POST | `/api/admin/moderate-community` | Moderate community |
| POST | `/api/admin/moderate-sponsorship` | Moderate sponsorship |
| GET | `/api/admin/modules/pending` | Pending modules |
| POST | `/api/admin/modules/review` | Review module |
| POST | `/api/admin/modules/import` | Import module |
| GET | `/api/admin/promo-codes/stats` | Promo stats |
| POST | `/api/admin/promo-codes/create` | Create promo |
| PUT | `/api/admin/promo-codes/toggle` | Toggle promo |
| GET | `/api/admin/wallets` | All wallets |
| POST | `/api/admin/update-setting` | Update setting |
| GET | `/api/admin/deletion-requests` | Deletion requests |

### Certificates, User, Activities, Other

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/certificates/generate` | Generate certificate |
| GET | `/api/certificates/my-certificates` | User certificates |
| GET | `/api/certificates/latest` | Latest certificate |
| GET | `/api/certificates/verify/[code]` | Verify certificate |
| GET | `/api/user/profile` | User profile |
| GET | `/api/user-stats` | User stats |
| GET | `/api/users/unified-xp` | Unified XP data |
| POST | `/api/activities/save-response` | Save activity |
| POST | `/api/activities/upload-evidence` | Upload evidence |
| POST | `/api/tools/save-result` | Save tool result |
| POST | `/api/assessment/create` | Create assessment |
| GET | `/api/assessment/[id]` | Get assessment |
| POST | `/api/share` | Create share link |
| GET | `/api/landing/stats` | Landing stats |
| GET | `/api/landing/communities` | Featured communities |
| POST | `/api/creator/apply` | Creator application |
| GET | `/api/locations/search` | Location search |
| GET | `/api/esg/generate-report` | ESG report |
| POST | `/api/emails/welcome` | Send welcome email |

### Cron

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/cron/event-reminders` | Event reminders |
| GET | `/api/cron/challenge-reminders` | Challenge reminders |
| GET | `/api/cron/monthly-impact` | Monthly impact |

---

## 6. Connected APIs & Integrations

### Supabase

| Service | Purpose |
|---------|---------|
| **Database** | PostgreSQL with RLS, triggers, views |
| **Auth** | Email/password, OAuth |
| **Storage** | Images, videos, documents, certificates |
| **Real-time** | Subscriptions (comments, notifications) |

**Env vars**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### Stripe

| Feature | Purpose |
|---------|---------|
| Checkout | Module purchases, sponsorships |
| Payment Intents | Payment processing |
| Webhooks | checkout.session.completed, payment_intent.succeeded/failed |

**Env vars**: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`

### Resend

| Feature | Purpose |
|---------|---------|
| Transactional emails | Welcome, password reset, event RSVP, sponsorship approval, monthly reports, employee invitations |

**Env vars**: `RESEND_API_KEY`  
**From**: `comunidad@crowdconscious.app`

### Upstash Redis

| Feature | Purpose |
|---------|---------|
| Rate limiting | API protection |

**Env vars**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

### Vercel

| Feature | Purpose |
|---------|---------|
| Analytics | `@vercel/analytics` |
| Speed Insights | `@vercel/speed-insights` |
| Deployment | Edge, auto-scaling |

---

## 7. Values & Code Quality

### Architecture Principles

1. **Server-first**: Next.js 15 server components for performance
2. **Type-safe**: TypeScript and Zod validation
3. **Security-first**: RLS on tables, SECURITY INVOKER on views
4. **Mobile-responsive**: Touch-friendly, responsive layouts
5. **Modular**: Feature-based organization

### Code Quality Practices

| Practice | Implementation |
|----------|----------------|
| **Validation** | Zod schemas in `lib/validation-schemas.ts` for API requests |
| **Error handling** | Try/catch, NextResponse.json with status codes |
| **Logging** | Console logging for debugging (leaderboard, auth, etc.) |
| **Rate limiting** | Upstash Redis via `lib/rate-limit.ts` |
| **Monitoring** | `lib/monitoring.ts`, `lib/monitoring-simple.ts` |
| **Error tracking** | `lib/error-tracking.ts` |
| **Quality control** | `lib/quality-control-validation.ts` |

### Validation Schemas (Zod)

- `userIdSchema`, `emailSchema`, `passwordSchema`
- `moduleIdSchema`, `enrollmentIdSchema`, `lessonIdSchema`
- `purchaseModuleSchema`, `addToCartSchema`, `applyPromoCodeSchema`
- `createCheckoutSchema` (sponsorship checkout)
- `completeLessonSchema`, `createEnrollmentSchema`

### Security Measures

- Row Level Security (RLS) on all tables
- Views with `security_invoker = true`
- `SECURITY DEFINER` only where needed (e.g., `create_user_settings`)
- Policy-based access control
- Stripe webhook signature verification

---

## 8. Possible Improvements

### High Priority (Gamification & UX)

1. **Tier theme system**: Apply tier colors to dashboard backgrounds, progress bars, and UI elements (partially done; Legend rainbow animation incomplete).
2. **XP display everywhere**: XP badge in header, profile, community pages.
3. **Tier perks implementation**: Actual feature unlocks (priority support, early access, custom themes) instead of text-only.
4. **Leaderboard robustness**: Ensure leaderboard consistently shows data from `user_stats`/`user_xp` with correct fallbacks.

### Medium Priority (Engagement & Quality)

5. **Achievement progress indicators**: Show progress toward locked achievements (e.g., "3/5 modules completed").
6. **Sound effects** (optional): Level-up, achievement, XP gain sounds with user preference toggle.
7. **Haptic feedback**: Mobile haptics for achievements and tier-ups.
8. **Retroactive migrations**: Run retroactive XP and achievements for existing users (scripts exist; verify and run in staging).

### Technical & Maintainability

9. **API response consistency**: Standardize `{ success, data, error }` format across routes.
10. **Error boundaries**: Add React error boundaries for graceful failure handling.
11. **E2E tests**: Playwright or Cypress for critical flows (auth, checkout, content creation).
12. **Database migration consolidation**: Many overlapping migrations; consider a clean baseline and incremental migrations.

### Performance

13. **Caching**: Implement caching for leaderboard, marketplace modules, landing stats (see `CACHING-STRATEGY-VERCEL.md`).
14. **Image optimization**: Ensure all images use Next.js Image component.
15. **Bundle analysis**: Identify and reduce large dependencies.

### Security

16. **Auth token refresh**: Ensure robust handling of Supabase session refresh.
17. **Input sanitization**: Validate and sanitize user-generated content (comments, descriptions).
18. **Admin audit trail**: Ensure all admin actions are logged.

### Documentation

19. **API documentation**: OpenAPI/Swagger for API routes.
20. **Component storybook**: Document UI components.
21. **Runbook**: Operational runbook for deployment, rollback, and incident response.

---

## Appendix: Key File References

| Area | Key Files |
|------|-----------|
| Auth | `lib/auth.ts`, `lib/auth-server.ts`, `app/(public)/login/`, `app/(public)/signup/` |
| Gamification | `lib/tier-config.ts`, `lib/xp-system.ts`, `hooks/useUserTier.ts`, `components/gamification/*` |
| Database types | `types/database.ts` |
| Validation | `lib/validation-schemas.ts` |
| Stripe | `lib/stripe.ts`, `app/api/webhooks/stripe/` |
| Email | `lib/resend.ts`, `app/lib/email-templates/` |

---

*This document is generated from codebase exploration and existing documentation. Update as the platform evolves.*
