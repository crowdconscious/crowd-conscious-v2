-- ============================================
-- QUICK SETUP: Make yourself a corporate admin
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

  -- Create corporate account
  INSERT INTO corporate_accounts (
    company_name,
    company_slug,
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
    'mi-empresa-test',
    'manufacturing',
    50,
    'completo',
    NOW(),


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

