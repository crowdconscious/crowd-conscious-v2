-- Verify the exact lesson ID from the error exists
-- Module: 63c08c28-638d-42d9-ba5d-ecfc541957b0
-- Lesson: 0ae5dc06-ccea-4a19-8a14-5c37cb8ecdf7

SELECT 
  'Checking module' as check_type,
  id,
  title,
  slug
FROM marketplace_modules 
WHERE id = '63c08c28-638d-42d9-ba5d-ecfc541957b0';

SELECT 
  'Checking lesson' as check_type,
  id,
  module_id,
  lesson_order,
  title,
  description,
  content IS NOT NULL as has_content,
  length(content) as content_length
FROM module_lessons 
WHERE id = '0ae5dc06-ccea-4a19-8a14-5c37cb8ecdf7';

-- Also check if module_id matches
SELECT 
  'Cross-check' as check_type,
  l.id as lesson_id,
  l.module_id as lesson_module_id,
  l.title as lesson_title,
  m.id as module_id,
  m.title as module_title
FROM module_lessons l
LEFT JOIN marketplace_modules m ON l.module_id = m.id
WHERE l.id = '0ae5dc06-ccea-4a19-8a14-5c37cb8ecdf7';

