-- MANUAL-ENROLL-MODULE-2.sql
-- Manually enroll user in Module 2 after failed webhook

-- Replace YOUR_EMAIL with the email you used for purchase
DO $$
DECLARE
    v_user_id UUID;
    v_module_id UUID;
    v_enrollment_id UUID;
BEGIN
    RAISE NOTICE '🔧 Manually enrolling user in Module 2 (Agua Limpia)...';

    -- Get user ID (replace with your email)
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'francisco.blockstrand@gmail.com'; -- CHANGE THIS TO YOUR EMAIL

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '❌ User not found. Update the email in this script.';
    END IF;

    RAISE NOTICE '✅ User ID: %', v_user_id;

    -- Get Module 2 ID (Agua Limpia / Clean Water)
    SELECT id INTO v_module_id
    FROM public.marketplace_modules
    WHERE core_value = 'clean_water' 
    AND status = 'published'
    LIMIT 1;

    IF v_module_id IS NULL THEN
        RAISE EXCEPTION '❌ Module 2 (clean_water) not found. Module may not exist yet.';
    END IF;

    RAISE NOTICE '✅ Module 2 ID: %', v_module_id;

    -- Check if already enrolled
    SELECT id INTO v_enrollment_id
    FROM public.course_enrollments
    WHERE user_id = v_user_id
    AND module_id = v_module_id;

    IF v_enrollment_id IS NOT NULL THEN
        RAISE NOTICE '⚠️ Already enrolled! Enrollment ID: %', v_enrollment_id;
        RAISE NOTICE '👉 Go to: /employee-portal/dashboard to see your modules';
        RETURN;
    END IF;

    -- Create enrollment
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
        last_accessed_at
    ) VALUES (
        v_user_id,
        v_module_id,
        NULL, -- Individual purchase
        'individual',
        NOW(),
        0, -- Free with promo code
        0,
        false,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_enrollment_id;

    RAISE NOTICE '🎉 SUCCESS! Enrollment created: %', v_enrollment_id;
    RAISE NOTICE '✅ Module 2 (Agua Limpia) is now in your dashboard';
    RAISE NOTICE '👉 Visit: /employee-portal/dashboard';

END $$;

-- Verify enrollment
SELECT 
    ce.id as enrollment_id,
    u.email,
    mm.title as module_title,
    ce.purchase_type,
    ce.purchased_at,
    ce.progress_percentage
FROM public.course_enrollments ce
JOIN auth.users u ON ce.user_id = u.id
JOIN public.marketplace_modules mm ON ce.module_id = mm.id
WHERE mm.core_value = 'clean_water'
ORDER BY ce.purchased_at DESC
LIMIT 5;

