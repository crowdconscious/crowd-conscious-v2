-- ============================================================================
-- MANUAL ENROLLMENT TEST - Simulate exact webhook insert
-- ============================================================================
-- This is the EXACT insert the webhook is trying to do
-- ============================================================================

-- Step 1: Show what we're testing with
SELECT 
    '64b26179-f06a-4de7-9059-fe4e39797eca' as user_id,
    '63c08c28-638d-42d9-ba5d-ecfc541957b0' as module_id,
    'francisco.blockstrand@gmail.com' as email,
    'Aire Limpio: El Despertar Corporativo' as module_title;

-- Step 2: Check if enrollment already exists
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '⚠️ ENROLLMENT ALREADY EXISTS'
        ELSE '✅ No existing enrollment - safe to test'
    END as status,
    COUNT(*) as existing_count
FROM course_enrollments
WHERE user_id = '64b26179-f06a-4de7-9059-fe4e39797eca'
  AND module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0';

-- Step 3: Attempt the EXACT insert the webhook does
INSERT INTO course_enrollments (
    user_id,
    corporate_account_id,
    module_id,
    purchase_type,
    purchased_at,
    purchase_price_snapshot,
    progress_percentage,
    completed,
    assigned_at
)
VALUES (
    '64b26179-f06a-4de7-9059-fe4e39797eca',  -- Your individual user ID
    NULL,                                      -- No corporate account (individual purchase)
    '63c08c28-638d-42d9-ba5d-ecfc541957b0',  -- Aire Limpio module
    'individual',                              -- Purchase type
    NOW(),                                     -- Purchased now
    360,                                       -- Price paid ($360 MXN)
    0,                                         -- Progress starts at 0%
    false,                                     -- Not completed yet
    NOW()                                      -- Assigned/enrolled now
)
RETURNING 
    id,
    user_id,
    module_id,
    purchase_type,
    purchase_price_snapshot,
    '✅ SUCCESS! Enrollment created!' as status;

-- Step 4: If we got here, verify it was created
SELECT 
    ce.id,
    ce.user_id,
    au.email,
    ce.module_id,
    mm.title as module_title,
    ce.purchase_type,
    ce.purchase_price_snapshot,
    ce.progress_percentage,
    ce.completed,
    ce.assigned_at,
    '✅ ENROLLMENT EXISTS IN DATABASE' as verification_status
FROM course_enrollments ce
JOIN auth.users au ON ce.user_id = au.id
JOIN marketplace_modules mm ON ce.module_id = mm.id
WHERE ce.user_id = '64b26179-f06a-4de7-9059-fe4e39797eca'
  AND ce.module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0';

