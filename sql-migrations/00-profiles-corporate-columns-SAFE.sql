-- ============================================
-- SAFE: Add Corporate Columns to Profiles Table
-- This version checks everything and provides detailed output
-- ============================================

-- Step 1: Verify profiles table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    RAISE EXCEPTION '❌ ERROR: profiles table does not exist! You need to create it first.';
  END IF;
  RAISE NOTICE '✅ profiles table exists';
END $$;

-- Step 2: Verify corporate_accounts table exists (needed for foreign key)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'corporate_accounts') THEN
    RAISE EXCEPTION '❌ ERROR: corporate_accounts table does not exist! You need to create it first.';
  END IF;
  RAISE NOTICE '✅ corporate_accounts table exists';
END $$;

-- Step 3: Add columns one by one with detailed feedback

-- Add is_corporate_user (no dependencies)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'is_corporate_user'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_corporate_user BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added is_corporate_user column to profiles';
  ELSE
    RAISE NOTICE '⚠️  is_corporate_user column already exists';
  END IF;
END $$;

-- Add corporate_role (no dependencies)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'corporate_role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN corporate_role TEXT;
    ALTER TABLE public.profiles ADD CONSTRAINT check_corporate_role 
      CHECK (corporate_role IN ('admin', 'employee'));
    RAISE NOTICE '✅ Added corporate_role column to profiles';
  ELSE
    RAISE NOTICE '⚠️  corporate_role column already exists';
  END IF;
END $$;

-- Add corporate_account_id (has foreign key dependency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'corporate_account_id'
  ) THEN
    ALTER TABLE public.profiles 
      ADD COLUMN corporate_account_id UUID 
      REFERENCES public.corporate_accounts(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added corporate_account_id column to profiles';
  ELSE
    RAISE NOTICE '⚠️  corporate_account_id column already exists';
  END IF;
END $$;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_corporate_account 
  ON public.profiles(corporate_account_id);

CREATE INDEX IF NOT EXISTS idx_profiles_corporate_role 
  ON public.profiles(corporate_role);

CREATE INDEX IF NOT EXISTS idx_profiles_is_corporate 
  ON public.profiles(is_corporate_user);

RAISE NOTICE '✅ Indexes created';

-- Step 5: Verify all columns were added
DO $$
DECLARE
  has_corporate_account_id BOOLEAN;
  has_corporate_role BOOLEAN;
  has_is_corporate_user BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'corporate_account_id'
  ) INTO has_corporate_account_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'corporate_role'
  ) INTO has_corporate_role;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'is_corporate_user'
  ) INTO has_is_corporate_user;
  
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'VERIFICATION RESULTS:';
  RAISE NOTICE '===========================================';
  
  IF has_corporate_account_id THEN
    RAISE NOTICE '✅ corporate_account_id: EXISTS';
  ELSE
    RAISE NOTICE '❌ corporate_account_id: MISSING';
  END IF;
  
  IF has_corporate_role THEN
    RAISE NOTICE '✅ corporate_role: EXISTS';
  ELSE
    RAISE NOTICE '❌ corporate_role: MISSING';
  END IF;
  
  IF has_is_corporate_user THEN
    RAISE NOTICE '✅ is_corporate_user: EXISTS';
  ELSE
    RAISE NOTICE '❌ is_corporate_user: MISSING';
  END IF;
  
  IF has_corporate_account_id AND has_corporate_role AND has_is_corporate_user THEN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ SUCCESS! All corporate columns added to profiles';
    RAISE NOTICE '===========================================';
  ELSE
    RAISE EXCEPTION '❌ FAILED! Some columns are missing';
  END IF;
END $$;

