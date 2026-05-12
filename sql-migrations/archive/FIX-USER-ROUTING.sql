-- Fix user routing issues
-- This script checks and fixes profile settings for proper routing

-- Step 1: Check the user's current profile
SELECT 
  'BEFORE FIX' as section,
  id,
  email,
  full_name,
  is_corporate_user,
  corporate_role,
  corporate_account_id
FROM profiles
WHERE email = 'salinas.menendez@gmail.com';

-- Step 2: Check if this user should be corporate admin
-- (Check if they have a corporate account or should be linked to one)
SELECT 
  'CORPORATE ACCOUNTS' as section,
  ca.id,
  ca.company_name,
  ca.contact_email,
  ca.program_tier
FROM corporate_accounts ca
WHERE ca.contact_email = 'salinas.menendez@gmail.com'
   OR ca.id IN (
     SELECT corporate_account_id 
     FROM profiles 
     WHERE email = 'salinas.menendez@gmail.com'
   );

-- Step 3: If they should be admin, update their profile
-- OPTION A: Make them admin of an existing corporate account
-- Uncomment and run this if they should be admin
/*
UPDATE profiles
SET 
  is_corporate_user = true,
  corporate_role = 'admin',
  corporate_account_id = (SELECT id FROM corporate_accounts WHERE contact_email = 'salinas.menendez@gmail.com' OR company_name = 'Mi Empresa Test' LIMIT 1)
WHERE email = 'salinas.menendez@gmail.com';
*/

-- OPTION B: Make them employee of your corporate account (for testing)
-- Uncomment this if they should join your corporate account as employee
/*
UPDATE profiles
SET 
  is_corporate_user = true,
  corporate_role = 'employee',
  corporate_account_id = (SELECT corporate_account_id FROM profiles WHERE email = 'francisco.blockstrand@gmail.com')
WHERE email = 'salinas.menendez@gmail.com';
*/

-- Step 4: Check the fix
SELECT 
  'AFTER FIX' as section,
  id,
  email,
  full_name,
  is_corporate_user,
  corporate_role,
  corporate_account_id
FROM profiles
WHERE email = 'salinas.menendez@gmail.com';

-- Step 5: If they're now an employee, enroll them in the Clean Air course
/*
INSERT INTO course_enrollments (
  employee_id,
  corporate_account_id,
  course_id,
  status,
  completion_percentage,
  modules_completed,
  xp_earned
)
SELECT
  p.id,
  p.corporate_account_id,
  'a1a1a1a1-1111-1111-1111-111111111111'::uuid,
  'not_started',
  0,
  0,
  0
FROM profiles p
WHERE p.email = 'salinas.menendez@gmail.com'
AND p.is_corporate_user = true
ON CONFLICT (employee_id, course_id) DO NOTHING;
*/

