-- =====================================================
-- DIAGNOSE ACTUAL DATABASE SCHEMA
-- Run this FIRST to see what actually exists
-- =====================================================

-- 1. Check if corporate_accounts table exists
SELECT 
  'corporate_accounts' as table_name,
  CASE 
    WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'corporate_accounts')
    THEN '✅ EXISTS'
    ELSE '❌ DOES NOT EXIST'
  END as status;

-- 2. Check what columns exist in profiles table
SELECT 
  'profiles columns' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Check if course_enrollments table exists
SELECT 
  'course_enrollments' as table_name,
  CASE 
    WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_enrollments')
    THEN '✅ EXISTS'
    ELSE '❌ DOES NOT EXIST'
  END as status;

-- 4. If course_enrollments exists, show its columns
SELECT 
  'course_enrollments columns' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'course_enrollments'
ORDER BY ordinal_position;

-- 5. Check marketplace_modules table
SELECT 
  'marketplace_modules' as table_name,
  CASE 
    WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'marketplace_modules')
    THEN '✅ EXISTS'
    ELSE '❌ DOES NOT EXIST'
  END as status;

-- 6. If marketplace_modules exists, show sample data
SELECT 
  'marketplace_modules sample' as info,
  id,
  title,
  status
FROM marketplace_modules
LIMIT 5;

-- 7. Check if francisco@crowdconscious.app user exists
SELECT 
  'User francisco@crowdconscious.app' as info,
  id,
  email,
  created_at
FROM auth.users
WHERE email = 'francisco@crowdconscious.app';

-- 8. Check Francisco's profile
SELECT 
  'Francisco profile' as info,
  p.*
FROM profiles p
WHERE p.id = (SELECT id FROM auth.users WHERE email = 'francisco@crowdconscious.app');

-- 9. List ALL tables in public schema
SELECT 
  'All public tables' as info,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

