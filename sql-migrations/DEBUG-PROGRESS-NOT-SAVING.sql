-- Debug why progress isn't saving
-- Run this to check if lesson completions are being recorded

-- Step 1: Check current enrollment status
SELECT 
  'CURRENT ENROLLMENT STATUS' as section,
  ce.id as enrollment_id,
  p.email,
  c.title as course_name,
  ce.status,
  ce.completion_percentage,
  ce.modules_completed,
  ce.xp_earned,
  ce.created_at,
  ce.updated_at
FROM course_enrollments ce
JOIN profiles p ON p.id = ce.employee_id
JOIN courses c ON c.id = ce.course_id
WHERE p.email = 'francisco.blockstrand@gmail.com'
  OR p.corporate_account_id = (SELECT corporate_account_id FROM profiles WHERE email = 'francisco.blockstrand@gmail.com');

-- Step 2: Check if lesson responses are being saved
SELECT 
  'LESSON RESPONSES SAVED' as section,
  lr.id,
  p.email,
  lr.module_id,
  lr.lesson_id,
  lr.time_spent_minutes,
  lr.completed_at,
  CASE WHEN lr.responses IS NOT NULL THEN 'Yes' ELSE 'No' END as has_responses
FROM lesson_responses lr
JOIN profiles p ON p.id = lr.employee_id
WHERE p.email = 'francisco.blockstrand@gmail.com'
  OR p.corporate_account_id = (SELECT corporate_account_id FROM profiles WHERE email = 'francisco.blockstrand@gmail.com')
ORDER BY lr.completed_at DESC
LIMIT 10;

-- Step 3: Check if there are any errors in the enrollment table schema
SELECT 
  'ENROLLMENT TABLE SCHEMA' as section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'course_enrollments'
ORDER BY ordinal_position;

-- Step 4: Try to manually update progress (for testing)
-- UNCOMMENT THIS TO TEST IF UPDATES WORK AT ALL
/*
UPDATE course_enrollments
SET 
  modules_completed = 1,
  completion_percentage = 33,
  xp_earned = 250,
  status = 'in_progress',
  updated_at = NOW()
WHERE employee_id = (SELECT id FROM profiles WHERE email = 'francisco.blockstrand@gmail.com')
AND course_id = 'a1a1a1a1-1111-1111-1111-111111111111'::uuid;

-- Then check if it updated
SELECT 
  'AFTER MANUAL UPDATE' as section,
  completion_percentage,
  modules_completed,
  xp_earned,
  status
FROM course_enrollments
WHERE employee_id = (SELECT id FROM profiles WHERE email = 'francisco.blockstrand@gmail.com')
AND course_id = 'a1a1a1a1-1111-1111-1111-111111111111'::uuid;
*/

-- Step 5: Check if there's an updated_at timestamp issue
SELECT 
  'UPDATED_AT CHECK' as section,
  ce.id,
  p.email,
  ce.created_at,
  ce.updated_at,
  CASE 
    WHEN ce.updated_at IS NULL THEN 'Missing updated_at'
    WHEN ce.updated_at = ce.created_at THEN 'Never updated'
    ELSE 'Has been updated'
  END as update_status
FROM course_enrollments ce
JOIN profiles p ON p.id = ce.employee_id
WHERE p.corporate_account_id = (SELECT corporate_account_id FROM profiles WHERE email = 'francisco.blockstrand@gmail.com');

