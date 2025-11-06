-- 🚨 CRITICAL: Fix course_enrollments schema
-- Missing columns are causing webhook failures!

-- Step 1: Check current columns
DO $$ 
BEGIN 
  RAISE NOTICE '📊 Current course_enrollments columns:';
END $$;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'course_enrollments'
ORDER BY ordinal_position;

-- Step 2: Add missing columns if they don't exist

-- Progress tracking columns
ALTER TABLE course_enrollments 
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;

ALTER TABLE course_enrollments 
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false;

ALTER TABLE course_enrollments 
ADD COLUMN IF NOT EXISTS completion_date TIMESTAMP DEFAULT NULL;

ALTER TABLE course_enrollments 
ADD COLUMN IF NOT EXISTS certificate_url TEXT DEFAULT NULL;

-- Purchase information columns
ALTER TABLE course_enrollments 
ADD COLUMN IF NOT EXISTS purchase_type TEXT DEFAULT 'corporate';

ALTER TABLE course_enrollments 
ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMP DEFAULT NOW();

ALTER TABLE course_enrollments 
ADD COLUMN IF NOT EXISTS purchase_price_snapshot NUMERIC(10, 2) DEFAULT 0.00;

-- Activity tracking
ALTER TABLE course_enrollments 
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP DEFAULT NULL;

-- Step 3: Make corporate_account_id nullable (for individual purchases)
ALTER TABLE course_enrollments 
ALTER COLUMN corporate_account_id DROP NOT NULL;

-- Step 4: Verify the fix worked
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Schema update complete! New columns:';
END $$;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'course_enrollments'
ORDER BY ordinal_position;

-- Step 5: Test insert with new schema
DO $$
DECLARE
  v_user_id UUID;
  v_module_id UUID;
  v_test_enrollment_id UUID;
BEGIN
  -- Get a test user
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  -- Get a test module
  SELECT id INTO v_module_id FROM marketplace_modules WHERE status = 'published' LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ No users found for testing';
    RETURN;
  END IF;
  
  IF v_module_id IS NULL THEN
    RAISE NOTICE '❌ No published modules found for testing';
    RETURN;
  END IF;
  
  RAISE NOTICE '🧪 Testing enrollment insert...';
  RAISE NOTICE '   User ID: %', v_user_id;
  RAISE NOTICE '   Module ID: %', v_module_id;
  
  -- Try to insert test enrollment (will rollback)
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
  ) VALUES (
    v_user_id,
    NULL, -- Individual purchase
    v_module_id,
    'individual',
    NOW(),
    360.00,
    0,
    false,
    NOW()
  )
  RETURNING id INTO v_test_enrollment_id;
  
  RAISE NOTICE '✅ TEST ENROLLMENT CREATED: %', v_test_enrollment_id;
  RAISE NOTICE '✅ Schema is now correct!';
  RAISE NOTICE '🔥 Webhook should work now!';
  
  -- Rollback test enrollment
  DELETE FROM course_enrollments WHERE id = v_test_enrollment_id;
  RAISE NOTICE '🧹 Test enrollment cleaned up';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ TEST FAILED!';
  RAISE NOTICE '   Error: %', SQLERRM;
  RAISE NOTICE '   Details: %', SQLSTATE;
  RAISE NOTICE '';
  RAISE NOTICE '🚨 THIS IS WHY WEBHOOK IS FAILING!';
END $$;

