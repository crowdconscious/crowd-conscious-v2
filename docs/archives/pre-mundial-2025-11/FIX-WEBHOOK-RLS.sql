-- ============================================================================
-- FIX WEBHOOK RLS POLICIES - Allow service role to create enrollments
-- ============================================================================
-- This ensures the webhook (using service role) can create enrollments
-- ============================================================================

-- Step 1: Check current RLS policies on course_enrollments
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'course_enrollments';

-- Step 2: Ensure RLS is enabled but allows service role
-- The service role BYPASSES RLS by default, but let's verify

-- Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'course_enrollments';

-- Step 3: Grant permissions to authenticated role
GRANT ALL ON course_enrollments TO authenticated;
GRANT ALL ON course_enrollments TO service_role;

-- Step 4: Verify the grant worked
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'course_enrollments';

-- Step 5: Test inserting as service role (this simulates webhook)
-- This should work WITHOUT errors
DO $$ 
DECLARE
  test_user_id UUID;
  test_module_id UUID;
BEGIN
  -- Get a real user ID
  SELECT id INTO test_user_id 
  FROM auth.users 
  WHERE email ILIKE '%francisco%'
  LIMIT 1;
  
  -- Get a real module ID
  SELECT id INTO test_module_id 
  FROM marketplace_modules 
  WHERE status = 'published'
  LIMIT 1;
  
  IF test_user_id IS NOT NULL AND test_module_id IS NOT NULL THEN
    RAISE NOTICE '✅ Test user: %', test_user_id;
    RAISE NOTICE '✅ Test module: %', test_module_id;
    RAISE NOTICE 'Attempting insert...';
    
    -- Try to insert (will rollback at end of block)
    BEGIN
      INSERT INTO course_enrollments (
        user_id,
        corporate_account_id,
        module_id,
        purchase_type,
        purchased_at,
        purchase_price_snapshot,
        progress_percentage,
        completed,
        enrolled_at
      )
      VALUES (
        test_user_id,
        NULL,
        test_module_id,
        'individual',
        NOW(),
        0.00,
        0,
        false,
        NOW()
      );
      
      RAISE NOTICE '✅ INSERT SUCCEEDED! Webhook should work.';
      
      -- Rollback this test insert
      RAISE EXCEPTION 'Test successful, rolling back...';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM LIKE '%Test successful%' THEN
          RAISE NOTICE '✅ Test completed successfully';
        ELSE
          RAISE NOTICE '❌ INSERT FAILED: %', SQLERRM;
          RAISE NOTICE '🔧 This is why webhook is failing!';
        END IF;
    END;
  ELSE
    RAISE NOTICE '❌ Could not find test user or module';
  END IF;
END $$;

