-- ============================================
-- CHECK ACTUAL SCHEMA: module_lessons table
-- ============================================

-- Get ALL column names and types for module_lessons
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'module_lessons'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check a sample lesson to see actual data structure
SELECT *
FROM module_lessons
LIMIT 3;

-- Check how lessons are identified/ordered
SELECT 
    ml.id,
    ml.title,
    mm.title as module_title,
    mm.core_value
FROM module_lessons ml
JOIN marketplace_modules mm ON ml.module_id = mm.id
WHERE mm.core_value IN ('clean_air', 'clean_water', 'safe_cities')
ORDER BY mm.core_value, ml.id
LIMIT 10;

