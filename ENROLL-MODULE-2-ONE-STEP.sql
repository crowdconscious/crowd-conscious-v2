-- ENROLL-MODULE-2-ONE-STEP.sql
-- This script manually enrolls you in Module 2 (Agua Limpia) in ONE STEP.
-- STEP 1: Run DIAGNOSE-MODULES-AND-SCHEMA.sql first to see available modules!
-- STEP 2: Update the module_id below based on the actual module ID from step 1
-- STEP 3: Run this script

-- 🚀 Single-query enrollment with your email
INSERT INTO public.course_enrollments (
    id,
    user_id,
    module_id,
    purchase_type,
    purchased_at,
    progress_percentage,
    completed,
    last_accessed_at,
    xp_earned,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(), -- Generate a new UUID for the enrollment
    p.id AS user_id,
    mm.id AS module_id, -- Note: module_id might be TEXT or UUID depending on schema
    'individual' AS purchase_type,
    NOW() AS purchased_at,
    0 AS progress_percentage,
    FALSE AS completed,
    NOW() AS last_accessed_at,
    0 AS xp_earned,
    NOW() AS created_at,
    NOW() AS updated_at
FROM
    public.profiles p
CROSS JOIN
    public.marketplace_modules mm
WHERE
    p.email = 'francisco.blockstrand@gmail.com' -- Your email
    AND mm.core_value = 'clean_water' -- Module 2: Agua Limpia
    AND mm.status = 'published'
    -- Prevent duplicates: only insert if not already enrolled
    AND NOT EXISTS (
        SELECT 1 FROM public.course_enrollments ce
        WHERE ce.user_id = p.id
        AND ce.module_id = mm.id
    )
RETURNING 
    id AS enrollment_id,
    user_id,
    module_id,
    purchase_type,
    purchased_at,
    created_at;

-- ✅ If you see a row returned above with an enrollment_id, you're enrolled!
-- ✅ If you see "Query returned successfully: 0 rows affected" - you're already enrolled!
-- ✅ Refresh your dashboard at crowdconscious.app/employee-portal to see Module 2!

