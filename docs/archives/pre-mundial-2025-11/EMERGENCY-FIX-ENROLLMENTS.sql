-- =====================================================
-- EMERGENCY: Manually enroll Ximena in purchased modules
-- =====================================================
-- This is a workaround while we debug the webhook

-- Step 1: Find user and modules
SELECT 'Step 1: Finding user and modules' as step;

-- Get user ID
SELECT 
  'User Info:' as info,
  id as user_id,
  email,
  full_name
FROM auth.users
WHERE email = 'ximenaginsburg@hotmail.com';

-- Get available modules
SELECT 
  'Available Modules:' as info,
  id as module_id,
  title,
  slug,
  core_value,
  published
FROM marketplace_modules
WHERE published = true
ORDER BY title;

-- Step 2: Check existing enrollments (should be empty)
SELECT 
  'Existing Enrollments (should be none):' as info,
  COUNT(*) as enrollment_count
FROM course_enrollments
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ximenaginsburg@hotmail.com');

-- Step 3: MANUAL ENROLLMENT - Enroll in Ciudades Seguras (the one from checkout)
INSERT INTO course_enrollments (
  user_id,
  corporate_account_id,
  course_id,
  module_id,
  purchase_type,
  purchased_at,
  purchase_price_snapshot,
  status,
  progress_percentage,
  completion_percentage,
  completed,
  xp_earned,
  started_at,
  last_accessed_at
)
SELECT
  u.id as user_id,
  NULL as corporate_account_id,
  NULL as course_id,
  mm.id as module_id,
  'individual' as purchase_type,
  NOW() as purchased_at,
  0.00 as purchase_price_snapshot,
  'not_started' as status,
  0 as progress_percentage,
  0 as completion_percentage,
  false as completed,
  0 as xp_earned,
  NOW() as started_at,
  NOW() as last_accessed_at
FROM auth.users u
CROSS JOIN marketplace_modules mm
WHERE u.email = 'ximenaginsburg@hotmail.com'
  AND mm.title = 'Ciudades Seguras y Espacios Inclusivos'
  AND NOT EXISTS (
    SELECT 1 FROM course_enrollments ce
    WHERE ce.user_id = u.id
      AND ce.module_id = mm.id
      AND ce.course_id IS NULL
  );

-- Step 4: Verify enrollment was created
SELECT 
  'Verification - New Enrollments:' as info,
  ce.id as enrollment_id,
  p.email,
  mm.title as module_title,
  ce.purchased_at,
  ce.status
FROM course_enrollments ce
JOIN auth.users u ON ce.user_id = u.id
JOIN profiles p ON p.id = u.id
LEFT JOIN marketplace_modules mm ON ce.module_id = mm.id
WHERE u.email = 'ximenaginsburg@hotmail.com'
ORDER BY ce.purchased_at DESC;

-- =====================================================
-- BONUS: Enroll in ALL 6 modules (if needed)
-- =====================================================
-- Uncomment this section to enroll in all modules

/*
INSERT INTO course_enrollments (
  user_id,
  corporate_account_id,
  course_id,
  module_id,
  purchase_type,
  purchased_at,
  purchase_price_snapshot,
  status,
  progress_percentage,
  completion_percentage,
  completed,
  xp_earned,
  started_at,
  last_accessed_at
)
SELECT
  u.id as user_id,
  NULL as corporate_account_id,
  NULL as course_id,
  mm.id as module_id,
  'individual' as purchase_type,
  NOW() as purchased_at,
  0.00 as purchase_price_snapshot,
  'not_started' as status,
  0 as progress_percentage,
  0 as completion_percentage,
  false as completed,
  0 as xp_earned,
  NOW() as started_at,
  NOW() as last_accessed_at
FROM auth.users u
CROSS JOIN marketplace_modules mm
WHERE u.email = 'ximenaginsburg@hotmail.com'
  AND mm.published = true
  AND NOT EXISTS (
    SELECT 1 FROM course_enrollments ce
    WHERE ce.user_id = u.id
      AND ce.module_id = mm.id
      AND ce.course_id IS NULL
  );

-- Verify all enrollments
SELECT 
  'All Enrollments Created:' as info,
  COUNT(*) as total_modules
FROM course_enrollments ce
JOIN auth.users u ON ce.user_id = u.id
WHERE u.email = 'ximenaginsburg@hotmail.com';
*/

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT 
  '✅ EMERGENCY FIX COMPLETE' as status,
  'User should now see module on dashboard' as result,
  'NEXT: Debug webhook to prevent this issue' as action_needed;

