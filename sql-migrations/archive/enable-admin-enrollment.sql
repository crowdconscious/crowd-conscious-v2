-- Enable Corporate Admins to Enroll in Courses
-- This allows admins to take the training themselves

-- Function to enroll admin in a course
CREATE OR REPLACE FUNCTION enroll_admin_in_course(
  p_admin_id UUID,
  p_course_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_corporate_account_id UUID;
  v_enrollment_id UUID;
BEGIN
  -- Get admin's corporate account ID
  SELECT corporate_account_id INTO v_corporate_account_id
  FROM profiles
  WHERE id = p_admin_id
  AND is_corporate_user = true
  AND corporate_role = 'admin';

  IF v_corporate_account_id IS NULL THEN
    RAISE EXCEPTION 'User is not a corporate admin';
  END IF;

  -- Create enrollment
  INSERT INTO course_enrollments (
    employee_id,
    corporate_account_id,
    course_id,
    status,
    enrolled_at,
    last_accessed_at
  )
  VALUES (
    p_admin_id,
    v_corporate_account_id,
    p_course_id,
    'not_started',
    NOW(),
    NOW()
  )
  ON CONFLICT (employee_id, course_id) DO UPDATE
  SET last_accessed_at = NOW()
  RETURNING id INTO v_enrollment_id;

  RETURN v_enrollment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example: Enroll specific admin in Clean Air course
-- Replace with your admin's email
DO $$
DECLARE
  v_admin_id UUID;
  v_course_id UUID := 'a1a1a1a1-1111-1111-1111-111111111111'; -- Clean Air course
BEGIN
  -- Get admin ID from email
  SELECT id INTO v_admin_id
  FROM profiles
  WHERE email = 'francisco.blockstrand@gmail.com' -- Replace with your email
  AND is_corporate_user = true
  AND corporate_role = 'admin';

  IF v_admin_id IS NOT NULL THEN
    PERFORM enroll_admin_in_course(v_admin_id, v_course_id);
    RAISE NOTICE 'Admin enrolled successfully!';
  ELSE
    RAISE NOTICE 'Admin not found with that email';
  END IF;
END $$;

-- Add comment
COMMENT ON FUNCTION enroll_admin_in_course IS 'Allows corporate admins to enroll themselves in courses to experience the training';

