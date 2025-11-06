-- =====================================================
-- CREATE CORPORATE TABLES & SETUP DEMO ACCOUNT
-- Purpose: Create missing corporate_accounts table and set up demo account
-- Run this in Supabase SQL Editor
-- =====================================================

-- STEP 1: Drop existing table if it has issues, then recreate
DROP TABLE IF EXISTS corporate_accounts CASCADE;

CREATE TABLE corporate_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  industry TEXT,
  employee_count INTEGER DEFAULT 0,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one account per admin
  CONSTRAINT unique_admin_user UNIQUE(admin_user_id)
);

-- Add index
CREATE INDEX idx_corporate_accounts_admin 
ON corporate_accounts(admin_user_id);

-- STEP 2: Add corporate fields to profiles if they don't exist
DO $$
BEGIN
  -- Add is_corporate_user column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_corporate_user'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_corporate_user BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added is_corporate_user to profiles';
  ELSE
    RAISE NOTICE 'ℹ️  is_corporate_user already exists in profiles';
  END IF;

  -- Add corporate_account_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'corporate_account_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN corporate_account_id UUID REFERENCES corporate_accounts(id);
    RAISE NOTICE '✅ Added corporate_account_id to profiles';
  ELSE
    RAISE NOTICE 'ℹ️  corporate_account_id already exists in profiles';
  END IF;

  -- Add corporate_role column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'corporate_role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN corporate_role TEXT CHECK (corporate_role IN ('admin', 'employee'));
    RAISE NOTICE '✅ Added corporate_role to profiles';
  ELSE
    RAISE NOTICE 'ℹ️  corporate_role already exists in profiles';
  END IF;
END $$;

-- STEP 3: Setup demo corporate account for francisco@crowdconscious.app
DO $$
DECLARE
  v_user_id UUID;
  v_corporate_account_id UUID;
  v_module_record RECORD;
  v_total_modules INTEGER := 0;
  v_enrolled_count INTEGER := 0;
BEGIN
  -- Get Francisco's user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'francisco@crowdconscious.app';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User francisco@crowdconscious.app not found! Please check the email address.';
  END IF;

  RAISE NOTICE '✅ Found user: %', v_user_id;

  -- Create corporate account
  INSERT INTO corporate_accounts (
    company_name,
    industry,
    employee_count,
    admin_user_id,
    created_at
  ) VALUES (
    'Crowd Conscious Demo Team',
    'Technology',
    100,
    v_user_id,
    NOW()
  )
  RETURNING id INTO v_corporate_account_id;

  RAISE NOTICE '✅ Corporate account created: %', v_corporate_account_id;

  -- Update profile to corporate admin
  UPDATE profiles
  SET 
    is_corporate_user = true,
    corporate_account_id = v_corporate_account_id,
    corporate_role = 'admin'
  WHERE id = v_user_id;

  RAISE NOTICE '✅ Updated profile to corporate admin';

  -- Count total published modules
  SELECT COUNT(*) INTO v_total_modules
  FROM marketplace_modules 
  WHERE status = 'published';

  RAISE NOTICE '📊 Found % published module(s)', v_total_modules;

  -- Enroll in ALL published modules
  FOR v_module_record IN 
    SELECT id, title, base_price_mxn 
    FROM marketplace_modules 
    WHERE status = 'published'
    ORDER BY title
  LOOP
    BEGIN
      INSERT INTO course_enrollments (
        user_id,
        corporate_account_id,
        module_id,
        purchase_type,
        purchased_at,
        purchase_price_snapshot,
        progress_percentage,
        completed,
        enrolled_at
      ) VALUES (
        v_user_id,
        v_corporate_account_id,
        v_module_record.id,
        'corporate',
        NOW(),
        v_module_record.base_price_mxn,
        0,
        false,
        NOW()
      );
      
      v_enrolled_count := v_enrolled_count + 1;
      RAISE NOTICE '  📚 Enrolled in: %', v_module_record.title;
      
    EXCEPTION 
      WHEN unique_violation THEN
        RAISE NOTICE '  ⏭️  Already enrolled in: %', v_module_record.title;
    END;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 Setup complete!';
  RAISE NOTICE '📊 Enrolled in % out of % published modules', v_enrolled_count, v_total_modules;
  RAISE NOTICE '🎯 Access your corporate dashboard at /corporate/dashboard';
  RAISE NOTICE '💼 You can now invite employees and manage your team';

END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- Run these after the script completes to verify everything worked
-- =====================================================

-- Check corporate_accounts table
SELECT 
  'Corporate Account Info' as section,
  ca.id,
  ca.company_name,
  ca.employee_count,
  ca.industry,
  ca.created_at,
  au.email as admin_email
FROM corporate_accounts ca
JOIN auth.users au ON ca.admin_user_id = au.id
WHERE au.email = 'francisco@crowdconscious.app';

-- Check profile
SELECT 
  'Profile Info' as section,
  p.id,
  p.full_name,
  au.email,
  p.is_corporate_user,
  p.corporate_role,
  p.corporate_account_id
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email = 'francisco@crowdconscious.app';

-- Check enrollment summary
SELECT 
  'Enrollment Summary' as section,
  COUNT(*) as total_modules,
  COUNT(CASE WHEN ce.progress_percentage > 0 THEN 1 END) as started_modules,
  COUNT(CASE WHEN ce.completed = true THEN 1 END) as completed_modules
FROM course_enrollments ce
JOIN auth.users au ON ce.user_id = au.id
WHERE au.email = 'francisco@crowdconscious.app';

-- List all enrolled modules
SELECT 
  mm.title as module_title,
  mm.difficulty_level,
  ce.purchase_type,
  ce.progress_percentage,
  ce.enrolled_at
FROM course_enrollments ce
JOIN marketplace_modules mm ON ce.module_id = mm.id
JOIN auth.users au ON ce.user_id = au.id
WHERE au.email = 'francisco@crowdconscious.app'
ORDER BY ce.enrolled_at DESC;
