-- ============================================================================
-- GET ACTUAL LESSON IDs - Find correct lesson IDs for navigation
-- ============================================================================

-- Show ALL lesson IDs for the Aire Limpio module you're enrolled in
SELECT 
    id as lesson_id,
    lesson_order,
    title,
    '👉 Use these IDs in your frontend' as note
FROM module_lessons
WHERE module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'  -- Aire Limpio module
ORDER BY lesson_order;

-- Check if the 404ing lesson ID exists anywhere
SELECT 
    ml.id,
    ml.module_id,
    mm.title as module_title,
    ml.lesson_order,
    ml.title as lesson_title,
    '⚠️ This is where the 404ing lesson actually is' as note
FROM module_lessons ml
JOIN marketplace_modules mm ON ml.module_id = mm.id
WHERE ml.id = '0ae5dc06-ccea-4a19-8a14-5c37cb8ecdf7';

-- Show what the browser SHOULD be requesting
SELECT 
    '📍 FIRST LESSON URL SHOULD BE:' as info,
    '/employee-portal/modules/' || '63c08c28-638d-42d9-ba5d-ecfc541957b0' || '/lessons/' || id as correct_url,
    lesson_order,
    title
FROM module_lessons
WHERE module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
ORDER BY lesson_order
LIMIT 1;

