-- ENROLL-AGUA-LIMPIA-FIXED.sql
-- This script enrolls you in "Gestión Sostenible del Agua" using the ACTUAL schema
-- ⚠️ CRITICAL: Uses course_id field (not just module_id) based on actual schema!

-- STEP 1: Clean up duplicates first by running CLEANUP-DUPLICATE-MODULES.sql
-- STEP 2: Run this script

-- 🚀 Enroll in Gestión Sostenible del Agua (clean_water)
INSERT INTO public.course_enrollments (
    id,
    user_id,
    course_id,
    module_id,
    purchase_type,
    purchased_at,
    status,
    completion_percentage,
    progress_percentage,
    completed,
    mandatory,
    xp_earned,
    total_score,
    max_score,
    total_time_spent,
    modules_completed,
    badges_earned,
    assigned_at,
    created_at,
    updated_at,
    last_accessed_at
)
SELECT
    gen_random_uuid() AS id,
    p.id AS user_id,
    mm.id AS course_id,        -- ⚠️ CRITICAL: Set BOTH course_id AND module_id!
    mm.id AS module_id,         -- ⚠️ They might need to be the same!
    'individual' AS purchase_type,
    NOW() AS purchased_at,
    'not_started' AS status,
    0 AS completion_percentage,
    0 AS progress_percentage,
    false AS completed,
    true AS mandatory,
    0 AS xp_earned,
    0 AS total_score,
    0 AS max_score,
    0 AS total_time_spent,
    0 AS modules_completed,
    ARRAY[]::text[] AS badges_earned,
    NOW() AS assigned_at,
    NOW() AS created_at,
    NOW() AS updated_at,
    NOW() AS last_accessed_at
FROM
    public.profiles p
CROSS JOIN
    public.marketplace_modules mm
WHERE
    p.email = 'francisco.blockstrand@gmail.com'
    AND mm.core_value = 'clean_water'
    AND mm.status = 'published'
    AND mm.slug = 'gestion-sostenible-agua'  -- Use the clean slug (no timestamp)
    -- Prevent duplicates using the ACTUAL constraint
    AND NOT EXISTS (
        SELECT 1 FROM public.course_enrollments ce
        WHERE ce.user_id = p.id
        AND ce.course_id = mm.id  -- ⚠️ Check course_id, not module_id!
    )
RETURNING 
    id AS enrollment_id,
    user_id,
    course_id,
    module_id,
    purchase_type,
    status,
    purchased_at;

-- ✅ If you see a row returned, you're enrolled!
-- ✅ Refresh crowdconscious.app/employee-portal to see it!

-- 🔍 Verify enrollment
SELECT 
    '✅ YOUR ENROLLMENTS' as check_type,
    ce.id as enrollment_id,
    mm.title as module_title,
    ce.status,
    ce.progress_percentage,
    ce.completed,
    ce.purchase_type
FROM course_enrollments ce
JOIN marketplace_modules mm ON ce.module_id = mm.id
WHERE ce.user_id = (SELECT id FROM profiles WHERE email = 'francisco.blockstrand@gmail.com')
ORDER BY ce.created_at DESC;

