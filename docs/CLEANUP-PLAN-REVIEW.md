# Crowd Conscious Cleanup Plan — For Review

**Generated:** 2026-03-10  
**Purpose:** Remove legacy tables and files from the previous community/brand app while preserving the prediction platform and Concientizaciones.

**⚠️ DO NOT EXECUTE until you have reviewed and approved.**

---

## PHASE 1: WHAT WE KEEP (DO NOT TOUCH)

### Prediction Platform
- `prediction_markets`, `market_outcomes`, `market_votes`, `prediction_market_history`
- `prediction_trades`, `prediction_positions`, `prediction_wallets`, `prediction_deposits`
- `profiles`, `user_xp`, `xp_transactions`, `user_stats` (leaderboard)
- `conscious_fund`, `conscious_fund_transactions`, `fund_causes`, `fund_votes`
- `conscious_inbox`, `inbox_votes`, `market_comments`, `notifications`
- `agent_content`, `agent_runs`, `sentiment_scores`

### Concientizaciones (Corporate / Employee Portal)
- `corporate_accounts`, `employee_invitations`, `course_enrollments`
- `marketplace_modules`, `module_lessons`, `certifications`
- `lesson_responses`, `activity_responses`, `lesson_progress`
- `external_responses` (used by Concientizaciones forms)
- `module_reviews` (module reviews)

### Shared / Infrastructure
- `auth.users` (never touch)
- `platform_settings`, `admin_actions`
- `deletion_requests` (GDPR)
- `comments` (generic DiscussionSystem)
- `promo_codes`, `promo_code_uses` (admin uses)
- `payment_transactions` (Stripe)
- `cart_items` (corporate checkout)

### Note on `sponsorships`
- `sponsorships` in types/database is for **OLD community content** sponsorships (content_id → community_content).
- Prediction market sponsors use `sponsor_name`, `sponsor_contribution` columns on `prediction_markets` — no separate table.
- `SponsorshipCheckout`, `MySponsorships`, webhooks still reference `sponsorships`. **Recommendation:** Keep for now; migrate or remove callers later.

---

## PHASE 2: DATABASE TABLES — KEEP vs DELETE

### Your schema (verified 2026-03-10)

Tables in your `public` schema mapped to KEEP vs DELETE:

**KEEP:** `profiles`, `prediction_markets`, `market_outcomes`, `market_votes`, `prediction_market_history`, `prediction_trades`, `prediction_positions`, `prediction_wallets`, `prediction_deposits`, `conscious_fund`, `conscious_fund_transactions`, `fund_causes`, `fund_votes`, `conscious_inbox`, `inbox_votes`, `market_comments`, `notifications`, `agent_content`, `agent_runs`, `sentiment_scores`, `user_xp`, `xp_transactions`, `user_stats`, `user_achievements`, `leaderboards`, `xp_rewards`, `corporate_accounts`, `employee_invitations`, `course_enrollments`, `marketplace_modules`, `module_lessons`, `module_reviews`, `module_progress`, `certifications`, `lesson_responses`, `activity_responses`, `external_responses`, `courses`, `course_modules`, `platform_settings`, `admin_actions`, `deletion_requests`, `comments`, `cart_items`, `payment_transactions`, `promo_codes`, `promo_code_uses`, `wallets`, `wallet_transactions`, `user_settings`, `user_preferences`, `user_streaks`, `user_follows`, `esg_reports`

### Tables to DELETE (Legacy Community App)

| Table | Reason | FK Dependencies |
|-------|--------|-----------------|
| `communities` | No community pages; only admin/landing APIs use it | community_members, community_content, impact_metrics, votes, etc. |
| `community_members` | Used only by legacy community | community_id → communities |
| `community_content` | Used by admin, landing stats, sponsorship webhooks | community_id → communities; need_activities, poll_options, etc. |
| `votes` | OLD content votes; only retroactive-xp uses it | content_id → community_content |
| `need_activities` | OLD community needs | content_id → community_content |
| `poll_options` | OLD community polls | content_id → community_content |
| `poll_votes` | OLD community polls | poll_option_id, content_id |
| `event_registrations` | OLD community events | content_id → community_content |
| `share_links` | OLD sharing | content_id → community_content |
| `impact_metrics` | OLD community metrics (community_id) | community_id → communities |
| `community_wallets` | OLD marketplace | community_id → communities |
| `community_treasury` | OLD treasury | community_id |
| `treasury_transactions` | OLD treasury | — |
| `content_shares` | OLD share tracking | — |
| `share_clicks` | OLD share tracking | — |
| `referrals` | OLD referrals | — |
| `community_reviews` | OLD community reviews | community_id |
| `community_review_votes` | OLD community reviews | — |
| `sponsorships` | OLD community content sponsorships | content_id, sponsor_id |
| `brand_preferences` | OLD brand system | — |
| `sponsorship_applications` | OLD brand system | — |
| `brand_community_relationships` | OLD brand system | — |
| `creator_applications` | OLD marketplace | — |
| `revenue_transactions` | OLD marketplace | — |
| `weekly_challenges` | OLD gamification | — |
| `user_challenge_progress` | OLD gamification | — |
| `withdrawal_requests` | OLD wallet withdrawals | — |
| `company_assessments` | OLD company assessments | — |
| `neighborhood_partnerships` | OLD neighborhood | — |
| `impact_measurements` | OLD (different from impact_metrics) | — |
| `corporate_impact_metrics` | OLD corporate metrics | — |
| `module_sales` | OLD marketplace sales | — |

**Note:** `community_reviews` and `community_review_votes` do not exist in your schema — omitted from script.

### Row counts (verified 2026-03-10)

| Table | Rows | Recommendation |
|-------|------|----------------|
| **0 rows — safe to delete** | | |
| community_wallets | 0 | ✅ Delete |
| treasury_transactions | 0 | ✅ Delete |
| votes | 0 | ✅ Delete |
| share_links | 0 | ✅ Delete |
| share_clicks | 0 | ✅ Delete |
| referrals | 0 | ✅ Delete |
| impact_metrics | 0 | ✅ Delete |
| impact_measurements | 0 | ✅ Delete |
| corporate_impact_metrics | 0 | ✅ Delete |
| brand_preferences | 0 | ✅ Delete |
| sponsorship_applications | 0 | ✅ Delete |
| brand_community_relationships | 0 | ✅ Delete |
| creator_applications | 0 | ✅ Delete |
| revenue_transactions | 0 | ✅ Delete |
| user_challenge_progress | 0 | ✅ Delete |
| withdrawal_requests | 0 | ✅ Delete |
| company_assessments | 0 | ✅ Delete |
| neighborhood_partnerships | 0 | ✅ Delete |
| **Has data — review before delete** | | |
| communities | 6 | ⚠️ Data loss |
| community_members | 20 | ⚠️ Data loss |
| community_content | 16 | ⚠️ Data loss |
| community_treasury | 2 | ⚠️ Data loss |
| need_activities | 19 | ⚠️ Data loss |
| poll_options | 11 | ⚠️ Data loss |
| poll_votes | 16 | ⚠️ Data loss |
| event_registrations | 9 | ⚠️ Data loss |
| content_shares | 683 | ⚠️ Largest — data loss |
| sponsorships | 10 | ⚠️ Data loss |
| module_sales | 29 | ⚠️ Data loss |
| weekly_challenges | 2 | ⚠️ Data loss |

### Tables to KEEP (User’s DELETE list but we need them)

| Table | User’s List | Reason to KEEP |
|-------|-------------|----------------|
| `corporate_accounts` | DELETE | **KEEP** — Concientizaciones corporate signup |
| `employee_invitations` | DELETE | **KEEP** — Concientizaciones invite flow |
| `marketplace_modules` | DELETE | **KEEP** — Concientizaciones modules catalog |
| `external_responses` | DELETE | **KEEP** — Concientizaciones external forms |
| `platform_settings` | DELETE | **KEEP** — Admin uses it |
| `deletion_requests` | DELETE | **KEEP** — GDPR |

### Tables that may not exist (check schema first)

Run in Supabase SQL Editor:

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

Then for each DELETE candidate:

```sql
SELECT COUNT(*) FROM table_name;
```

If a table has 0 rows, it's safe to delete. If it has data, list it for review.

---

## PHASE 3: SQL CLEANUP SCRIPT (REVIEW BEFORE RUNNING)

**⚠️ Before running:** Run the schema queries above. Adjust the script based on which tables actually exist and what FKs reference them.

```sql
-- Crowd Conscious Database Cleanup
-- Generated: 2026-03-10
-- Purpose: Remove legacy tables from previous community app
-- KEEP: prediction_markets, market_outcomes, market_votes, profiles,
--       user_stats, conscious_inbox, inbox_votes, market_comments,
--       notifications, agent_content, agent_runs, fund_causes, fund_votes,
--       corporate_accounts, employee_invitations, course_enrollments,
--       marketplace_modules, module_lessons, certifications, etc.

-- ============================================================
-- STEP 0: VERIFY BEFORE RUNNING (run these first)
-- ============================================================
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- For each table below: SELECT COUNT(*) FROM table_name;

-- ============================================================
-- STEP 1: Drop foreign key constraints (order matters)
-- ============================================================
-- You must inspect: SELECT conname, conrelid::regclass, confrelid::regclass
-- FROM pg_constraint WHERE contype = 'f' AND confrelid::regclass::text IN ('communities', 'community_content', ...);

-- Example (adjust constraint names from your schema):
-- ALTER TABLE community_members DROP CONSTRAINT IF EXISTS community_members_community_id_fkey;
-- ALTER TABLE community_content DROP CONSTRAINT IF EXISTS community_content_community_id_fkey;
-- ALTER TABLE community_content DROP CONSTRAINT IF EXISTS community_content_created_by_fkey;
-- ... (repeat for each FK)

-- ============================================================
-- STEP 2: Drop legacy tables (CASCADE will drop dependent objects)
-- ============================================================
DROP TABLE IF EXISTS poll_votes CASCADE;
DROP TABLE IF EXISTS poll_options CASCADE;
DROP TABLE IF EXISTS need_activities CASCADE;
DROP TABLE IF EXISTS event_registrations CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS share_links CASCADE;
DROP TABLE IF EXISTS impact_metrics CASCADE;
DROP TABLE IF EXISTS community_content CASCADE;
DROP TABLE IF EXISTS community_members CASCADE;
DROP TABLE IF EXISTS community_wallets CASCADE;
DROP TABLE IF EXISTS community_treasury CASCADE;
DROP TABLE IF EXISTS treasury_transactions CASCADE;
DROP TABLE IF EXISTS content_shares CASCADE;
DROP TABLE IF EXISTS share_clicks CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS community_review_votes CASCADE;
DROP TABLE IF EXISTS community_reviews CASCADE;
DROP TABLE IF EXISTS sponsorships CASCADE;
DROP TABLE IF EXISTS communities CASCADE;
DROP TABLE IF EXISTS brand_preferences CASCADE;
DROP TABLE IF EXISTS sponsorship_applications CASCADE;
DROP TABLE IF EXISTS brand_community_relationships CASCADE;
DROP TABLE IF EXISTS creator_applications CASCADE;
DROP TABLE IF EXISTS revenue_transactions CASCADE;
DROP TABLE IF EXISTS weekly_challenges CASCADE;
DROP TABLE IF EXISTS user_challenge_progress CASCADE;
DROP TABLE IF EXISTS withdrawal_requests CASCADE;

-- ============================================================
-- STEP 3: Verify remaining tables
-- ============================================================
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

**Important:** After dropping these tables, you must update:

1. **`types/database.ts`** — Remove the deleted table types
2. **API routes** that reference these tables — Remove or refactor:
   - `app/api/landing/communities/route.ts`
   - `app/api/landing/stats/route.ts`
   - `app/api/create-checkout/route.ts` (uses communities)
   - `app/api/admin/route.ts` (uses communities)
   - `app/api/admin/deletion-requests/*` (cascades through community tables)
   - `app/api/admin/moderate-sponsorship/route.ts`
   - `app/api/admin/moderate-community/route.ts`
   - `app/api/gamification/retroactive-xp/route.ts` (uses votes, community_content)
   - `app/api/webhooks/stripe/handlers/sponsorship.ts`
   - `app/api/emails/sponsorship-approved/route.ts`
   - `app/api/reviews/communities/route.ts`
   - `app/api/cron/monthly-impact/route.ts` (check for community refs)
   - `app/components/SponsorshipCheckout.tsx`
   - `app/components/MySponsorships.tsx`
   - `app/components/EventRegistration.tsx`
   - `app/admin/AdminDashboardClient.tsx`
   - `app/admin/metrics/*`

---

## PHASE 4: CODEBASE CLEANUP

### SAFE TO DELETE (orphaned, 0 references from active code)

| File | Reason |
|------|--------|
| `app/components/landing/CommunityCarousel.tsx` | Never imported |
| `app/components/landing/ImpactCounters.tsx` | Never imported |
| `app/components/landing/AnimatedHero.tsx` | Never imported |
| `app/(app)/dashboard/SimpleDashboard.tsx` | Dashboard redirects to /predictions; never rendered |
| `app/(app)/dashboard/EnhancedDashboard.tsx` | Never imported |
| `app/(app)/dashboard/NewEnhancedDashboard.tsx` | Never imported |
| `app/(app)/dashboard/DashboardClient.tsx` | Never imported |
| `app/(app)/dashboard/ImpactDashboard.tsx` | Only used by dead EnhancedDashboard |
| `app/(app)/dashboard/PersonalizedDashboard.tsx` | Never imported |
| `app/components/DashboardCalendar.tsx` | Only used by dead EnhancedDashboard |

### NEEDS REVIEW (used by active or admin code)

| File | Used By | Action |
|------|---------|--------|
| `app/api/landing/communities/route.ts` | Not used by any page | Can delete if no external calls |
| `app/api/landing/stats/route.ts` | Not used by any page | Can delete if no external calls |
| `app/api/create-checkout/route.ts` | Corporate checkout? | Check — uses communities |
| `app/api/admin/route.ts` | AdminDashboardClient | Refactor to remove community stats |
| `app/api/admin/deletion-requests/*` | GDPR | Keep; update cascade logic if tables drop |
| `app/components/MySponsorships.tsx` | Links to /communities (404) | Remove or repurpose |
| `app/components/SponsorshipCheckout.tsx` | Uses sponsorships | Check if still needed |
| `app/components/EventRegistration.tsx` | Uses event_registrations | Remove if table dropped |
| `app/components/SponsorshipCheckout.tsx` | Uses sponsorships | Remove if table dropped |

### DO NOT DELETE (active features)

- `app/(predictions)/*` — Prediction platform
- `app/(public)/*` — Landing, auth, legal, sponsor
- `app/corporate/*` — Concientizaciones
- `app/employee-portal/*` — Concientizaciones
- `app/employee-portal-public/*` — Concientizaciones
- `app/concientizaciones/*` — Concientizaciones
- `app/api/predictions/*` — Prediction API
- `app/api/cron/*` — Agents
- `app/api/og/*` — OG images
- `app/api/webhooks/*` — Stripe (except sponsorship handler if deprecated)
- `app/api/corporate/*` — Concientizaciones
- `app/api/employee/*` — Concientizaciones
- `app/api/modules/*` — Concientizaciones
- `app/api/certificates/*` — Concientizaciones
- `app/api/enrollments/*` — Concientizaciones
- `app/api/tools/*` — Concientizaciones (activity_responses)
- `lib/agents/*` — Agents
- `lib/i18n/*` — Translations
- `lib/share-utils.ts` — Share

### Links to fix (point to 404 /communities)

- `components/Footer.tsx` — Remove /communities nav item
- `components/Navigation.tsx` — Remove /communities
- `components/TrustedBrands.tsx` — Remove /communities link
- `components/ui/UIComponents.tsx` — Remove /communities nav
- `app/concientizaciones/page.tsx` — Update footer links
- Email templates: `base-template`, `monthly-impact-report`, `achievement-unlocked`, `welcome-email`, `signup-confirmation-email`, `sponsorship-notification`

---

## PHASE 5: EXECUTION ORDER

1. **Backup** — Export Supabase DB before any SQL
2. **Run schema check** — `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
3. **Run row counts** — For each DELETE table: `SELECT COUNT(*) FROM table_name`
4. **Run SQL cleanup** — After review and FK constraint adjustment
5. **Delete orphaned files** — The 10 Safe to Delete files
6. **Update types/database.ts** — Remove deleted table types
7. **Refactor APIs** — Remove or update routes that referenced deleted tables
8. **Fix links** — Remove /communities from Footer, Navigation, etc.
9. **Run `npm run build`** — Verify no broken imports
10. **Deploy and test** — Prediction platform, Concientizaciones, admin

---

## Summary

| Category | Count |
|----------|-------|
| Tables to DELETE | ~25 |
| Tables to KEEP (override user list) | 6 |
| Files safe to delete | 10 |
| Files needing review | 9 |
| APIs to refactor after table drop | 15+ |

**Recommendation:** Start with **Phase 4 codebase cleanup** (delete the 10 orphaned files) — zero risk. Then run the SQL only after you've verified table existence and FK constraints in your Supabase project.
