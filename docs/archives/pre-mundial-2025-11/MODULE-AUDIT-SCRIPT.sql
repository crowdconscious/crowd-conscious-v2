-- =====================================================
-- MODULE STRUCTURE & CONTENT AUDIT
-- =====================================================
-- 
-- This script audits module structure and content:
-- 1. Lists all modules with their lessons
-- 2. Checks tools_used, resources, and activities for each lesson
-- 3. Identifies missing or broken resources
-- =====================================================

-- =====================================================
-- 1. MODULE OVERVIEW
-- =====================================================

SELECT 
  id,
  title,
  slug,
  status,
  lesson_count,
  created_at
FROM marketplace_modules
WHERE is_platform_module = true
ORDER BY id;

-- =====================================================
-- 2. LESSON STRUCTURE BY MODULE
-- =====================================================

SELECT 
  m.id as module_id,
  m.title as module_title,
  ml.id as lesson_id,
  ml.lesson_order,
  ml.title as lesson_title,
  ml.estimated_minutes,
  ml.xp_reward,
  ml.tools_used,
  ml.resources,
  ml.activity_type,
  ml.activity_config,
  ml.activity_required
FROM marketplace_modules m
LEFT JOIN module_lessons ml ON ml.module_id = m.id
WHERE m.is_platform_module = true
ORDER BY m.id, ml.lesson_order;

-- =====================================================
-- 3. TOOLS ANALYSIS
-- =====================================================

-- Count tools per module
SELECT 
  m.title as module_title,
  ml.lesson_order,
  ml.title as lesson_title,
  array_length(ml.tools_used, 1) as tool_count,
  ml.tools_used as tools_list
FROM marketplace_modules m
JOIN module_lessons ml ON ml.module_id = m.id
WHERE m.is_platform_module = true
  AND ml.tools_used IS NOT NULL
  AND array_length(ml.tools_used, 1) > 0
ORDER BY m.id, ml.lesson_order;

-- Lessons with NO tools
SELECT 
  m.title as module_title,
  ml.lesson_order,
  ml.title as lesson_title
FROM marketplace_modules m
JOIN module_lessons ml ON ml.module_id = m.id
WHERE m.is_platform_module = true
  AND (ml.tools_used IS NULL OR array_length(ml.tools_used, 1) = 0)
ORDER BY m.id, ml.lesson_order;

-- =====================================================
-- 4. RESOURCES ANALYSIS
-- =====================================================

-- Resources per lesson (with URL validation)
SELECT 
  m.title as module_title,
  ml.lesson_order,
  ml.title as lesson_title,
  ml.resources,
  jsonb_array_length(COALESCE(ml.resources, '[]'::jsonb)) as resource_count
FROM marketplace_modules m
JOIN module_lessons ml ON ml.module_id = m.id
WHERE m.is_platform_module = true
  AND ml.resources IS NOT NULL
  AND jsonb_array_length(COALESCE(ml.resources, '[]'::jsonb)) > 0
ORDER BY m.id, ml.lesson_order;

-- Extract resource URLs for validation
SELECT 
  m.title as module_title,
  ml.lesson_order,
  ml.title as lesson_title,
  resource->>'title' as resource_title,
  resource->>'type' as resource_type,
  resource->>'url' as resource_url,
  CASE 
    WHEN resource->>'url' IS NULL OR resource->>'url' = '' THEN '❌ MISSING URL'
    WHEN resource->>'url' LIKE 'http://%' OR resource->>'url' LIKE 'https://%' THEN '✅ VALID FORMAT'
    WHEN resource->>'url' LIKE 'tool:%' THEN '🔧 TOOL REFERENCE'
    ELSE '⚠️ INVALID FORMAT'
  END as url_status
FROM marketplace_modules m
JOIN module_lessons ml ON ml.module_id = m.id
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ml.resources, '[]'::jsonb)) as resource
WHERE m.is_platform_module = true
  AND ml.resources IS NOT NULL
ORDER BY m.id, ml.lesson_order, resource->>'title';

-- Lessons with NO resources
SELECT 
  m.title as module_title,
  ml.lesson_order,
  ml.title as lesson_title
FROM marketplace_modules m
JOIN module_lessons ml ON ml.module_id = m.id
WHERE m.is_platform_module = true
  AND (ml.resources IS NULL OR jsonb_array_length(COALESCE(ml.resources, '[]'::jsonb)) = 0)
ORDER BY m.id, ml.lesson_order;

-- =====================================================
-- 5. ACTIVITIES ANALYSIS
-- =====================================================

-- Activities per lesson
SELECT 
  m.title as module_title,
  ml.lesson_order,
  ml.title as lesson_title,
  ml.activity_type,
  ml.activity_config,
  ml.activity_required
FROM marketplace_modules m
JOIN module_lessons ml ON ml.module_id = m.id
WHERE m.is_platform_module = true
ORDER BY m.id, ml.lesson_order;

-- Lessons with NO activities
SELECT 
  m.title as module_title,
  ml.lesson_order,
  ml.title as lesson_title
FROM marketplace_modules m
JOIN module_lessons ml ON ml.module_id = m.id
WHERE m.is_platform_module = true
  AND (ml.activity_type IS NULL OR ml.activity_type = '')
ORDER BY m.id, ml.lesson_order;

-- =====================================================
-- 6. SUMMARY STATISTICS
-- =====================================================

SELECT 
  m.title as module_title,
  COUNT(ml.id) as total_lessons,
  COUNT(ml.id) FILTER (WHERE ml.tools_used IS NOT NULL AND array_length(ml.tools_used, 1) > 0) as lessons_with_tools,
  COUNT(ml.id) FILTER (WHERE ml.resources IS NOT NULL AND jsonb_array_length(COALESCE(ml.resources, '[]'::jsonb)) > 0) as lessons_with_resources,
  COUNT(ml.id) FILTER (WHERE ml.activity_type IS NOT NULL AND ml.activity_type != '') as lessons_with_activities,
  SUM(array_length(ml.tools_used, 1)) FILTER (WHERE ml.tools_used IS NOT NULL) as total_tools,
  SUM(jsonb_array_length(COALESCE(ml.resources, '[]'::jsonb))) FILTER (WHERE ml.resources IS NOT NULL) as total_resources
FROM marketplace_modules m
LEFT JOIN module_lessons ml ON ml.module_id = m.id
WHERE m.is_platform_module = true
GROUP BY m.id, m.title
ORDER BY m.id;

