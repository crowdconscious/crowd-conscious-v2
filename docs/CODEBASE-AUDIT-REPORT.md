# Crowd Conscious Codebase Audit Report

**Generated:** March 10, 2025

---

## 1. Database Tables: KEEP vs DELETE

### KEEP – Prediction Platform (Active)

| Table | Reason |
|-------|--------|
| `profiles` | Core user data, used everywhere |
| `prediction_markets` | Main prediction markets |
| `market_outcomes` | Multi-outcome support (126_market_overhaul) |
| `market_votes` | Free-to-play votes (replaces prediction_trades for voting) |
| `prediction_trades` | Paid trading (still referenced in admin resolve, history) |
| `prediction_positions` | User positions |
| `prediction_wallets` | User wallet balances |
| `prediction_deposits` | Stripe deposits |
| `prediction_market_history` | Price/probability history |
| `conscious_fund` | Fund balance |
| `conscious_fund_transactions` | Fund transactions |
| `fund_causes` | Causes to vote on |
| `fund_votes` | User votes on causes |
| `conscious_inbox` | User-submitted market ideas |
| `inbox_votes` | Upvotes on inbox items |
| `agent_content` | AI-generated content |
| `agent_runs` | Agent execution log |
| `sentiment_scores` | Market sentiment |
| `market_comments` | Comments on markets |
| `notifications` | User notifications |
| `user_xp` | XP totals |
| `xp_transactions` | XP history |
| `user_achievements` | Achievements |
| `leaderboards` | Leaderboard view |
| `platform_settings` | Admin settings |
| `admin_actions` | Admin audit log |

### KEEP – Concientizaciones / Corporate (Active)

| Table | Reason |
|-------|--------|
| `corporate_accounts` | Corporate signup |
| `employee_invitations` | Invite flow |
| `course_enrollments` | Module enrollments |
| `lesson_responses` | Lesson progress |
| `activity_responses` | Activity answers |
| `certifications` | Certificates |
| `marketplace_modules` | Modules catalog |
| `module_lessons` | Lesson content |
| `module_reviews` | Module reviews |
| `external_responses` | External form responses |

### KEEP – Shared / Infrastructure

| Table | Reason |
|-------|--------|
| `deletion_requests` | GDPR deletion |
| `audit_logs` | Payment audit |
| `promo_codes` | Promotions |
| `promo_code_uses` | Promo usage |
| `comments` | DiscussionSystem (generic) |
| `trusted_brands` | Landing page |
| `wallets` | Creator wallets |
| `wallet_transactions` | Wallet history |
| `cart_items` | Checkout |
| `payment_transactions` | Stripe payments |

### DELETE or DEPRECATE – OLD Community App (Legacy)

| Table | Reason |
|-------|--------|
| `communities` | Community pages removed; only admin/landing APIs use it |
| `community_members` | Used by admin, ImpactDashboard, DashboardCalendar, create-checkout |
| `community_content` | Used by admin, landing stats, sponsorship webhooks |
| `votes` | OLD content votes; only retroactive-xp uses it |
| `need_activities` | OLD community needs; no active code references |
| `poll_options` | OLD community polls; no active code references |
| `poll_votes` | Used only in deletion-requests cascade |
| `event_registrations` | OLD community events; EventRegistration + DashboardCalendar use it |
| `share_links` | OLD sharing; no active code references |
| `sponsorships` | OLD community content sponsorships; MySponsorships, webhooks, create-checkout use it |
| `impact_metrics` | OLD community metrics; types/database has it, check usage |

**Recommendation:** Do not drop community tables yet. Many APIs (admin, landing, create-checkout, sponsorship webhooks, deletion) still depend on them. First remove or replace those callers, then deprecate.

---

## 2. App Routes: ACTIVE vs LEGACY

### ACTIVE – Prediction Platform

| Route | File | Status |
|-------|------|--------|
| `/` | `app/page.tsx` | Landing (markets, fund) |
| `/predictions` | `(predictions)/predictions/page.tsx` | Main dashboard |
| `/predictions/markets` | `(predictions)/predictions/markets/page.tsx` | Markets list |
| `/predictions/markets/[id]` | `(predictions)/predictions/markets/[id]/page.tsx` | Market detail |
| `/predictions/inbox` | `(predictions)/predictions/inbox/page.tsx` | Conscious Inbox |
| `/predictions/fund` | `(predictions)/predictions/fund/page.tsx` | Fund causes |
| `/predictions/wallet` | `(predictions)/predictions/wallet/page.tsx` | Wallet |
| `/predictions/leaderboard` | `(predictions)/predictions/leaderboard/page.tsx` | Leaderboard |
| `/predictions/insights` | `(predictions)/predictions/insights/page.tsx` | Insights |
| `/predictions/trades` | `(predictions)/predictions/trades/page.tsx` | Trades |
| `/predictions/admin/*` | inbox, resolve, create-market, agents | Admin tools |
| `/markets` | `(public)/markets/page.tsx` | Public markets |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | `(public)/` | Auth |
| `/about`, `/privacy`, `/terms`, `/cookies` | `(public)/` | Legal |
| `/sponsor` | `(public)/sponsor/page.tsx` | Sponsor markets |
| `/verify`, `/verify/[code]` | `verify/` | Email verify |

### ACTIVE – Concientizaciones / Corporate

| Route | File | Status |
|-------|------|--------|
| `/concientizaciones` | `concientizaciones/page.tsx` | Concientizaciones landing |
| `/corporate/*` | dashboard, employees, settings, impact, progress, checkout, certificates, esg-reports | Corporate portal |
| `/employee-portal/*` | dashboard, courses, modules, certifications, impact | Employee portal |
| `/employee-portal-public/accept-invitation` | Accept invite |
| `/signup-corporate` | Corporate signup |

### ACTIVE – App (Shared)

| Route | File | Status |
|-------|------|--------|
| `/dashboard` | Redirects to `/predictions` | Redirect only |
| `/profile` | `(app)/profile/page.tsx` | Profile |
| `/settings` | `(app)/settings/page.tsx` | Settings |
| `/leaderboard` | `(app)/leaderboard/page.tsx` | Leaderboard |
| `/achievements` | `(app)/achievements/page.tsx` | Achievements |
| `/admin` | `admin/page.tsx` | Admin dashboard |
| `/admin/*` | markets, promo-codes, deletions, metrics, email-templates, etc. | Admin tools |

### LEGACY – Community Routes (Missing)

| Route | Status |
|-------|--------|
| `/communities` | **404** – No page exists |
| `/communities/new` | **404** – No page exists |
| `/communities/[id]` | **404** – No page exists |
| `/communities/[id]/content/[contentId]` | **404** – No page exists |
| `/communities/[id]/content/[contentId]/sponsor` | **404** – No page exists |
| `/communities/[id]/modules` | **404** – No page exists |
| `/communities/[id]/settings` | **404** – No page exists |
| `/communities/[id]/impact` | **404** – No page exists |

**Note:** Many links point to `/communities`, `/communities/new`, `/communities/[id]` (SimpleDashboard, DashboardClient, EnhancedDashboard, Footer, concientizaciones, email templates, etc.) but these routes do not exist. Users get 404s.

---

## 3. Import Graph – Community Components

### Orphaned (Never Imported)

| File | Notes |
|------|-------|
| `app/components/landing/CommunityCarousel.tsx` | Not imported anywhere |
| `app/components/landing/ImpactCounters.tsx` | Not imported anywhere |
| `app/components/landing/AnimatedHero.tsx` | Not imported anywhere |

### Community API Usage

| API | Used By | Tables |
|-----|---------|--------|
| `/api/landing/communities` | **Not used** – no page imports/fetches it | communities, community_content |
| `/api/landing/stats` | **Not used** – no page imports/fetches it | communities, community_content, community_members |
| `/api/reviews/communities` | `ReviewsList.tsx` (communityId) | community_reviews, community_members |
| `/api/admin` | AdminDashboardClient | communities, community_content, community_members |

### `components/community/*`

- **Does not exist.** Only mentioned in `COMMUNITY-PLATFORM-FIXES.md` as a design reference.

---

## 4. Files Safe to Delete vs Need Review

### Safe to Delete (Orphaned / Dead Code)

| File | Reason |
|------|--------|
| `app/components/landing/CommunityCarousel.tsx` | Never imported |
| `app/components/landing/ImpactCounters.tsx` | Never imported |
| `app/components/landing/AnimatedHero.tsx` | Never imported |
| `app/(app)/dashboard/SimpleDashboard.tsx` | Dashboard redirects to /predictions; never rendered |
| `app/(app)/dashboard/EnhancedDashboard.tsx` | Never imported |
| `app/(app)/dashboard/NewEnhancedDashboard.tsx` | Never imported |
| `app/(app)/dashboard/DashboardClient.tsx` | Never imported |
| `app/(app)/dashboard/ImpactDashboard.tsx` | Only used by EnhancedDashboard/NewEnhancedDashboard (both dead) |
| `app/(app)/dashboard/PersonalizedDashboard.tsx` | Never imported |
| `app/components/DashboardCalendar.tsx` | Only used by EnhancedDashboard/NewEnhancedDashboard (both dead) |

### Need Review Before Delete

| File | Reason |
|------|--------|
| `app/api/landing/communities/route.ts` | Not used by any page; could remove or repurpose |
| `app/api/landing/stats/route.ts` | Not used by any page; could remove or repurpose |
| `app/api/create-checkout/route.ts` | Uses `communities` for Stripe – check if still needed |
| `app/api/admin/route.ts` | Uses communities/content – admin still needs it |
| `app/api/admin/deletion-requests/[id]/route.ts` | Cascades through community tables – keep for GDPR |
| `app/components/MySponsorships.tsx` | Uses sponsorships; links to /communities (404) |
| `app/components/DashboardCalendar.tsx` | Uses community_content, event_registrations – only in dead dashboards |

### Links to Fix (Point to 404)

- `SimpleDashboard.tsx`: `/communities`, `/communities/new`
- `DashboardClient.tsx`: `/communities` (multiple)
- `EnhancedDashboard.tsx`: `/communities`
- `PersonalizedDashboard.tsx`: `/communities`
- `Footer.tsx`: `/communities` nav item
- `concientizaciones/page.tsx`: `/communities` in footer
- `components/TrustedBrands.tsx`: `/communities`
- `components/ui/UIComponents.tsx`: `/communities` nav
- `components/Navigation.tsx`: `/communities`
- `app/components/MySponsorships.tsx`: `/communities`, `/communities/[id]`
- `app/components/landing/CommunityCarousel.tsx`: `/communities/[id]` (orphaned)
- Email templates: `base-template`, `monthly-impact-report`, `achievement-unlocked`, `welcome-email`, `lib/email-simple.ts`

---

## 5. Summary

| Category | Count |
|----------|-------|
| **Prediction tables (KEEP)** | 25+ |
| **Concientizaciones tables (KEEP)** | 10+ |
| **Legacy community tables (DEPRECATE)** | 10 |
| **Active prediction routes** | 15+ |
| **Active concientizaciones routes** | 12+ |
| **Legacy community routes (404)** | 8+ |
| **Orphaned components (safe delete)** | 10 |
| **APIs needing review** | 3 |

**Main takeaway:** The prediction platform and concientizaciones are active. The old community app (communities, content, votes, polls, events) has no frontend routes; only admin, landing APIs, and some webhooks still use those tables. Several dashboard variants and landing components are dead code and can be removed.
