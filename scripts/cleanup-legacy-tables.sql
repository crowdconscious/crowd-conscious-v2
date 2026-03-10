-- Crowd Conscious Database Cleanup
-- Generated: 2026-03-10
-- Purpose: Remove legacy tables from previous community/brand app
-- 
-- KEEP: prediction_markets, market_outcomes, market_votes, profiles,
--       user_stats, conscious_inbox, inbox_votes, market_comments,
--       notifications, agent_content, agent_runs, fund_causes, fund_votes,
--       corporate_accounts, employee_invitations, course_enrollments,
--       marketplace_modules, module_lessons, certifications, etc.
--
-- ⚠️ REVIEW BEFORE RUNNING
-- 1. Run: SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- 2. For each table: SELECT COUNT(*) FROM table_name;
-- 3. Check FKs: SELECT conname, conrelid::regclass, confrelid::regclass
--    FROM pg_constraint WHERE contype = 'f' AND confrelid::regclass::text LIKE 'community%';

-- ============================================================
-- STEP 1: Drop foreign key constraints (run these first if needed)
-- ============================================================
-- Inspect your schema and add DROP CONSTRAINT for each FK pointing to tables we're dropping.
-- Example:
-- ALTER TABLE community_members DROP CONSTRAINT IF EXISTS community_members_community_id_fkey;

-- ============================================================
-- STEP 2a: PHASE 1 — Drop tables with 0 rows (safe, no data loss)
-- ============================================================
DROP TABLE IF EXISTS community_wallets CASCADE;
DROP TABLE IF EXISTS treasury_transactions CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS share_links CASCADE;
DROP TABLE IF EXISTS share_clicks CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS impact_metrics CASCADE;
DROP TABLE IF EXISTS impact_measurements CASCADE;
DROP TABLE IF EXISTS corporate_impact_metrics CASCADE;
DROP TABLE IF EXISTS brand_preferences CASCADE;
DROP TABLE IF EXISTS sponsorship_applications CASCADE;
DROP TABLE IF EXISTS brand_community_relationships CASCADE;
DROP TABLE IF EXISTS creator_applications CASCADE;
DROP TABLE IF EXISTS revenue_transactions CASCADE;
DROP TABLE IF EXISTS user_challenge_progress CASCADE;
DROP TABLE IF EXISTS withdrawal_requests CASCADE;
DROP TABLE IF EXISTS company_assessments CASCADE;
DROP TABLE IF EXISTS neighborhood_partnerships CASCADE;

-- ============================================================
-- STEP 2b: PHASE 2 — Drop tables WITH data (⚠️ DATA LOSS)
-- Run only after you've confirmed you don't need this data.
-- Rows: communities(6), community_members(20), community_content(16),
--       community_treasury(2), need_activities(19), poll_options(11),
--       poll_votes(16), event_registrations(9), content_shares(683),
--       sponsorships(10), module_sales(29), weekly_challenges(2)
-- ============================================================
-- DROP TABLE IF EXISTS poll_votes CASCADE;
-- DROP TABLE IF EXISTS poll_options CASCADE;
-- DROP TABLE IF EXISTS need_activities CASCADE;
-- DROP TABLE IF EXISTS event_registrations CASCADE;
-- DROP TABLE IF EXISTS content_shares CASCADE;
-- DROP TABLE IF EXISTS community_content CASCADE;
-- DROP TABLE IF EXISTS community_members CASCADE;
-- DROP TABLE IF EXISTS community_treasury CASCADE;
-- DROP TABLE IF EXISTS sponsorships CASCADE;
-- DROP TABLE IF EXISTS communities CASCADE;
-- DROP TABLE IF EXISTS module_sales CASCADE;
-- DROP TABLE IF EXISTS weekly_challenges CASCADE;

-- ============================================================
-- STEP 3: Verify remaining tables
-- ============================================================
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
