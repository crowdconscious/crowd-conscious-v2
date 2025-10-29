-- COMPLETE SETUP: Create Clean Air course and enroll employee

DO $$
DECLARE
  v_course_id uuid := 'a1a1a1a1-1111-1111-1111-111111111111'::uuid;
  v_user_id uuid;
  v_corporate_account_id uuid;
BEGIN
  -- Step 1: Create the Clean Air course with all required fields
  INSERT INTO courses (
    id,
    title,
    slug,
    description,
    core_value,
    module_count,
    estimated_hours,
    difficulty,
    is_custom,
    certification_points,
    passing_percentage,
    published,
    featured,
    created_at,
    updated_at
  )
  VALUES (
    v_course_id,
    'Aire Limpio para Todos',
    'aire-limpio',
    'Aprende a crear espacios con aire limpio y saludable. Descubre cómo María transforma su comunidad al mejorar la calidad del aire.',
    'clean_air',
    3, -- 3 lessons
    8, -- 8 hours estimated
    'beginner',
    false,
    100, -- certification points
    70, -- passing percentage
    true,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '✅ Course created with ID: %', v_course_id;

  -- Step 2: Get employee info
  SELECT id, corporate_account_id 
  INTO v_user_id, v_corporate_account_id
  FROM profiles
  WHERE email = 'tjockis88@hotmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Employee not found: tjockis88@hotmail.com';
  END IF;

  RAISE NOTICE 'Found employee: %', v_user_id;

  -- Step 3: Enroll employee in the course
  INSERT INTO course_enrollments (
    employee_id,
    corporate_account_id,
    course_id,
    assigned_at,
    mandatory,
    status,
    completion_percentage,
    modules_completed,
    started_at,
    last_accessed_at,
    xp_earned
  )
  VALUES (
    v_user_id,
    v_corporate_account_id,
    v_course_id,
    NOW(),
    true,
    'not_started',
    0,
    0,
    NOW(),
    NOW(),
    0
  )
  ON CONFLICT (employee_id, course_id) DO UPDATE
  SET status = 'not_started', updated_at = NOW();

  RAISE NOTICE '✅ Employee enrolled in Clean Air course!';

END $$;

-- Verify the setup
SELECT 
  '=== COURSE ===' as info,
  c.id::text as value1,
  c.title as value2,
  '' as value3
FROM courses c
WHERE c.id = 'a1a1a1a1-1111-1111-1111-111111111111'::uuid

UNION ALL

SELECT 
  '=== ENROLLMENT ===' as info,
  e.id::text,
  e.status,
  e.completion_percentage::text || '%'
FROM course_enrollments e
WHERE e.employee_id = (SELECT id FROM profiles WHERE email = 'tjockis88@hotmail.com');

