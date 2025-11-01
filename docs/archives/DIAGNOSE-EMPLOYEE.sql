-- 🔍 DIAGNOSE EMPLOYEE ACCOUNT
-- Run this in Supabase SQL Editor to check what's wrong with the employee account

-- Replace this email with the employee's email
\set employee_email 'tjockis88@hotmail.com'

-- 1. Check if user exists in auth.users
SELECT 
  '=== AUTH USER ===' as section,
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE email = 'tjockis88@hotmail.com';

-- 2. Check profile
SELECT 
  '=== PROFILE ===' as section,
  id,
  email,
  full_name,
  corporate_account_id,
  corporate_role,
  is_corporate_user,
  created_at
FROM profiles
WHERE email = 'tjockis88@hotmail.com';

-- 3. Check invitation status
SELECT 
  '=== INVITATION ===' as section,
  id,
  email,
  corporate_account_id,
  status,
  invited_at,
  accepted_at,
  expires_at
FROM employee_invitations
WHERE email = 'tjockis88@hotmail.com';

-- 4. Check enrollments
SELECT 
  '=== ENROLLMENTS ===' as section,
  e.id,
  e.employee_id,
  e.corporate_account_id,
  e.course_id,
  c.title as course_title,
  e.status,
  e.enrolled_at
FROM course_enrollments e
LEFT JOIN courses c ON c.id = e.course_id
WHERE e.employee_id IN (
  SELECT id FROM profiles WHERE email = 'tjockis88@hotmail.com'
);

-- 5. Check if corporate_account exists
SELECT 
  '=== CORPORATE ACCOUNT ===' as section,
  ca.id,
  ca.company_name,
  ca.status,
  ca.program_tier,
  ca.employee_limit
FROM corporate_accounts ca
WHERE ca.id IN (
  SELECT corporate_account_id FROM profiles WHERE email = 'tjockis88@hotmail.com'
);

