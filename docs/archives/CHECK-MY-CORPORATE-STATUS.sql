-- ================================================
-- CHECK YOUR CORPORATE USER STATUS
-- ================================================
-- Run this to see if you're set up as a corporate user
-- ================================================

-- Replace with your email:
-- 'YOUR_EMAIL@example.com'

SELECT 
  au.email,
  p.full_name,
  p.is_corporate_user,
  p.corporate_role,
  p.corporate_account_id,
  ca.company_name,
  ca.program_tier,
  ca.employee_limit,
  CASE 
    WHEN p.is_corporate_user = true AND p.corporate_role = 'admin' AND p.corporate_account_id IS NOT NULL 
    THEN '✅ You are a corporate admin - /corporate/dashboard should work'
    WHEN p.is_corporate_user = true AND p.corporate_role = 'employee' 
    THEN '✅ You are a corporate employee - /employee-portal/dashboard should work'
    ELSE '❌ You are NOT a corporate user - need to run MAKE-ME-CORPORATE-ADMIN.sql'
  END as status
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN corporate_accounts ca ON ca.id = p.corporate_account_id
WHERE au.email = 'YOUR_EMAIL@example.com';  -- ⚠️ CHANGE THIS TO YOUR EMAIL

