-- ============================================
-- DEBUG: Check ACTUAL activity_config structure in database
-- ============================================

-- Get the ACTUAL JSON structure from Module 2 Lesson 1
SELECT 
    '🔍 MODULE 2 LESSON 1 - ACTUAL DATA' as debug_section,
    ml.title,
    ml.activity_config AS raw_activity_config,
    jsonb_pretty(ml.activity_config) AS pretty_activity_config,
    ml.activity_config->>'title' AS has_title,
    ml.activity_config->>'description' AS has_description,
    ml.activity_config->>'instructions' AS has_instructions_key,
    ml.activity_config->>'steps' AS has_steps_key,
    jsonb_typeof(ml.activity_config->'instructions') AS instructions_type,
    jsonb_typeof(ml.activity_config->'steps') AS steps_type
FROM module_lessons ml
JOIN marketplace_modules mm ON ml.module_id = mm.id
WHERE mm.core_value = 'clean_water'
  AND mm.status = 'published'
  AND ml.lesson_order = 1
LIMIT 1;

-- Check Module 3 Lesson 1 too
SELECT 
    '🔍 MODULE 3 LESSON 1 - ACTUAL DATA' as debug_section,
    ml.title,
    jsonb_pretty(ml.activity_config) AS pretty_activity_config,
    ml.activity_config->>'instructions' AS has_instructions_key,
    ml.activity_config->>'steps' AS has_steps_key,
    jsonb_typeof(ml.activity_config->'instructions') AS instructions_type,
    jsonb_typeof(ml.activity_config->'steps') AS steps_type
FROM module_lessons ml
JOIN marketplace_modules mm ON ml.module_id = mm.id
WHERE mm.core_value = 'safe_cities'
  AND mm.status = 'published'
  AND ml.lesson_order = 1
LIMIT 1;

