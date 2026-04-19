-- ============================================================================
-- CHECK IF LESSON EXISTS - Debug 404 errors
-- ============================================================================

-- Step 1: Check the specific lesson that's 404ing
SELECT 
    id,
    module_id,
    lesson_order,
    title,
    description,
    'This is the lesson the browser is requesting' as note
FROM module_lessons
WHERE id = '0ae5dc06-ccea-4a19-8a14-5c37cb8ecdf7';

-- Step 2: Show ALL lessons for the Aire Limpio module
SELECT 
    id,
    module_id,
    lesson_order,
    title,
    description,
    estimated_minutes,
    created_at
FROM module_lessons
WHERE module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'  -- Aire Limpio
ORDER BY lesson_order;

-- Step 3: Check if there are ANY lessons for ANY module
SELECT 
    mm.id as module_id,
    mm.title as module_title,
    COUNT(ml.id) as lesson_count,
    ARRAY_AGG(ml.title ORDER BY ml.lesson_order) as lesson_titles
FROM marketplace_modules mm
LEFT JOIN module_lessons ml ON mm.id = ml.module_id
WHERE mm.status = 'published'
GROUP BY mm.id, mm.title
ORDER BY mm.title;

-- Step 4: If Aire Limpio has no lessons, let's add them
DO $$
DECLARE
    v_lesson_count INTEGER;
    v_module_id UUID := '63c08c28-638d-42d9-ba5d-ecfc541957b0';
BEGIN
    -- Count existing lessons
    SELECT COUNT(*) INTO v_lesson_count
    FROM module_lessons
    WHERE module_id = v_module_id;
    
    RAISE NOTICE 'Current lesson count for Aire Limpio: %', v_lesson_count;
    
    IF v_lesson_count = 0 THEN
        RAISE NOTICE '⚠️ NO LESSONS FOUND! Module will not work without lessons!';
        RAISE NOTICE '🔧 Run ADD-LESSONS-ONLY.sql to fix this';
    ELSE
        RAISE NOTICE '✅ Module has % lessons', v_lesson_count;
    END IF;
END $$;

