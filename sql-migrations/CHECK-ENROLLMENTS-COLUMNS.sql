-- Check exact columns in course_enrollments table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'course_enrollments'
ORDER BY ordinal_position;

