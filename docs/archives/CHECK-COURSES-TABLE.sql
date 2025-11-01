-- Check if courses table exists and what columns it has

SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'courses'
ORDER BY ordinal_position;

-- Also check if any courses exist
SELECT COUNT(*) as course_count FROM courses;

