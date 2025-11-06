-- =====================================================
-- FIX ENROLLMENTS SCHEMA & SETUP FRANCISCO'S ACCOUNT
-- =====================================================
-- This script:
-- 1. Adds module_id column to course_enrollments
-- 2. Creates corporate account for Francisco
-- 3. Enrolls him in all marketplace modules
-- =====================================================

-- STEP 1: Add module_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'course_enrollments' 
    AND column_name = 'module_id'
  ) THEN
    ALTER TABLE course_enrollments 
    ADD COLUMN module_id UUID REFERENCES marketplace_modules(id) ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Added module_id column to course_enrollments';
  ELSE
    RAISE NOTICE 'ℹ️  module_id column already exists';
  END IF;
END $$;

-- STEP 2: Ensure corporate_accounts table exists and has correct structure
CREATE TABLE IF NOT EXISTS corporate_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  industry TEXT,
  employee_count INTEGER DEFAULT 0,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add unique constraint on admin_user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_admin_user'
  ) THEN
    ALTER TABLE corporate_accounts 
    ADD CONSTRAINT unique_admin_user UNIQUE(admin_user_id);
    RAISE NOTICE '✅ Added unique constraint on admin_user_id';
  END IF;
END $$;

-- STEP 3: Add corporate fields to profiles if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_corporate_user'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_corporate_user BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added is_corporate_user to profiles';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'corporate_account_id'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN corporate_account_id UUID REFERENCES corporate_accounts(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added corporate_account_id to profiles';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'corporate_role'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN corporate_role TEXT CHECK (corporate_role IN ('admin', 'employee'));
    RAISE NOTICE '✅ Added corporate_role to profiles';
  END IF;
END $$;

-- STEP 4: Setup Francisco's corporate account and enroll in all modules
DO $$
DECLARE
  v_user_id UUID;
  v_corporate_account_id UUID;
  v_module_record RECORD;
  v_enrollment_count INTEGER := 0;
BEGIN
  -- Get Francisco's user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'francisco@crowdconscious.app';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '❌ User francisco@crowdconscious.app not found in auth.users';
  END IF;

  RAISE NOTICE '✅ Found user: %', v_user_id;

  -- Create or update corporate account
  INSERT INTO corporate_accounts (
    company_name,
    industry,
    employee_count,
    admin_user_id,
    created_at,
    updated_at
  ) VALUES (
    'Crowd Conscious Demo Team',
    'Technology',
    100,
    v_user_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (admin_user_id) 
  DO UPDATE SET 
    company_name = 'Crowd Conscious Demo Team',
    employee_count = 100,
    updated_at = NOW()
  RETURNING id INTO v_corporate_account_id;

  RAISE NOTICE '✅ Corporate account: %', v_corporate_account_id;

  -- Update Francisco's profile
  UPDATE profiles
  SET
    is_corporate_user = TRUE,
    corporate_account_id = v_corporate_account_id,
    corporate_role = 'admin'
  WHERE id = v_user_id;

  RAISE NOTICE '✅ Updated profile to corporate admin';

  -- Enroll in all published marketplace modules
  FOR v_module_record IN
    SELECT id, base_price_mxn, title 
    FROM marketplace_modules 
    WHERE status = 'published'
  LOOP
    -- Check if already enrolled (using module_id)
    IF NOT EXISTS (
      SELECT 1 FROM course_enrollments 
      WHERE user_id = v_user_id 
      AND module_id = v_module_record.id
    ) THEN
      INSERT INTO course_enrollments (
        user_id,
        corporate_account_id,
        module_id,
        purchase_type,
        purchased_at,
        purchase_price_snapshot,
        completion_percentage,
        status,
        created_at
      ) VALUES (
        v_user_id,
        v_corporate_account_id,
        v_module_record.id,
        'corporate',
        NOW(),
        v_module_record.base_price_mxn,
        0,
        'not_started',
        NOW()
      );
      v_enrollment_count := v_enrollment_count + 1;
      RAISE NOTICE '  📚 Enrolled in: %', v_module_record.title;
    ELSE
      RAISE NOTICE '  ℹ️  Already enrolled in: %', v_module_record.title;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 SETUP COMPLETE!';
  RAISE NOTICE '📚 Enrolled in % new module(s)', v_enrollment_count;
  RAISE NOTICE '🎯 Access your dashboard at /dashboard';
  RAISE NOTICE '💼 You can now invite employees';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check Francisco's account
SELECT 
  '=== FRANCISCO''S ACCOUNT ===' as info,
  p.id,
  p.full_name,
  p.email,
  p.is_corporate_user,
  p.corporate_role,
  ca.company_name,
  ca.employee_count
FROM profiles p
LEFT JOIN corporate_accounts ca ON p.corporate_account_id = ca.id
WHERE p.email = 'francisco@crowdconscious.app';

-- Check enrollments
SELECT 
  '=== ENROLLMENTS ===' as info,
  COUNT(*) as total_enrollments
FROM course_enrollments
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'francisco@crowdconscious.app'
);

-- List enrolled modules
SELECT 
  '=== ENROLLED MODULES ===' as info,
  mm.title,
  ce.purchase_type,
  ce.completion_percentage,
  ce.status
FROM course_enrollments ce
JOIN marketplace_modules mm ON ce.module_id = mm.id
WHERE ce.user_id = (
  SELECT id FROM auth.users WHERE email = 'francisco@crowdconscious.app'
)
LIMIT 10;

