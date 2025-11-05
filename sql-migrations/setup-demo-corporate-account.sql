-- =====================================================
-- SETUP DEMO CORPORATE ACCOUNT
-- Purpose: Create a corporate account for the platform admin to demo features
-- Run this in Supabase SQL Editor
-- =====================================================

-- STEP 1: Get your user ID
-- Replace 'your-email@example.com' with your actual email
DO $$
DECLARE
  v_user_id UUID;
  v_corporate_account_id UUID;
  v_module_record RECORD;
  v_enrollment_count INTEGER := 0;
BEGIN
  -- Get your user ID from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'your-email@example.com';  -- ⚠️ REPLACE THIS WITH YOUR EMAIL!

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found! Please replace the email in the script.';
  END IF;

  RAISE NOTICE '✅ Found user: %', v_user_id;

  -- STEP 2: Create or get corporate account
  INSERT INTO corporate_accounts (
    company_name,
    industry,
    employee_count,
    admin_user_id,
    subscription_status,
    created_at
  ) VALUES (
    'Crowd Conscious Demo Team',
    'Technology',
    100,
    v_user_id,
    'active',
    NOW()
  )
  ON CONFLICT (admin_user_id) DO UPDATE
    SET company_name = 'Crowd Conscious Demo Team',
        employee_count = 100,
        subscription_status = 'active'
  RETURNING id INTO v_corporate_account_id;

  RAISE NOTICE '✅ Corporate account: %', v_corporate_account_id;

  -- STEP 3: Update user profile to be corporate admin
  UPDATE profiles
  SET 
    is_corporate_user = true,
    corporate_account_id = v_corporate_account_id,
    corporate_role = 'admin',
    updated_at = NOW()
  WHERE id = v_user_id;

  RAISE NOTICE '✅ Updated profile to corporate admin';

  -- STEP 4: Enroll in ALL published modules
  FOR v_module_record IN 
    SELECT id, title, base_price_mxn 
    FROM marketplace_modules 
    WHERE status = 'published'
  LOOP
    -- Insert enrollment (skip if already exists)
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
    )
    ON CONFLICT (user_id, module_id) DO NOTHING;

    IF FOUND THEN
      v_enrollment_count := v_enrollment_count + 1;
      RAISE NOTICE '  📚 Enrolled in: %', v_module_record.title;
    END IF;
  END LOOP;

  RAISE NOTICE '🎉 Setup complete! Enrolled in % module(s)', v_enrollment_count;
  RAISE NOTICE '🎯 You can now:';
  RAISE NOTICE '   1. Add/remove modules from cart';
  RAISE NOTICE '   2. Access all enrolled modules';
  RAISE NOTICE '   3. Invite employees to your corporate account';
  RAISE NOTICE '   4. View corporate dashboard';

END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check your corporate account
SELECT 
  ca.id,
  ca.company_name,
  ca.employee_count,
  ca.subscription_status,
  p.full_name as admin_name,
  p.email as admin_email
FROM corporate_accounts ca
JOIN profiles p ON ca.admin_user_id = p.id
WHERE p.email = 'your-email@example.com';  -- ⚠️ REPLACE THIS!

-- Check your profile
SELECT 
  id,
  full_name,
  email,
  is_corporate_user,
  corporate_role,
  corporate_account_id
FROM profiles
WHERE email = 'your-email@example.com';  -- ⚠️ REPLACE THIS!

-- Check your enrollments
SELECT 
  ce.id,
  mm.title as module_title,
  ce.purchase_type,
  ce.progress_percentage,
  ce.enrolled_at
FROM course_enrollments ce
JOIN marketplace_modules mm ON ce.module_id = mm.id
JOIN profiles p ON ce.user_id = p.id
WHERE p.email = 'your-email@example.com'  -- ⚠️ REPLACE THIS!
ORDER BY ce.enrolled_at DESC;

-- =====================================================
-- BONUS: Add Demo Employees (Optional)
-- =====================================================

-- Uncomment and run this if you want to add demo employees to your corporate account
/*
DO $$
DECLARE
  v_corporate_account_id UUID;
  v_demo_employee_id UUID;
BEGIN
  -- Get your corporate account ID
  SELECT corporate_account_id INTO v_corporate_account_id
  FROM profiles
  WHERE email = 'your-email@example.com';  -- ⚠️ REPLACE THIS!

  -- Create 3 demo employees
  FOR i IN 1..3 LOOP
    -- Create demo user in auth.users (you'll need to use Supabase Dashboard for this)
    -- Or just update existing users to be employees:
    
    -- Example: Make an existing user an employee
    -- UPDATE profiles
    -- SET 
    --   is_corporate_user = true,
    --   corporate_account_id = v_corporate_account_id,
    --   corporate_role = 'employee'
    -- WHERE email = 'demo-employee-1@example.com';  -- Replace with actual email
    
    RAISE NOTICE 'Add demo employees manually through Supabase Dashboard';
  END LOOP;
END $$;
*/

