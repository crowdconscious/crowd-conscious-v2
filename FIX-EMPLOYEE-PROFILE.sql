-- 🔧 FIX EMPLOYEE PROFILE FLAGS
-- Run this in Supabase SQL Editor to fix an employee's profile

-- This will update the employee's profile with the correct corporate flags

DO $$
DECLARE
  v_user_id uuid;
  v_corporate_account_id uuid;
  v_email text := 'tjockis88@hotmail.com'; -- CHANGE THIS to the employee's email
BEGIN
  -- Get the user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', v_email;
  END IF;

  RAISE NOTICE 'Found user ID: %', v_user_id;

  -- Get the corporate account ID from the invitation
  SELECT corporate_account_id INTO v_corporate_account_id
  FROM employee_invitations
  WHERE email = v_email
  ORDER BY invited_at DESC
  LIMIT 1;

  IF v_corporate_account_id IS NULL THEN
    RAISE EXCEPTION 'No invitation found for email: %', v_email;
  END IF;

  RAISE NOTICE 'Found corporate account ID: %', v_corporate_account_id;

  -- Update or insert the profile
  INSERT INTO profiles (
    id,
    email,
    full_name,
    corporate_account_id,
    corporate_role,
    is_corporate_user,
    created_at
  )
  VALUES (
    v_user_id,
    v_email,
    COALESCE(
      (SELECT full_name FROM employee_invitations WHERE email = v_email LIMIT 1),
      split_part(v_email, '@', 1)
    ),
    v_corporate_account_id,
    'employee',
    true,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    corporate_account_id = v_corporate_account_id,
    corporate_role = 'employee',
    is_corporate_user = true;

  RAISE NOTICE '✅ Profile updated successfully';

  -- Show the updated profile
  RAISE NOTICE '=== UPDATED PROFILE ===';
  RAISE NOTICE 'Email: %', v_email;
  RAISE NOTICE 'Corporate Account ID: %', v_corporate_account_id;
  RAISE NOTICE 'Corporate Role: employee';
  RAISE NOTICE 'Is Corporate User: true';

END $$;

-- Verify the update
SELECT 
  '=== VERIFICATION ===' as section,
  id,
  email,
  full_name,
  corporate_account_id,
  corporate_role,
  is_corporate_user
FROM profiles
WHERE email = 'tjockis88@hotmail.com';

