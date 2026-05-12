-- Diagnostic SQL to check routing and progress issues
-- Run this to see what's wrong with user profiles and enrollments

-- 1. Check your admin profile (francisco.blockstrand@gmail.com)
SELECT 
  'ADMIN PROFILE' as section,
  id,
  email,
  full_name,
  is_corporate_user,
  corporate_role,
  corporate_account_id
FROM profiles
WHERE email = 'francisco.blockstrand@gmail.com';

-- 2. Check other user profile (salinas.menendez@gmail.com)
SELECT 
  'OTHER USER PROFILE' as section,
  id,
  email,
  full_name,
  is_corporate_user,
  corporate_role,
  corporate_account_id
FROM profiles
WHERE email = 'salinas.menendez@gmail.com';

-- 3. Check ALL enrollments for your corporate account
SELECT 
  'ALL ENROLLMENTS' as section,
  ce.id,
  p.email,
  p.corporate_role,
  c.title as course_name,
  ce.status,
  ce.completion_percentage,
  ce.modules_completed,
  ce.xp_earned,
  ce.created_at
FROM course_enrollments ce
JOIN profiles p ON p.id = ce.employee_id
JOIN courses c ON c.id = ce.course_id
WHERE ce.corporate_account_id = (
  SELECT corporate_account_id FROM profiles WHERE email = 'francisco.blockstrand@gmail.com'
)
ORDER BY ce.created_at DESC;

-- 4. Check lesson responses (to see if activities are being saved)
SELECT 
  'LESSON RESPONSES' as section,
  lr.id,
  p.email,
  lr.module_id,
  lr.lesson_id,
  lr.time_spent_minutes,
  lr.completed_at
FROM lesson_responses lr
JOIN profiles p ON p.id = lr.employee_id
WHERE lr.corporate_account_id = (
  SELECT corporate_account_id FROM profiles WHERE email = 'francisco.blockstrand@gmail.com'
)
ORDER BY lr.completed_at DESC
LIMIT 10;

-- 5. Check if there are any employees (non-admin) in your corporate account
SELECT 
  'EMPLOYEES' as section,
  id,
  email,
  full_name,
  corporate_role,
  is_corporate_user
FROM profiles
WHERE corporate_account_id = (
  SELECT corporate_account_id FROM profiles WHERE email = 'francisco.blockstrand@gmail.com'
)
AND corporate_role = 'employee';

-- 6. Check corporate account details
SELECT 
  'CORPORATE ACCOUNT' as section,
  ca.*
FROM corporate_accounts ca
WHERE ca.id = (
  SELECT corporate_account_id FROM profiles WHERE email = 'francisco.blockstrand@gmail.com'
);

