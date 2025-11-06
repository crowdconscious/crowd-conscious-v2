-- ============================================================================
-- CHECK RECENT PURCHASES - See all enrollments and cart history
-- ============================================================================

-- Step 1: Show ALL enrollments for your accounts
SELECT 
    ce.id,
    ce.user_id,
    au.email,
    ce.module_id,
    mm.title as module_title,
    ce.purchase_type,
    ce.purchase_price_snapshot,
    ce.assigned_at as enrolled_at,
    ce.progress_percentage,
    ce.completed
FROM course_enrollments ce
JOIN auth.users au ON ce.user_id = au.id
JOIN marketplace_modules mm ON ce.module_id = mm.id
WHERE ce.user_id IN (
    '64b26179-f06a-4de7-9059-fe4e39797eca',  -- Individual
    '2428fa3e-3617-4c4f-b573-29253cb9b5f5'   -- Corporate
)
ORDER BY ce.assigned_at DESC;

-- Step 2: Check cart history (should be empty after purchase)
SELECT 
    ci.id,
    ci.user_id,
    au.email,
    ci.module_id,
    mm.title as module_title,
    ci.employee_count,
    ci.price_snapshot,
    ci.discounted_price,
    ci.added_at
FROM cart_items ci
JOIN auth.users au ON ci.user_id = au.id OR au.id IN (
    SELECT id FROM profiles WHERE corporate_account_id = ci.corporate_account_id
)
JOIN marketplace_modules mm ON ci.module_id = mm.id
WHERE ci.user_id IN (
    '64b26179-f06a-4de7-9059-fe4e39797eca',
    '2428fa3e-3617-4c4f-b573-29253cb9b5f5'
)
OR ci.corporate_account_id = 'fd100589-3a37-4b95-b84e-8281be5a6796'
ORDER BY ci.added_at DESC;

-- Step 3: Check if there are ANY promo code uses
SELECT 
    pcu.id,
    pcu.user_id,
    au.email,
    pc.code as promo_code_used,
    pcu.cart_total_before_discount,
    pcu.discount_amount,
    pcu.cart_total_after_discount,
    pcu.used_at,
    pcu.stripe_session_id
FROM promo_code_uses pcu
JOIN promo_codes pc ON pcu.promo_code_id = pc.id
JOIN auth.users au ON pcu.user_id = au.id
WHERE pcu.user_id IN (
    '64b26179-f06a-4de7-9059-fe4e39797eca',
    '2428fa3e-3617-4c4f-b573-29253cb9b5f5'
)
ORDER BY pcu.used_at DESC
LIMIT 5;

