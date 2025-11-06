-- Quick check of actual table structures
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('course_enrollments', 'lesson_responses', 'lesson_progress', 'module_lessons')
ORDER BY table_name, ordinal_position;

