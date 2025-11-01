-- ================================================
-- CONVERT YOUR USER TO CORPORATE ADMIN (FOR TESTING)
-- ================================================
-- This script will:
-- 1. Create a test corporate account
-- 2. Link your user profile to it
-- 3. Make you a corporate admin
-- ================================================

-- STEP 1: Get your user ID
-- Replace 'YOUR_EMAIL@example.com' with your actual email
DO $$
DECLARE
  v_user_id uuid;
  v_corporate_account_id uuid;
BEGIN
  -- Find your user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'YOUR_EMAIL@example.com';  -- ⚠️ CHANGE THIS TO YOUR EMAIL
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with that email';
  END IF;
  
  RAISE NOTICE 'Found user ID: %', v_user_id;
  
  -- STEP 2: Create a test corporate account
  INSERT INTO corporate_accounts (
    company_name,
    industry,
    employee_count,
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
    'Test Company (Mi Empresa)',
    'technology',
    50,
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
  RETURNING id INTO v_corporate_account_id;
  
  RAISE NOTICE 'Created corporate account ID: %', v_corporate_account_id;
  
  -- STEP 3: Update your profile to be a corporate admin
  UPDATE profiles
  SET 
    is_corporate_user = true,
    corporate_role = 'admin',
    corporate_account_id = v_corporate_account_id
  WHERE id = v_user_id;
  
  RAISE NOTICE '✅ SUCCESS! You are now a corporate admin';
  RAISE NOTICE 'Corporate Account ID: %', v_corporate_account_id;
  RAISE NOTICE 'Go to: https://crowdconscious.app/corporate/dashboard';
  
END $$;

-- Verify the changes
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.is_corporate_user,
  p.corporate_role,
  p.corporate_account_id,
  ca.company_name
FROM profiles p
LEFT JOIN corporate_accounts ca ON ca.id = p.corporate_account_id
WHERE p.id IN (
  SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com'  -- ⚠️ CHANGE THIS TO YOUR EMAIL
);

