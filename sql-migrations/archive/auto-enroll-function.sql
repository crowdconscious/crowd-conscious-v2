-- AUTO-ENROLL FUNCTION FOR NEW EMPLOYEES
-- This function enrolls a new employee in all modules included in their company's program

CREATE OR REPLACE FUNCTION auto_enroll_employee(
  p_employee_id uuid,
  p_corporate_account_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_modules_included text[];
  v_module text;
BEGIN
  -- Get modules included in the corporate account's program
  SELECT modules_included INTO v_modules_included
  FROM corporate_accounts
  WHERE id = p_corporate_account_id;

  -- If no modules specified, enroll in Clean Air by default
  IF v_modules_included IS NULL OR array_length(v_modules_included, 1) IS NULL THEN
    v_modules_included := ARRAY['clean_air'];
  END IF;

  -- Enroll employee in each module
  FOREACH v_module IN ARRAY v_modules_included
  LOOP
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
      p_employee_id,
      p_corporate_account_id,
      v_module,
      CASE v_module
        WHEN 'clean_air' THEN 'Aire Limpio para Todos'
        WHEN 'clean_water' THEN 'Agua Limpia'
        WHEN 'safe_cities' THEN 'Ciudades Seguras'
        WHEN 'zero_waste' THEN 'Cero Residuos'
        WHEN 'fair_trade' THEN 'Comercio Justo'
        WHEN 'integration' THEN 'Integración & Impacto'
        ELSE v_module
      END,
      'not_started',
      0,
      NOW(),
      NOW()
    )
    ON CONFLICT (employee_id, module_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Employee % enrolled in % modules', p_employee_id, array_length(v_modules_included, 1);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION auto_enroll_employee(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_enroll_employee(uuid, uuid) TO service_role;

