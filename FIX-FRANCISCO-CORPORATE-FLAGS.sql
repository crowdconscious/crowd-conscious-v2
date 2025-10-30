-- Fix Francisco's profile to show corporate banner

-- First, check current status
SELECT 
  email,
  is_corporate_user,
  corporate_role,
  corporate_account_id,
  full_name
FROM profiles
WHERE email = 'francisco.blockstrand@gmail.com';

-- Update to set corporate flags
UPDATE profiles
SET 
  is_corporate_user = true,
  corporate_role = 'admin'
WHERE email = 'francisco.blockstrand@gmail.com'
  AND corporate_account_id IS NOT NULL;

-- Verify the update
SELECT 
  '=== AFTER UPDATE ===' as status,
  email,
  is_corporate_user,
  corporate_role,
  corporate_account_id
FROM profiles
WHERE email = 'francisco.blockstrand@gmail.com';

