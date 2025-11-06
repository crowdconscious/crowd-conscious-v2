-- ============================================================================
-- CHECK module_lessons ACTUAL COLUMNS
-- ============================================================================
-- The API is trying to select columns that don't exist!
-- ============================================================================

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    '👉 These are the ACTUAL columns' as note
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'module_lessons'
ORDER BY ordinal_position;
