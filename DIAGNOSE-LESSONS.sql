-- =====================================================
-- DIAGNOSE: Check if lessons actually exist
-- =====================================================

-- 1. Check how many modules exist
SELECT 'MODULES:' as check_type, COUNT(*) as count, status
FROM marketplace_modules
GROUP BY status;

-- 2. Check how many lessons exist
SELECT 'LESSONS:' as check_type, COUNT(*) as total_lessons
FROM module_lessons;

-- 3. Check lessons per module
SELECT 
  m.title as module_title,
  m.slug as module_slug,
  m.id as module_id,
  COUNT(l.id) as lesson_count
FROM marketplace_modules m
LEFT JOIN module_lessons l ON m.id = l.module_id
WHERE m.status = 'published' AND m.is_template = false
GROUP BY m.id, m.title, m.slug
ORDER BY m.title;

-- 4. Check the specific module from your error
SELECT 
  m.title,
  m.id as module_id,
  l.id as lesson_id,
  l.lesson_order,
  l.title as lesson_title
FROM marketplace_modules m
LEFT JOIN module_lessons l ON m.id = l.module_id
WHERE m.id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
ORDER BY l.lesson_order;

-- 5. Show all lesson IDs and their modules
SELECT 
  m.title as module_title,
  l.id as lesson_id,
  l.lesson_order,
  l.title as lesson_title
FROM module_lessons l
JOIN marketplace_modules m ON l.module_id = m.id
WHERE m.status = 'published'
ORDER BY m.title, l.lesson_order
LIMIT 50;

