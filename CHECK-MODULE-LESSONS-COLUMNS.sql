-- Check what columns actually exist in module_lessons table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'module_lessons'
ORDER BY ordinal_position;

