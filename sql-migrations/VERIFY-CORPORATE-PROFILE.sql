-- Verify your corporate profile settings
-- This checks if your profile has the correct corporate flags

SELECT 
  id,
  email,
  full_name,
  is_corporate_user,
  CASE 
    WHEN is_corporate_user = true THEN 'Boolean TRUE'
    WHEN is_corporate_user::text = 'true' THEN 'String "true"'
    WHEN is_corporate_user = false THEN 'Boolean FALSE'
    WHEN is_corporate_user IS NULL THEN 'NULL'
    ELSE 'OTHER: ' || is_corporate_user::text
  END as is_corporate_user_type,
  corporate_role,
  corporate_account_id,
  created_at,
  updated_at
FROM profiles
WHERE email = 'francisco.blockstrand@gmail.com';

-- If is_corporate_user is NULL or false, fix it
-- UNCOMMENT THIS to fix:
/*
UPDATE profiles
SET 
  is_corporate_user = true,
  corporate_role = 'admin',
  updated_at = NOW()
WHERE email = 'francisco.blockstrand@gmail.com'
AND corporate_account_id IS NOT NULL;

-- Verify the fix
SELECT 
  email,
  is_corporate_user,
  corporate_role,
  corporate_account_id
FROM profiles
WHERE email = 'francisco.blockstrand@gmail.com';
*/

