-- Enable Corporate Admin Self-Enrollment (FIXED VERSION)
-- This version checks the actual schema and uses correct column names

-- Step 1: Check existing enrollment
-- Run this first to see if you're already enrolled
SELECT 
  ce.id,
  ce.status,
  ce.completion_percentage,
  ce.xp_earned,
  c.title as course_title
FROM course_enrollments ce
JOIN courses c ON c.id = ce.course_id
WHERE ce.employee_id = (
  SELECT id FROM profiles 
  WHERE email = 'francisco.blockstrand@gmail.com'
  AND is_corporate_user = true
  AND corporate_role = 'admin'
);

-- Step 2: If not enrolled, run this to enroll
-- Simple INSERT without assuming column names
DO $$
DECLARE
  v_admin_id UUID;
  v_corporate_account_id UUID;
  v_course_id UUID := 'a1a1a1a1-1111-1111-1111-111111111111'; -- Clean Air course
BEGIN
  -- Get admin details
  SELECT id, corporate_account_id 
  INTO v_admin_id, v_corporate_account_id
  FROM profiles
  WHERE email = 'francisco.blockstrand@gmail.com' -- Replace with your email
  AND is_corporate_user = true
  AND corporate_role = 'admin';

  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'Admin not found with that email';
    RETURN;
  END IF;

  -- Check if already enrolled
  IF EXISTS (
    SELECT 1 FROM course_enrollments 
    WHERE employee_id = v_admin_id AND course_id = v_course_id
  ) THEN
    RAISE NOTICE 'Already enrolled! ✅';
    RETURN;
  END IF;

  -- Enroll admin (using only required columns)
  INSERT INTO course_enrollments (
    employee_id,
    corporate_account_id,
    course_id,
    status,
    completion_percentage,
    modules_completed,
    xp_earned
  )
  VALUES (
    v_admin_id,
    v_corporate_account_id,
    v_course_id,
    'not_started',
    0,
    0,
    0
  );

  RAISE NOTICE '✅ Admin enrolled successfully!';
  RAISE NOTICE 'Now refresh your corporate dashboard to see your progress card.';
  
END $$;

