-- =====================================================
-- CHECK USER ENROLLMENTS - Diagnostic Query
-- =====================================================
-- Purpose: Check if user punkys@crowdconscious.app has enrollments
-- =====================================================

-- Step 1: Find the user
SELECT 
  id as user_id,
  email,
  created_at as account_created
FROM auth.users
WHERE email = 'punkys@crowdconscious.app';

-- Step 2: Check their profile
SELECT 
  p.id,
  p.full_name,
  p.corporate_account_id,
  p.corporate_role,
  p.created_at
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'punkys@crowdconscious.app';

-- Step 3: Check ALL enrollments for this user
SELECT 
  ce.id as enrollment_id,
  ce.user_id,
  ce.module_id,
  ce.course_id,
  ce.status,
  ce.progress_percentage,
  ce.completed,
  ce.xp_earned,
  ce.purchase_type,
  ce.purchased_at,
  ce.assigned_at,
  ce.created_at,
  mm.title as module_title,
  mm.core_value
FROM course_enrollments ce
JOIN auth.users u ON u.id = ce.user_id
LEFT JOIN marketplace_modules mm ON mm.id = ce.module_id
WHERE u.email = 'punkys@crowdconscious.app'
ORDER BY ce.created_at DESC;

-- Step 4: Check cart items (maybe stuck in cart?)
SELECT 
  ci.id,
  ci.user_id,
  ci.module_id,
  ci.employee_count,
  ci.price_snapshot,
  ci.added_at,
  mm.title as module_title
FROM cart_items ci
JOIN auth.users u ON u.id = ci.user_id
LEFT JOIN marketplace_modules mm ON mm.id = ci.module_id
WHERE u.email = 'punkys@crowdconscious.app';

-- Step 5: Check Stripe purchases (via metadata)
SELECT 
  id,
  amount_total,
  customer_email,
  payment_status,
  metadata,
  created
FROM stripe_checkout_sessions
WHERE customer_email = 'punkys@crowdconscious.app'
ORDER BY created DESC
LIMIT 5;

-- Note: If stripe_checkout_sessions table doesn't exist, 
-- you'll need to check Stripe Dashboard directly

-- Step 6: Check if there are ANY enrollments at all (sanity check)
SELECT COUNT(*) as total_enrollments
FROM course_enrollments;

-- Step 7: Check if modules exist
SELECT 
  id,
  title,
  status,
  is_platform_module
FROM marketplace_modules
WHERE status = 'published'
ORDER BY created_at DESC;

-- =====================================================
-- EXPECTED RESULTS
-- =====================================================
-- If purchase was successful, you should see:
-- ✅ User found in Step 1
-- ✅ Profile found in Step 2  
-- ✅ Enrollment(s) in Step 3 with module_id set
-- ✅ Empty cart in Step 4 (cart should be cleared after purchase)

-- If enrollments are MISSING:
-- ❌ Step 3 returns 0 rows = Webhook didn't create enrollment
-- ❌ Step 4 has items = Cart wasn't cleared = Webhook failed

-- NEXT STEPS if enrollments missing:
-- 1. Check Stripe webhook logs in Stripe Dashboard
-- 2. Check Vercel function logs for /api/webhooks/stripe
-- 3. Run this to manually create enrollment (ONLY if confirmed payment):
--    See MANUAL-FIX-ENROLLMENT.sql

