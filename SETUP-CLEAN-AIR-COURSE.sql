-- SETUP CLEAN AIR COURSE AND ENROLL EMPLOYEE
-- Step 1: Create the course
-- Step 2: Enroll the employee

DO $$
DECLARE
  v_course_id uuid;
  v_user_id uuid;
  v_corporate_account_id uuid;
BEGIN
  -- Step 1: Create or get the Clean Air course
  INSERT INTO courses (
    title,
    description,
    category,
    difficulty,
    estimated_duration,
    is_published,
    created_at,
    updated_at
  )
  VALUES (
    'Aire Limpio para Todos',
    'Aprende a crear espacios con aire limpio y saludable en tu comunidad y lugar de trabajo',
    'environmental',
    'beginner',
    480, -- 8 hours in minutes
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (title) DO UPDATE 
  SET title = EXCLUDED.title
  RETURNING id INTO v_course_id;

  IF v_course_id IS NULL THEN
    SELECT id INTO v_course_id FROM courses WHERE title = 'Aire Limpio para Todos';
  END IF;

  RAISE NOTICE 'Course ID: %', v_course_id;

  -- Step 2: Get employee info
  SELECT id, corporate_account_id 
  INTO v_user_id, v_corporate_account_id
  FROM profiles
  WHERE email = 'tjockis88@hotmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Employee not found: tjockis88@hotmail.com';
  END IF;

  RAISE NOTICE 'Employee ID: %, Corporate Account: %', v_user_id, v_corporate_account_id;

  -- Step 3: Enroll employee in the course
  INSERT INTO course_enrollments (
    employee_id,
    corporate_account_id,
    course_id,
    assigned_by,
    assigned_at,
    mandatory,
    status,
    completion_percentage,
    modules_completed,
    started_at,
    last_accessed_at,
    xp_earned,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_corporate_account_id,
    v_course_id,
    (SELECT admin_user_id FROM corporate_accounts WHERE id = v_corporate_account_id),
    NOW(),
    true,
    'not_started',
    0,
    0,
    NOW(),
    NOW(),
    0,
    NOW(),
    NOW()
  )
  ON CONFLICT (employee_id, course_id) DO UPDATE
  SET status = 'not_started',
      updated_at = NOW();

  RAISE NOTICE '✅ Employee enrolled in Clean Air course!';

END $$;

-- Verify everything
SELECT 
  '=== COURSE ===' as section,
  c.id,
  c.title,
  c.category,
  c.difficulty
FROM courses c
WHERE c.title = 'Aire Limpio para Todos'

UNION ALL

SELECT 
  '=== ENROLLMENT ===' as section,
  e.id::text,
  e.status,
  e.completion_percentage::text,
  p.email
FROM course_enrollments e
JOIN profiles p ON p.id = e.employee_id
WHERE p.email = 'tjockis88@hotmail.com';

