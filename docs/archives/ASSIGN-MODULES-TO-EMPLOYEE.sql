-- 🎓 ASSIGN CLEAN AIR MODULE TO EMPLOYEE
-- Run this to enroll an employee in the Clean Air module

DO $$
DECLARE
  v_user_id uuid;
  v_corporate_account_id uuid;
  v_employee_email text := 'tjockis88@hotmail.com'; -- CHANGE THIS to employee email
BEGIN
  -- Get user ID and corporate account
  SELECT id, corporate_account_id 
  INTO v_user_id, v_corporate_account_id
  FROM profiles
  WHERE email = v_employee_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Employee not found: %', v_employee_email;
  END IF;

  RAISE NOTICE 'Found employee: % (corporate_account: %)', v_user_id, v_corporate_account_id;

  -- Enroll in Clean Air module
  INSERT INTO course_enrollments (
    employee_id,
    corporate_account_id,
    module_id,
    module_name,
    status,
    completion_percentage,
    started_at,
    last_activity_at
  )
  VALUES (
    v_user_id,
    v_corporate_account_id,
    'clean_air',
    'Aire Limpio para Todos',
    'not_started',
    0,
    NOW(),
    NOW()
  )
  ON CONFLICT (employee_id, module_id) DO NOTHING;

  RAISE NOTICE '✅ Employee enrolled in Clean Air module!';

  -- Show the enrollment
  RAISE NOTICE '=== ENROLLMENT CREATED ===';
  
END $$;

-- Verify enrollment
SELECT 
  e.module_id,
  e.module_name,
  e.status,
  e.completion_percentage,
  p.email as employee_email,
  p.full_name as employee_name
FROM course_enrollments e
JOIN profiles p ON p.id = e.employee_id
WHERE p.email = 'tjockis88@hotmail.com';

