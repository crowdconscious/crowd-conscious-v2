-- Check if the unique constraint exists for lesson_responses
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.lesson_responses'::regclass
AND contype IN ('u', 'p');  -- unique or primary key

-- Also check columns that exist
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'lesson_responses'
ORDER BY ordinal_position;

-- Try to manually insert a test lesson response
-- REPLACE these UUIDs with your actual values from the debug query
/*
INSERT INTO lesson_responses (
  enrollment_id,
  lesson_id,
  module_id,
  completed,
  completed_at
) VALUES (
  'YOUR_ENROLLMENT_ID_HERE',  -- From debug query
  'YOUR_LESSON_1_ID_HERE',    -- From debug query
  '63c08c28-638d-42d9-ba5d-ecfc541957b0',
  true,
  NOW()
)
ON CONFLICT (enrollment_id, lesson_id) 
DO UPDATE SET 
  completed = true,
  completed_at = NOW();
*/

