-- ENROLL-MODULE-2-ONE-STEP.sql
-- This script manually enrolls you in Module 2 (Agua Limpia) in ONE STEP.
-- No need to copy/paste IDs - just run this entire script.

-- 🚀 Single-query enrollment with your email
INSERT INTO public.course_enrollments (
    id,
    user_id,
    module_id,
    purchase_type,
    purchased_at,
    progress_percentage,
    completed,
    enrolled_at,
    last_accessed_at,
    xp_earned
)
SELECT
    gen_random_uuid(), -- Generate a new UUID for the enrollment
    p.id AS user_id,
    mm.id AS module_id,
    'individual' AS purchase_type,
    NOW() AS purchased_at,
    0 AS progress_percentage,
    FALSE AS completed,
    NOW() AS enrolled_at,
    NOW() AS last_accessed_at,
    0 AS xp_earned
FROM
    public.profiles p,
    public.marketplace_modules mm
WHERE
    p.email = 'francisco.blockstrand@gmail.com' -- Your email
    AND mm.core_value = 'clean_water' -- Module 2: Agua Limpia
    AND mm.status = 'published'
ON CONFLICT (user_id, module_id) DO UPDATE SET
    updated_at = NOW(),
    last_accessed_at = NOW(),
    enrolled_at = course_enrollments.enrolled_at -- Keep original enrollment date
RETURNING 
    id AS enrollment_id,
    user_id,
    module_id,
    purchased_at,
    enrolled_at;

-- ✅ If you see a row returned above with an enrollment_id, you're enrolled!
-- ✅ Refresh your dashboard at crowdconscious.app/employee-portal to see Module 2!

