-- ============================================
-- CHECK WHICH TABLES EXIST BEFORE INDEXING
-- ============================================
-- Run this first to see which tables you have
-- Then use the appropriate index file
-- ============================================

-- List all tables in public schema
SELECT 
    tablename,
    CASE 
        WHEN tablename LIKE 'marketplace_%' THEN 'Marketplace'
        WHEN tablename LIKE 'wallet%' OR tablename LIKE '%_sales' THEN 'Wallet System'
        WHEN tablename LIKE 'course_%' OR tablename LIKE 'employee_%' OR tablename LIKE 'corporate_%' OR tablename = 'certifications' OR tablename = 'lesson_responses' OR tablename = 'project_submissions' THEN 'Corporate Training'
        WHEN tablename LIKE 'community_%' OR tablename = 'communities' OR tablename = 'votes' OR tablename = 'sponsorships' THEN 'Community Platform'
        WHEN tablename = 'profiles' THEN 'Auth'
        ELSE 'Other'
    END as category,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY category, tablename;

-- Count by category
SELECT 
    CASE 
        WHEN tablename LIKE 'marketplace_%' THEN 'Marketplace'
        WHEN tablename LIKE 'wallet%' OR tablename LIKE '%_sales' THEN 'Wallet System'
        WHEN tablename LIKE 'course_%' OR tablename LIKE 'employee_%' OR tablename LIKE 'corporate_%' OR tablename = 'certifications' OR tablename = 'lesson_responses' OR tablename = 'project_submissions' THEN 'Corporate Training'
        WHEN tablename LIKE 'community_%' OR tablename = 'communities' OR tablename = 'votes' OR tablename = 'sponsorships' THEN 'Community Platform'
        WHEN tablename = 'profiles' THEN 'Auth'
        ELSE 'Other'
    END as category,
    COUNT(*) as table_count
FROM pg_tables
WHERE schemaname = 'public'
GROUP BY category
ORDER BY category;

-- Check specific tables we want to index
SELECT 
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name) 
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (VALUES 
    ('profiles'),
    ('communities'),
    ('community_members'),
    ('community_content'),
    ('votes'),
    ('sponsorships'),
    ('impact_metrics'),
    ('share_links'),
    ('corporate_accounts'),
    ('employee_invitations'),
    ('course_enrollments'),
    ('lesson_responses'),
    ('certifications'),
    ('project_submissions'),
    ('corporate_activity_log'),
    ('marketplace_modules'),
    ('module_lessons'),
    ('creator_applications'),
    ('module_reviews'),
    ('wallets'),
    ('wallet_transactions'),
    ('module_sales')
) AS t(table_name)
ORDER BY 
    CASE 
        WHEN status = '✅ EXISTS' THEN 1
        ELSE 2
    END,
    table_name;

-- ============================================
-- RECOMMENDATIONS BASED ON RESULTS
-- ============================================

/*
WHICH INDEX FILE TO USE:

IF YOU HAVE:
✅ Only core tables (communities, profiles, corporate_accounts, course_enrollments, etc.)
→ USE: performance-indexes-safe.sql
→ INDEXES: ~35 indexes for existing tables

✅ Core + Marketplace tables (marketplace_modules, module_lessons, etc.)
→ First, ensure marketplace tables exist
→ Then USE: performance-indexes-batch.sql (partial)

✅ Core + Marketplace + Wallet tables (wallets, wallet_transactions, module_sales)
→ First, ensure all tables exist
→ Then USE: performance-indexes-batch.sql (full)

HOW TO CREATE MISSING TABLES:

Missing Marketplace tables?
→ Run: sql-migrations/phase-2-marketplace-tables.sql

Missing Wallet tables?
→ Run: sql-migrations/wallet-system-tables.sql

Missing Corporate tables?
→ Run: sql-migrations/corporate-phase1-tables-FIXED.sql

Then come back and run the appropriate index file!
*/

