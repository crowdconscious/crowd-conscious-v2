-- 🔧 FIX lesson_responses TABLE SCHEMA
-- This adds the missing enrollment_id column and fixes relationships

DO $$ 
BEGIN
  RAISE NOTICE '🔍 Checking lesson_responses schema...';
END $$;

-- 1️⃣ Check if enrollment_id column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_responses' 
    AND column_name = 'enrollment_id'
  ) THEN
    RAISE NOTICE '❌ enrollment_id column missing - adding it now...';
    
    -- Add enrollment_id column
    ALTER TABLE lesson_responses 
    ADD COLUMN enrollment_id UUID REFERENCES course_enrollments(id) ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Added enrollment_id column';
  ELSE
    RAISE NOTICE '✅ enrollment_id column already exists';
  END IF;
END $$;

-- 2️⃣ Check if we have old columns that need migration
DO $$ 
BEGIN
  -- If employee_id exists, we need to migrate data
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_responses' 
    AND column_name = 'employee_id'
  ) THEN
    RAISE NOTICE '⚠️ Found old employee_id column - migrating data...';
    
    -- Migrate data: Find enrollment_id based on employee_id and course_id/module_id
    UPDATE lesson_responses lr
    SET enrollment_id = (
      SELECT ce.id 
      FROM course_enrollments ce
      WHERE ce.user_id = lr.employee_id
      AND (
        ce.module_id = lr.module_id OR 
        ce.course_id = lr.course_id
      )
      LIMIT 1
    )
    WHERE lr.enrollment_id IS NULL;
    
    RAISE NOTICE '✅ Data migrated from old columns';
  END IF;
END $$;

-- 3️⃣ Drop old columns if they exist (after migration)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_responses' 
    AND column_name = 'employee_id'
  ) THEN
    RAISE NOTICE '🗑️ Dropping old employee_id column...';
    ALTER TABLE lesson_responses DROP COLUMN IF EXISTS employee_id;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_responses' 
    AND column_name = 'course_id'
  ) THEN
    RAISE NOTICE '🗑️ Dropping old course_id column...';
    ALTER TABLE lesson_responses DROP COLUMN IF EXISTS course_id;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_responses' 
    AND column_name = 'module_id'
  ) THEN
    RAISE NOTICE '🗑️ Dropping old module_id column...';
    ALTER TABLE lesson_responses DROP COLUMN IF EXISTS module_id;
  END IF;
  
  RAISE NOTICE '✅ Old columns removed';
END $$;

-- 4️⃣ Ensure enrollment_id is NOT NULL (make it required)
DO $$ 
BEGIN
  ALTER TABLE lesson_responses 
  ALTER COLUMN enrollment_id SET NOT NULL;
  
  RAISE NOTICE '✅ enrollment_id is now required';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not make enrollment_id required - some rows might have NULL values';
END $$;

-- 5️⃣ Create or recreate unique constraint
DO $$ 
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE lesson_responses 
  DROP CONSTRAINT IF EXISTS lesson_responses_enrollment_id_lesson_id_key;
  
  -- Create new constraint
  ALTER TABLE lesson_responses 
  ADD CONSTRAINT lesson_responses_enrollment_id_lesson_id_key 
  UNIQUE (enrollment_id, lesson_id);
  
  RAISE NOTICE '✅ Unique constraint created: (enrollment_id, lesson_id)';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not create unique constraint - might already exist';
END $$;

-- 6️⃣ Verify final schema
DO $$ 
BEGIN
  RAISE NOTICE '📋 Final lesson_responses schema:';
END $$;

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  '✅ Current schema' as note
FROM information_schema.columns
WHERE table_name = 'lesson_responses'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7️⃣ Show any existing data
DO $$ 
BEGIN
  RAISE NOTICE '📊 Checking for existing lesson responses...';
END $$;

SELECT 
  COUNT(*) as total_responses,
  COUNT(DISTINCT enrollment_id) as unique_enrollments,
  COUNT(DISTINCT lesson_id) as unique_lessons,
  '📊 Existing data' as note
FROM lesson_responses;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Schema fix complete!';
END $$;

