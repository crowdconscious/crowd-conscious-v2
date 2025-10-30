-- ============================================
-- DIAGNOSE WHY BANNER ISN'T APPEARING
-- ============================================

-- Step 1: Check data type of is_corporate_user column
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('is_corporate_user', 'corporate_role', 'corporate_account_id');

-- Step 2: Check your actual profile data with types
SELECT 
  email,
  is_corporate_user,
  pg_typeof(is_corporate_user) as is_corporate_user_type,
  corporate_role,
  corporate_account_id
FROM profiles
WHERE email = 'francisco.blockstrand@gmail.com';

-- Step 3: Check if join to corporate_accounts works
SELECT 
  p.email,
  p.is_corporate_user,
  p.corporate_role,
  p.corporate_account_id,
  ca.company_name
FROM profiles p
LEFT JOIN corporate_accounts ca ON ca.id = p.corporate_account_id
WHERE p.email = 'francisco.blockstrand@gmail.com';

