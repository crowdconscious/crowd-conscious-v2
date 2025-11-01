-- ============================================
-- WORKING SETUP - Matches Actual Database Schema
-- ============================================
-- This uses the EXACT columns that exist in your database
-- 
-- INSTRUCTIONS:
-- 1. Replace 'your-email@example.com' with your actual email (2 places)
-- 2. Run this in Supabase SQL Editor
-- 3. Should work perfectly!
-- ============================================

DO $$
DECLARE
  v_user_id UUID;
  v_corporate_id UUID;
BEGIN
  -- Find your user by email (⚠️ CHANGE THIS EMAIL!)
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'your-email@example.com'; -- ⚠️ CHANGE THIS!

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Check your email address.';
  END IF;

  -- Create corporate account using EXACT schema
  INSERT INTO corporate_accounts (
    company_name,
    industry,
    employee_count,
    address,
    program_tier,
    program_start_date,
    program_end_date,
    employee_limit,
    modules_included,
    certification_status,
    total_paid,
    community_credits_balance,
    admin_user_id
  ) VALUES (
    'Mi Empresa Test',
    'manufacturing',
    50,
    'Ciudad de México, México',
    'completo',
    NOW(),
    NOW() + INTERVAL '6 months',
    100,
    ARRAY['clean_air', 'clean_water', 'safe_cities', 'zero_waste', 'fair_trade', 'integration'],
    'in_progress',
    125000.00,
    10000.00,
    v_user_id
  )
  RETURNING id INTO v_corporate_id;

  -- Update your profile to be corporate admin
  UPDATE profiles 
  SET 
    is_corporate_user = true,
    corporate_account_id = v_corporate_id,
    corporate_role = 'admin'
  WHERE id = v_user_id;

  -- Show success message
  RAISE NOTICE '✅ SUCCESS! Corporate account created!';
  RAISE NOTICE 'Corporate Account ID: %', v_corporate_id;
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE '';
  RAISE NOTICE '🎉 You are now a corporate admin!';
  RAISE NOTICE '👉 Go to: https://crowdconscious.app/corporate/dashboard';
  
END $$;

-- Verify it worked:
SELECT 
  p.email,
  p.full_name,
  p.is_corporate_user,
  p.corporate_role,
  ca.company_name,
  ca.program_tier,
  ca.employee_limit,
  ca.certification_status
FROM profiles p
LEFT JOIN corporate_accounts ca ON p.corporate_account_id = ca.id
WHERE p.email = 'your-email@example.com'; -- ⚠️ CHANGE THIS TO MATCH ABOVE!

