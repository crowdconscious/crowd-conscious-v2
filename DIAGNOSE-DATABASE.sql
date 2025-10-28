-- ============================================
-- Database Diagnostic Script
-- Run this in Supabase SQL Editor to see what exists
-- ============================================

-- Check if profiles table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    RAISE NOTICE '✅ profiles table EXISTS';
  ELSE
    RAISE NOTICE '❌ profiles table DOES NOT EXIST';
  END IF;
END $$;

-- Check if corporate_accounts table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'corporate_accounts') THEN
    RAISE NOTICE '✅ corporate_accounts table EXISTS';
  ELSE
    RAISE NOTICE '❌ corporate_accounts table DOES NOT EXIST';
  END IF;
END $$;

-- List all columns in profiles table
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check specifically for corporate columns
DO $$
DECLARE
  has_corporate_account_id BOOLEAN;
  has_corporate_role BOOLEAN;
  has_is_corporate_user BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'corporate_account_id'
  ) INTO has_corporate_account_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'corporate_role'
  ) INTO has_corporate_role;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_corporate_user'
  ) INTO has_is_corporate_user;
  
  IF has_corporate_account_id THEN
    RAISE NOTICE '✅ corporate_account_id column EXISTS in profiles';
  ELSE
    RAISE NOTICE '❌ corporate_account_id column MISSING from profiles';
  END IF;
  
  IF has_corporate_role THEN
    RAISE NOTICE '✅ corporate_role column EXISTS in profiles';
  ELSE
    RAISE NOTICE '❌ corporate_role column MISSING from profiles';
  END IF;
  
  IF has_is_corporate_user THEN
    RAISE NOTICE '✅ is_corporate_user column EXISTS in profiles';
  ELSE
    RAISE NOTICE '❌ is_corporate_user column MISSING from profiles';
  END IF;
END $$;

-- List all tables that exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

