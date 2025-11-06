-- Check columns in all key tables

-- 1. profiles columns
SELECT 
  'PROFILES' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. corporate_accounts columns
SELECT 
  'CORPORATE_ACCOUNTS' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'corporate_accounts'
ORDER BY ordinal_position;

-- 3. course_enrollments columns
SELECT 
  'COURSE_ENROLLMENTS' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'course_enrollments'
ORDER BY ordinal_position;

-- 4. marketplace_modules columns (first 10)
SELECT 
  'MARKETPLACE_MODULES' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'marketplace_modules'
ORDER BY ordinal_position
LIMIT 15;

