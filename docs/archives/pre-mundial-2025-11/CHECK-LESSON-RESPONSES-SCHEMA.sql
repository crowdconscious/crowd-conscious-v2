-- 🔍 CHECK ACTUAL SCHEMA OF lesson_responses

SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default,
  '👉 Actual columns in lesson_responses' as note
FROM information_schema.columns
WHERE table_name = 'lesson_responses'
  AND table_schema = 'public'
ORDER BY ordinal_position;

