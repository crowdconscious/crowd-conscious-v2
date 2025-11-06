-- =====================================================
-- DATABASE SCHEMA DIAGNOSTIC
-- =====================================================
-- Run this in Supabase SQL Editor to see what exists
-- Copy the results and share with me
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🔍 Checking existing database schema...';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 1. CHECK WHAT TABLES EXIST
-- =====================================================

SELECT 
  '📋 TABLE EXISTS' as status,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE information_schema.columns.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'profiles',
    'communities',
    'marketplace_modules',
    'module_lessons',
    'promo_codes',
    'promo_code_uses',
    'module_reviews',
    'community_reviews',
    'module_review_votes',
    'community_review_votes',
    'course_enrollments',
    'cart_items'
  )
ORDER BY table_name;

-- =====================================================
-- 2. CHECK PROFILES TABLE STRUCTURE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '👤 PROFILES TABLE:';
END $$;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- =====================================================
-- 3. CHECK COMMUNITIES TABLE STRUCTURE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🏘️ COMMUNITIES TABLE:';
END $$;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'communities'
ORDER BY ordinal_position;

-- =====================================================
-- 4. CHECK MARKETPLACE_MODULES TABLE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📚 MARKETPLACE_MODULES TABLE:';
END $$;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'marketplace_modules'
ORDER BY ordinal_position;

-- =====================================================
-- 5. CHECK MODULE_LESSONS TABLE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📖 MODULE_LESSONS TABLE:';
END $$;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'module_lessons'
ORDER BY ordinal_position;

-- =====================================================
-- 6. CHECK FOREIGN KEY CONSTRAINTS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔗 FOREIGN KEY CONSTRAINTS:';
END $$;

SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'marketplace_modules',
    'module_lessons',
    'promo_codes',
    'promo_code_uses',
    'module_reviews',
    'community_reviews'
  )
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================
-- 7. CHECK IF auth.users EXISTS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔐 AUTH TABLES:';
END $$;

SELECT 
  table_name,
  table_schema
FROM information_schema.tables
WHERE table_schema = 'auth'
  AND table_name = 'users';

-- =====================================================
-- 8. CHECK SPECIFIC COLUMNS IN MARKETPLACE_MODULES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 MARKETPLACE_MODULES SPECIAL COLUMNS:';
END $$;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'marketplace_modules'
  AND column_name IN ('is_platform_module', 'individual_price_mxn', 'creator_user_id', 'creator_community_id')
ORDER BY column_name;

-- =====================================================
-- 9. CHECK COURSE_ENROLLMENTS TABLE (if exists)
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎓 COURSE_ENROLLMENTS TABLE:';
END $$;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'course_enrollments'
ORDER BY ordinal_position;

-- =====================================================
-- 10. CHECK CART_ITEMS TABLE (if exists)
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🛒 CART_ITEMS TABLE:';
END $$;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'cart_items'
ORDER BY ordinal_position;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Diagnostic complete! Please share ALL results above.';
END $$;

