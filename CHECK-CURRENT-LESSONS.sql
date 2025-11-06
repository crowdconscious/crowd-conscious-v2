-- Check what lesson IDs actually exist NOW for Aire Limpio module

SELECT 
  m.title as module_title,
  m.id as module_id,
  l.id as lesson_id,
  l.lesson_order,
  l.title as lesson_title,
  l.created_at
FROM marketplace_modules m
JOIN module_lessons l ON m.id = l.module_id
WHERE m.slug = 'aire-limpio-despertar-corporativo'
ORDER BY l.lesson_order;

-- Also check if this specific lesson ID exists
SELECT 
  'Checking if lesson exists:' as status,
  EXISTS(
    SELECT 1 FROM module_lessons 
    WHERE id = '0ae5dc06-ccea-4a19-8a14-5c37cb8ecdf7'
  ) as lesson_exists;

