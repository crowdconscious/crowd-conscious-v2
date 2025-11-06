-- =====================================================
-- SIMPLE SCHEMA DIAGNOSTIC - ONE QUERY
-- =====================================================
-- This returns everything we need in a single result
-- =====================================================

SELECT 
  'TABLE_EXISTS' as check_type,
  t.table_name as name,
  COUNT(c.column_name)::text as value,
  NULL as details
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
  ON t.table_name = c.table_name 
  AND c.table_schema = 'public'
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND t.table_name IN (
    'profiles',
    'communities', 
    'marketplace_modules',
    'module_lessons',
    'promo_codes',
    'promo_code_uses',
    'module_reviews',
    'community_reviews',
    'course_enrollments',
    'cart_items'
  )
GROUP BY t.table_name

UNION ALL

-- Check if critical columns exist
SELECT 
  'COLUMN_EXISTS' as check_type,
  table_name as name,
  column_name as value,
  data_type as details
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'marketplace_modules' AND column_name IN ('is_platform_module', 'individual_price_mxn', 'creator_user_id', 'creator_community_id', 'status'))
    OR (table_name = 'promo_codes' AND column_name IN ('code', 'discount_type', 'active'))
    OR (table_name = 'cart_items' AND column_name IN ('user_id', 'promo_code_id'))
    OR (table_name = 'module_reviews')
    OR (table_name = 'community_reviews')
  )

UNION ALL

-- Check foreign key references
SELECT 
  'FOREIGN_KEY' as check_type,
  tc.table_name as name,
  kcu.column_name as value,
  ccu.table_name || '.' || ccu.column_name as details
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('promo_codes', 'promo_code_uses', 'cart_items', 'marketplace_modules', 'module_reviews', 'community_reviews')

UNION ALL

-- Check if auth.users table exists
SELECT 
  'AUTH_TABLE' as check_type,
  'auth.users' as name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN 'EXISTS' ELSE 'NOT_FOUND' END as value,
  NULL as details

ORDER BY check_type, name, value;

