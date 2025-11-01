-- Comprehensive diagnosis of Francisco's profile

SELECT 
  '=== PROFILE DATA ===' as section,
  id::text as value1,
  email as value2,
  '' as value3
FROM profiles
WHERE email = 'francisco.blockstrand@gmail.com'

UNION ALL

SELECT 
  '=== CORPORATE FLAGS ===' as section,
  is_corporate_user::text,
  corporate_role,
  corporate_account_id::text
FROM profiles
WHERE email = 'francisco.blockstrand@gmail.com'

UNION ALL

SELECT 
  '=== CORPORATE ACCOUNT ===' as section,
  ca.id::text,
  ca.company_name,
  ca.admin_user_id::text
FROM corporate_accounts ca
WHERE ca.admin_user_id = (
  SELECT id FROM auth.users WHERE email = 'francisco.blockstrand@gmail.com'
);

-- If corporate_account_id is NULL, set it
UPDATE profiles
SET 
  corporate_account_id = (
    SELECT id FROM corporate_accounts 
    WHERE admin_user_id = (SELECT id FROM auth.users WHERE email = 'francisco.blockstrand@gmail.com')
    LIMIT 1
  ),
  is_corporate_user = true,
  corporate_role = 'admin'
WHERE email = 'francisco.blockstrand@gmail.com';

-- Final verification
SELECT 
  '=== FINAL STATE ===' as section,
  email,
  is_corporate_user::text,
  corporate_role,
  corporate_account_id::text
FROM profiles
WHERE email = 'francisco.blockstrand@gmail.com';

