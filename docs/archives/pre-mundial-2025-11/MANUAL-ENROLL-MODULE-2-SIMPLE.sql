-- MANUAL-ENROLL-MODULE-2-SIMPLE.sql
-- Manually enroll user in Module 2 (Agua Limpia)

-- STEP 1: Find your user ID
-- Replace 'your.email@example.com' with YOUR actual email
SELECT 
    id as user_id,
    email
FROM auth.users
WHERE email = 'francisco.blockstrand@gmail.com'; -- ⚠️ CHANGE THIS TO YOUR EMAIL

-- STEP 2: Find Module 2 ID
SELECT 
    id as module_id,
    title,
    core_value
FROM public.marketplace_modules
WHERE core_value = 'clean_water' 
AND status = 'published';

-- STEP 3: Check if already enrolled (optional)
-- Replace USER_ID with the ID from step 1
-- Replace MODULE_ID with the ID from step 2
SELECT *
FROM public.course_enrollments
WHERE user_id = 'YOUR_USER_ID_HERE' -- Paste user_id from step 1
AND module_id = 'YOUR_MODULE_ID_HERE'; -- Paste module_id from step 2

-- STEP 4: Create enrollment
-- Replace USER_ID and MODULE_ID with actual IDs from steps 1 and 2
INSERT INTO public.course_enrollments (
    user_id,
    module_id,
    corporate_account_id,
    purchase_type,
    purchased_at,
    purchase_price_snapshot,
    progress_percentage,
    completed,
    enrolled_at,
    last_accessed_at,
    xp_earned
) VALUES (
    'YOUR_USER_ID_HERE', -- Paste user_id from step 1
    'YOUR_MODULE_ID_HERE', -- Paste module_id from step 2
    NULL,
    'individual',
    NOW(),
    0,
    0,
    false,
    NOW(),
    NOW(),
    0
);

-- STEP 5: Verify enrollment was created
SELECT 
    ce.id as enrollment_id,
    u.email,
    mm.title as module_title,
    ce.progress_percentage,
    ce.purchased_at
FROM public.course_enrollments ce
JOIN auth.users u ON ce.user_id = u.id
JOIN public.marketplace_modules mm ON ce.module_id = mm.id
WHERE u.email = 'francisco.blockstrand@gmail.com' -- ⚠️ CHANGE THIS
ORDER BY ce.purchased_at DESC
LIMIT 5;

