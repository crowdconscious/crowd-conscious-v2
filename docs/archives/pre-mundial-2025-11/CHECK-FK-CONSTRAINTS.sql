-- ============================================================================
-- CHECK FOREIGN KEY CONSTRAINTS - Find why webhook insert is failing
-- ============================================================================
-- PGRST204 error means constraint violation
-- ============================================================================

-- Step 1: Check ALL foreign key constraints on course_enrollments
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'course_enrollments';

-- Step 2: Check if user_id column exists and its type
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'course_enrollments'
AND column_name IN ('user_id', 'employee_id', 'corporate_account_id', 'module_id');

-- Step 3: Get your actual user_id to test with
SELECT 
    id as user_id,
    email,
    created_at
FROM auth.users
WHERE email ILIKE '%francisco%'
LIMIT 1;

-- Step 4: Check if this user exists in profiles table
SELECT 
    p.id,
    p.full_name,
    p.corporate_account_id,
    au.email
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email ILIKE '%francisco%';

-- Step 5: Test actual insert with your user_id and a real module
-- Replace YOUR_USER_ID and YOUR_MODULE_ID with values from steps 3 and cart query
DO $$ 
DECLARE
    v_user_id UUID;
    v_module_id UUID;
    v_result RECORD;
BEGIN
    -- Get your user ID
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email ILIKE '%francisco%'
    LIMIT 1;
    
    -- Get a published module
    SELECT id INTO v_module_id 
    FROM marketplace_modules 
    WHERE status = 'published'
    LIMIT 1;
    
    RAISE NOTICE '👤 Testing with user_id: %', v_user_id;
    RAISE NOTICE '📚 Testing with module_id: %', v_module_id;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '❌ ERROR: Could not find user!';
        RETURN;
    END IF;
    
    IF v_module_id IS NULL THEN
        RAISE NOTICE '❌ ERROR: Could not find module!';
        RETURN;
    END IF;
    
    -- Try the exact same insert the webhook is doing
    BEGIN
        INSERT INTO course_enrollments (
            user_id,
            corporate_account_id,
            module_id,
            purchase_type,
            purchased_at,
            purchase_price_snapshot,
            progress_percentage,
            completed,
            enrolled_at
        )
        VALUES (
            v_user_id,
            NULL,
            v_module_id,
            'individual',
            NOW(),
            0.00,
            0,
            false,
            NOW()
        )
        RETURNING * INTO v_result;
        
        RAISE NOTICE '✅ SUCCESS! Insert worked. Enrollment ID: %', v_result.id;
        RAISE NOTICE '✅ This means webhook SHOULD work';
        
        -- Clean up test data
        DELETE FROM course_enrollments WHERE id = v_result.id;
        RAISE NOTICE '✅ Test enrollment cleaned up';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ INSERT FAILED!';
        RAISE NOTICE '❌ Error Code: %', SQLSTATE;
        RAISE NOTICE '❌ Error Message: %', SQLERRM;
        RAISE NOTICE '🔧 THIS IS WHY WEBHOOK IS FAILING!';
        RAISE NOTICE '🔧 Details: %', SQLERRM;
    END;
END $$;

