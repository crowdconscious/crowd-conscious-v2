# Crowd Conscious — App Context & Description

A comprehensive description of what Crowd Conscious is, what it stands for, what it does, how it works, and its current state. Use this as context for onboarding, AI assistants, or stakeholders.

---

## What Crowd Conscious Stands For

**Mission:** Collective consciousness for social good.

Crowd Conscious believes that when people express their opinions freely, collective intelligence emerges — and that intelligence should fund real-world change. Prediction markets have proven remarkably accurate at forecasting events, but platforms like Polymarket are built for speculation. Crowd Conscious asks: *what if we channeled that same engagement toward social impact?*

**Core principles:**
- **Free-to-play predictions** — Users predict on markets (World Cup, economy, policy, sustainability) without risking money.
- **Democratic giving** — Brands sponsor markets; 40% of every sponsorship goes to community causes. Users vote on which causes receive grants. It's democratic prediction meets democratic giving.
- **Collective intelligence** — Every prediction earns XP and shifts the crowd probability. Your voice shapes the consensus.
- **Virtuous cycle** — Brands sponsor → fund grows → users vote on causes → community impact → more engagement.

---

## What the App Is Capable of Doing

### For Users (General Public)
- **Sign up / Log in** — Email/password via Supabase Auth; email confirmation required.
- **Make predictions** — Browse prediction markets by category (world, government, corporate, community, cause, sustainability, World Cup). Vote on outcomes with confidence levels. Free-to-play; no money required.
- **Earn XP & achievements** — Every vote earns XP. Achievements unlock (Voice Heard, Democracy Champion, Fund Voice, etc.). Tiers and streaks track progress.
- **Vote on causes** — Conscious Fund: users vote on which community causes receive grants. Monthly allocation based on votes.
- **Leaderboard** — See rankings by XP. Compete with other users.
- **Conscious Inbox** — Submit market ideas; upvote others' ideas. Community-driven market creation.
- **Notifications** — In-app notifications for market updates, achievements, etc.
- **Comments** — Comment on markets. Engage in discussion.
- **Sponsor reports** — Sponsors receive private impact reports (views, predictions, reach) via secure token link.

### For Brands / Sponsors
- **Sponsor markets** — Tiered sponsorship: Market (single market), Category (all markets in a category), Impact (platform-wide), Patron. Stripe checkout. Logo and link on market cards.
- **Impact reports** — Private dashboard showing reach, predictions, unique users. Access via report token.

### For Corporate / B2B
- **Corporate accounts** — Create accounts, invite employees.
- **Employee invitations** — Email invites; employees accept and join portal.
- **Employee portal** — Enroll in modules, complete lessons, earn certificates.
- **Marketplace modules** — Catalog of learning modules with lessons, progress tracking, certifications.

### For Admins
- **Metrics** — Platform metrics, user counts, market stats.
- **Market management** — Create markets, resolve markets, manage outcomes.
- **Agent management** — View AI agent runs, trigger agents manually.
- **Deletion requests** — GDPR deletion workflow.
- **Promo codes** — Create and manage promo codes.
- **Settings** — Platform settings (fees, min/max sponsorship, etc.).
- **Sponsors** — View all sponsorships, share report links.

### AI Agents (Automated)
- **CEO Digest** — Weekly digest of platform activity.
- **Content Creator** — Generates social posts, market insights.
- **News Monitor** — Monitors news, creates summaries and sentiment reports.
- **Inbox Curator** — Curates Conscious Inbox submissions.
- **Sponsor Report** — Generates sponsor impact reports (monthly).

---

## User Experience Flow

### New User Journey
1. **Landing** (`/`) — Sees markets, Conscious Fund stats, sponsor value prop. CTA: Sign up or Log in.
2. **Sign up** (`/signup`) — Email, password, full name. Supabase creates user. Email confirmation sent.
3. **Confirm email** — Clicks link → `/auth/callback` → session established → `ensure-profile` creates profile + user_stats → redirect to `/predictions`.
4. **Predictions dashboard** — Sees markets, wallet (empty), fund, inbox. Can vote, earn XP.
5. **First vote** — Picks outcome, confidence. XP awarded. Achievement may unlock.
6. **Leaderboard** — Sees rank. Can view profile, achievements, settings.

### Returning User
- **Login** (`/login`) → `/dashboard` or `/predictions`.
- **Notifications** — Bell icon; polls every 60s. On 401 (session expired), redirects to login.
- **Wallet** — Optional Stripe deposit for paid trading (legacy; primary flow is free-to-play votes).

### Sponsor Journey
- **Sponsor page** (`/sponsor`) — Browse unsponsored/sponsored markets. Choose tier. Checkout via Stripe.
- **Post-payment** — Webhook creates sponsorship record. Sponsor receives email. Report link sent.
- **Report** (`/sponsor/report/[id]?token=...`) — Private impact dashboard.

### Corporate Journey
- **Admin invites** — Corporate admin sends invite. Employee receives email.
- **Accept** (`/employee-portal-public/accept`) — Enters details, creates account.
- **Portal** — Enrolls in modules, completes lessons, earns certificates.

---

## Technical Architecture

### Stack
- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **Payments:** Stripe
- **AI:** Anthropic (Claude) for agents
- **Email:** Resend
- **Rate limiting:** Upstash Redis
- **Deployment:** Vercel (crons, serverless)

### Code Structure
- **Route groups:** `(app)` — auth-required app; `(public)` — login, signup, about, sponsor; `(predictions)` — predictions feature; `corporate`, `employee-portal`, `admin`
- **Auth:** Layout-based. `getCurrentUser()` in each protected layout; redirect to `/login` if null. Middleware does not enforce auth.
- **API:** 117+ routes. Auth via `getCurrentUser()` or service role for cron/webhooks.
- **Lib:** Supabase clients (browser, server, admin), auth helpers, agents, design system, validation (Zod)

### Backend (Database)
- **40+ tables** across predictions, gamification, corporate, community, admin
- **Key tables:** profiles, prediction_markets, market_outcomes, market_votes, prediction_wallets, conscious_fund, fund_causes, fund_votes, agent_content, agent_runs, notifications, user_xp, user_achievements, sponsorships, course_enrollments
- **RLS:** Row-level security on all public tables. Policies for SELECT/INSERT/UPDATE/DELETE by role (anon, authenticated, admin, service role).
- **Triggers:** updated_at, trade history, XP awards, notifications, leaderboard rank updates
- **Functions:** SECURITY DEFINER for trades, wallets, XP, notifications (bypass RLS for trusted operations)

### Agents
- **Cron:** Vercel crons at 09:00 UTC daily (CEO Digest, Content Creator, News Monitor, Inbox Curator); monthly on 1st (Sponsor Report, Monthly Impact).
- **Auth:** `CRON_SECRET` in Authorization header.
- **Logging:** `agent_runs` table stores status, duration, tokens, errors.

---

## Current State of Things

### What's Working
- **Signup / Login** — Fixed. Triggers on auth.users dropped; ensure-profile creates profiles and user_stats.
- **Predictions** — Markets, votes, XP, leaderboard, fund voting.
- **Conscious Fund** — Causes, votes, allocation.
- **Sponsorship** — Stripe checkout, webhooks, reports.
- **Notifications** — API, bell component, 401 redirect on session expiry.
- **Auth** — Refresh token handling: invalid sessions cleared, redirect to login.
- **Admin** — Metrics, markets, agents, deletions, promo codes.
- **Corporate** — Invites, portal, enrollments, certificates.

### Recent Fixes
- Signup triggers removed (were causing "Something went wrong")
- Refresh token errors: no log noise, cookies cleared, 401 + redirect
- payment_transactions RLS: admins can SELECT
- votes view: dropped (SECURITY DEFINER)

### Known / Deferred
- **889 function_search_path_mutable warnings** — Low risk; fix incrementally.
- **Legacy community tables** — communities, community_content, etc. still used by admin, landing, webhooks. Not dropped.
- **No .env.example** — Recommended to add.
- **Leaked password protection** — Disabled in Supabase; recommend enabling.

### Environment
- **Required vars:** Supabase URL/key, service role key, Stripe keys, Resend, CRON_SECRET, ANTHROPIC_API_KEY, NEXT_PUBLIC_APP_URL, etc.
- **Optional:** PREDICTIONS_ACCESS_CODE (gate), news API keys (News Monitor), Upstash (rate limit).

---

## Summary in One Paragraph

Crowd Conscious is a free-to-play prediction platform where users vote on markets (World Cup, economy, policy, sustainability), earn XP, and shape collective probability. Brands sponsor markets; 40% of sponsorship goes to the Conscious Fund. Users vote on which community causes receive grants — democratic prediction meets democratic giving. The app includes gamification (achievements, tiers, streaks), corporate learning (invites, modules, certificates), AI-generated content (digests, news, sponsor reports), and admin tools. Built with Next.js 15, Supabase, Stripe, and Anthropic. Auth is layout-based; signup and refresh token handling have been recently fixed.
