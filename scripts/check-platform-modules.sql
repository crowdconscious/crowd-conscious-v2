-- Diagnostic query to check if platform modules exist
-- Run this in Supabase SQL Editor to verify modules were imported

SELECT 
  id,
  title,
  status,
  is_platform_module,
  featured,
  lesson_count,
  created_at
FROM marketplace_modules
WHERE is_platform_module = TRUE
ORDER BY created_at DESC;

-- If this returns 0 rows, the SQL script wasn't run successfully
-- If it returns 4 rows, the modules exist!

-- Also check lesson count:
SELECT 
  m.title as module_title,
  COUNT(l.id) as actual_lesson_count,
  m.lesson_count as declared_lesson_count
FROM marketplace_modules m
LEFT JOIN module_lessons l ON l.module_id = m.id
WHERE m.is_platform_module = TRUE
GROUP BY m.id, m.title, m.lesson_count;

