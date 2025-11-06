-- Check if this specific lesson ID exists
-- Module: Gestión Sostenible del Agua (53d0b2fd-fc34-42a3-adb7-0463ecf8b1ce)
-- Lesson: b37cf275-91ce-42cc-93c7-5f1e7065d130

SELECT 
  'Checking lesson from error' as check_type,
  m.title as module_title,
  m.id as module_id,
  l.id as lesson_id,
  l.lesson_order,
  l.title as lesson_title,
  l.description,
  l.estimated_minutes,
  l.xp_reward
FROM marketplace_modules m
LEFT JOIN module_lessons l ON m.id = l.module_id
WHERE m.id = '53d0b2fd-fc34-42a3-adb7-0463ecf8b1ce'
  AND l.id = 'b37cf275-91ce-42cc-93c7-5f1e7065d130';

-- Also check ALL lessons for this module
SELECT 
  'All lessons for this module' as check_type,
  l.id as lesson_id,
  l.lesson_order,
  l.title as lesson_title
FROM module_lessons l
WHERE l.module_id = '53d0b2fd-fc34-42a3-adb7-0463ecf8b1ce'
ORDER BY l.lesson_order;

