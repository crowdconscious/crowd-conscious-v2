-- ================================================================
-- DIAGNOSE: Why dashboard showing 0 enrollments
-- ================================================================

-- Step 1: Check if YOU have any enrollments
SELECT 
    ce.id as enrollment_id,
    ce.user_id,
    p.email as user_email,
    mm.title as module_title,
    ce.progress_percentage,
    ce.completed,
    ce.xp_earned,
    ce.purchased_at,
    ce.created_at
FROM course_enrollments ce
LEFT JOIN profiles p ON p.id = ce.user_id
LEFT JOIN marketplace_modules mm ON mm.id = ce.module_id
WHERE p.email LIKE '%francisco%' -- Find your enrollments
ORDER BY ce.purchased_at DESC;

-- Step 2: Check the actual column names in course_enrollments
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'course_enrollments'
ORDER BY ordinal_position;

-- Step 3: Try the EXACT query the dashboard uses
-- Replace 'YOUR_USER_ID_HERE' with your actual UUID from Step 1
/*
SELECT 
    ce.*,
    mm.id as "module.id",
    mm.title as "module.title",
    mm.description as "module.description",
    mm.core_value as "module.core_value",
    mm.slug as "module.slug"
FROM course_enrollments ce
LEFT JOIN marketplace_modules mm ON mm.id = ce.module_id
WHERE ce.user_id = 'YOUR_USER_ID_HERE'
ORDER BY ce.purchased_at DESC;
*/

-- Step 4: Check for any errors in the join
SELECT 
    'course_enrollments' as table_name,
    COUNT(*) as total_rows
FROM course_enrollments
UNION ALL
SELECT 
    'marketplace_modules',
    COUNT(*)
FROM marketplace_modules;

