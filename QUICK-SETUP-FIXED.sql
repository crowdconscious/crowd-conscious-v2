-- ============================================
-- QUICK SETUP: Make yourself a corporate admin
-- FIXED VERSION - matches actual database schema
-- ============================================
-- INSTRUCTIONS:
-- 1. Replace 'your-email@example.com' below with your actual email
-- 2. Copy this entire script
-- 3. Paste into Supabase SQL Editor
-- 4. Run it
-- 5. Refresh your browser and go to /corporate/dashboard
-- ============================================

DO $$
DECLARE
  v_user_id UUID;
  v_corporate_id UUID;
BEGIN
  -- Find your user by email (CHANGE THIS EMAIL!)
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'your-email@example.com'; -- ⚠️ CHANGE THIS!

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Check your email address.';
  END IF;

  -- Create corporate account (WITHOUT company_slug - it doesn't exist yet)
  INSERT INTO corporate_accounts (
    company_name,
    industry,
    employee_count,
    program_tier,
    program_start_date,
    program_end_date,
    program_duration_months,
    employee_limit,
    modules_included,
    status,
    certification_status,
    total_paid,
    community_credits_balance,
    admin_user_id
  ) VALUES (
    'Mi Empresa Test',
    'manufacturing',
    50,
    'completo',
    NOW(),
    NOW() + INTERVAL '6 months',
    6,
    100,
    ARRAY['clean_air', 'clean_water', 'safe_cities', 'zero_waste', 'fair_trade', 'integration'],
    'active',
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
  RAISE NOTICE 'SUCCESS! Corporate account created with ID: %', v_corporate_id;
  RAISE NOTICE 'You are now a corporate admin. Go to /corporate/dashboard';
  
END $$;

-- Verify it worked:
SELECT 
  p.email,
  p.full_name,
  p.is_corporate_user,
  p.corporate_role,
  ca.company_name,
  ca.program_tier,
  ca.employee_limit
FROM profiles p
JOIN corporate_accounts ca ON p.corporate_account_id = ca.id
WHERE p.email = 'your-email@example.com'; -- ⚠️ CHANGE THIS TO MATCH ABOVE!

