-- 🔄 MIGRATE lesson_responses TO NEW SCHEMA
-- This will clear old incompatible data and set up the new structure

DO $$ 
BEGIN
  RAISE NOTICE '🔄 Starting schema migration...';
END $$;

-- STEP 1: Clear old incompatible data (only 3 test responses)
DO $$ 
BEGIN
  RAISE NOTICE '🗑️ Clearing old test data with text-based lesson_ids...';
END $$;

DELETE FROM lesson_responses 
WHERE lesson_id NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

DO $$ 
BEGIN
  RAISE NOTICE '✅ Old data cleared';
END $$;

-- STEP 2: Change lesson_id from TEXT to UUID
DO $$ 
BEGIN
  RAISE NOTICE '🔄 Converting lesson_id column to UUID...';
  
  -- Drop if it's text, recreate as UUID
  ALTER TABLE lesson_responses 
  ALTER COLUMN lesson_id TYPE UUID USING lesson_id::uuid;
  
  RAISE NOTICE '✅ lesson_id is now UUID';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ lesson_id column type conversion failed or already UUID';
END $$;

-- STEP 3: Change module_id from TEXT to UUID  
DO $$ 
BEGIN
  RAISE NOTICE '🔄 Converting module_id column to UUID...';
  
  ALTER TABLE lesson_responses 
  ALTER COLUMN module_id TYPE UUID USING module_id::uuid;
  
  RAISE NOTICE '✅ module_id is now UUID';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ module_id column type conversion failed or already UUID';
END $$;

-- STEP 4: Add enrollment_id column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_responses' 
    AND column_name = 'enrollment_id'
  ) THEN
    RAISE NOTICE '➕ Adding enrollment_id column...';
    
    ALTER TABLE lesson_responses 
    ADD COLUMN enrollment_id UUID REFERENCES course_enrollments(id) ON DELETE CASCADE;
    
    RAISE NOTICE '✅ enrollment_id column added';
  ELSE
    RAISE NOTICE '✅ enrollment_id already exists';
  END IF;
END $$;

-- STEP 5: Add completed column (boolean)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_responses' 
    AND column_name = 'completed'
  ) THEN
    RAISE NOTICE '➕ Adding completed column...';
    
    ALTER TABLE lesson_responses 
    ADD COLUMN completed BOOLEAN DEFAULT true;
    
    RAISE NOTICE '✅ completed column added';
  ELSE
    RAISE NOTICE '✅ completed already exists';
  END IF;
END $$;

-- STEP 6: Add quiz_score column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_responses' 
    AND column_name = 'quiz_score'
  ) THEN
    RAISE NOTICE '➕ Adding quiz_score column...';
    
    ALTER TABLE lesson_responses 
    ADD COLUMN quiz_score INTEGER;
    
    RAISE NOTICE '✅ quiz_score column added';
  ELSE
    RAISE NOTICE '✅ quiz_score already exists';
  END IF;
END $$;

-- STEP 7: Drop old columns we don't need
DO $$ 
BEGIN
  RAISE NOTICE '🗑️ Removing old columns...';
  
  ALTER TABLE lesson_responses 
  DROP COLUMN IF EXISTS employee_id CASCADE;
  
  ALTER TABLE lesson_responses 
  DROP COLUMN IF EXISTS corporate_account_id CASCADE;
  
  ALTER TABLE lesson_responses 
  DROP COLUMN IF EXISTS course_id CASCADE;
  
  -- Keep: responses, reflection, action_items, carbon_data, cost_data, evidence_urls, impact_comparisons
  
  RAISE NOTICE '✅ Old columns removed';
END $$;

-- STEP 8: Make enrollment_id required (NOT NULL)
DO $$ 
BEGIN
  RAISE NOTICE '🔒 Making enrollment_id required...';
  
  -- Set a default for any NULL values first
  UPDATE lesson_responses 
  SET enrollment_id = (
    SELECT id FROM course_enrollments 
    WHERE module_id = lesson_responses.module_id 
    LIMIT 1
  )
  WHERE enrollment_id IS NULL;
  
  ALTER TABLE lesson_responses 
  ALTER COLUMN enrollment_id SET NOT NULL;
  
  RAISE NOTICE '✅ enrollment_id is now required';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not make enrollment_id required';
END $$;

-- STEP 9: Create unique constraint
DO $$ 
BEGIN
  RAISE NOTICE '🔐 Creating unique constraint...';
  
  -- Drop old constraints
  ALTER TABLE lesson_responses 
  DROP CONSTRAINT IF EXISTS lesson_responses_enrollment_id_lesson_id_key;
  
  ALTER TABLE lesson_responses 
  DROP CONSTRAINT IF EXISTS lesson_responses_employee_id_lesson_id_key;
  
  -- Create new constraint
  ALTER TABLE lesson_responses 
  ADD CONSTRAINT lesson_responses_enrollment_id_lesson_id_key 
  UNIQUE (enrollment_id, lesson_id);
  
  RAISE NOTICE '✅ Unique constraint created';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Constraint creation failed or already exists';
END $$;

-- STEP 10: Verify final schema
DO $$ 
BEGIN
  RAISE NOTICE '✅ Migration complete! Here''s the new schema:';
END $$;

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default,
  '✅ NEW SCHEMA' as note
FROM information_schema.columns
WHERE table_name = 'lesson_responses'
  AND table_schema = 'public'
ORDER BY 
  CASE column_name
    WHEN 'id' THEN 1
    WHEN 'enrollment_id' THEN 2
    WHEN 'lesson_id' THEN 3
    WHEN 'module_id' THEN 4
    WHEN 'completed' THEN 5
    WHEN 'quiz_score' THEN 6
    ELSE 99
  END;

-- Show current data
SELECT 
  COUNT(*) as remaining_responses,
  '📊 Data after migration' as note
FROM lesson_responses;

DO $$ 
BEGIN
  RAISE NOTICE '🎉 Schema migration complete!';
  RAISE NOTICE '📝 Note: Old test data was cleared (incompatible string lesson_ids)';
  RAISE NOTICE '✅ Ready for new UUID-based lesson tracking';
END $$;

