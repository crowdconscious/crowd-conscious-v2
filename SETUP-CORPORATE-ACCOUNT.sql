-- ============================================
-- SETUP TEST CORPORATE ACCOUNT
-- ============================================
-- Run this in Supabase SQL Editor to create a test corporate account
-- and make yourself a corporate admin

-- Step 1: Get your user ID (replace with your actual user ID)
-- Run this first to find your ID:
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Step 2: Create a test corporate account
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
  community_credits_balance
) VALUES (
  'Test Company',
  'test-company',
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
  125000,
  10000
)
RETURNING id;

-- Step 3: Copy the corporate account ID from above, then update your profile
-- Replace YOUR_USER_ID with your actual user ID
-- Replace CORPORATE_ACCOUNT_ID with the ID returned above
UPDATE profiles 
SET 
  is_corporate_user = true,
  corporate_account_id = 'CORPORATE_ACCOUNT_ID', -- Replace this
  corporate_role = 'admin'
WHERE id = 'YOUR_USER_ID'; -- Replace this

-- Step 4: Also update the corporate account with your admin user ID
UPDATE corporate_accounts
SET admin_user_id = 'YOUR_USER_ID' -- Replace this
WHERE id = 'CORPORATE_ACCOUNT_ID'; -- Replace this

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this to verify it worked:
SELECT 
  p.email,
  p.full_name,
  p.is_corporate_user,
  p.corporate_role,
  ca.company_name,
  ca.program_tier,
  ca.status
FROM profiles p
LEFT JOIN corporate_accounts ca ON p.corporate_account_id = ca.id
WHERE p.id = 'YOUR_USER_ID'; -- Replace this

