-- ============================================
-- CHECK MODULE 2 LESSONS ENRICHMENT STATUS
-- ============================================
-- This script checks if Module 2 lessons have been enriched with content

-- Check if Module 2 exists and get its ID
SELECT 
    '📚 MODULE 2 INFO' as section,
    id,
    title,
    slug,
    core_value,
    status,
    lesson_count
FROM marketplace_modules
WHERE core_value = 'clean_water'
  AND status = 'published';

-- Check all lessons for Module 2 and their enrichment status
SELECT 
    '📖 LESSON ENRICHMENT STATUS' as section,
    ml.lesson_order,
    ml.title,
    CASE 
        WHEN ml.story_content IS NOT NULL THEN '✅ Has story'
        ELSE '❌ Missing story'
    END AS story_status,
    CASE 
        WHEN ml.activity_config IS NOT NULL THEN '✅ Has activity'
        ELSE '❌ Missing activity'
    END AS activity_status,
    CASE
        WHEN ml.activity_config IS NOT NULL THEN
            CASE
                WHEN ml.activity_config->>'steps' IS NOT NULL THEN '✅ Has steps'
                WHEN ml.activity_config->>'instructions' IS NOT NULL THEN '✅ Has instructions'
                ELSE '⚠️ No steps/instructions'
            END
        ELSE '❌ No activity_config'
    END AS steps_status,
    ml.updated_at
FROM module_lessons ml
JOIN marketplace_modules mm ON ml.module_id = mm.id
WHERE mm.core_value = 'clean_water'
  AND mm.status = 'published'
ORDER BY ml.lesson_order;

-- Sample one lesson's activity_config to see structure
SELECT 
    '🔍 SAMPLE LESSON 2.1 ACTIVITY CONFIG' as section,
    ml.title,
    ml.activity_config
FROM module_lessons ml
JOIN marketplace_modules mm ON ml.module_id = mm.id
WHERE mm.core_value = 'clean_water'
  AND mm.status = 'published'
  AND ml.lesson_order = 1
LIMIT 1;

