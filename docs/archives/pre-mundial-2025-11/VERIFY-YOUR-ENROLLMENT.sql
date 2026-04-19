-- ============================================================================
-- VERIFY YOUR ENROLLMENT - Check enrollment status
-- ============================================================================

-- Check enrollments for francisco.blockstrand@gmail.com
SELECT 
    ce.id as enrollment_id,
    ce.user_id,
    au.email,
    ce.module_id,
    mm.title as module_title,
    ce.purchase_type,
    ce.progress_percentage,
    ce.completed,
    ce.assigned_at as enrolled_at,
    '✅ This enrollment should exist' as status
FROM course_enrollments ce
JOIN auth.users au ON ce.user_id = au.id
JOIN marketplace_modules mm ON ce.module_id = mm.id
WHERE au.email = 'francisco.blockstrand@gmail.com'
  AND mm.id = '63c08c28-638d-42d9-ba5d-ecfc541957b0';  -- Aire Limpio module

-- If no enrollment found, show all enrollments for this user
SELECT 
    ce.id,
    ce.user_id,
    mm.title,
    ce.assigned_at,
    '⚠️ All enrollments for this user' as note
FROM course_enrollments ce
JOIN marketplace_modules mm ON ce.module_id = mm.id
WHERE ce.user_id = '64b26179-f06a-4de7-9059-fe4e39797eca'  -- francisco.blockstrand@gmail.com
ORDER BY ce.assigned_at DESC;

